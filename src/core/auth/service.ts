/** Service de connexion ; une seule transaction verrouille le compte et le compteur TOTP. */
import { createHmac } from 'node:crypto';
import type { PoolClient } from 'pg';
import { withIdentityTransaction } from '@/core/db/client';
import { openSecret, parseKeyRing } from '@/core/crypto/envelope';
import { createSessionToken, hashSessionToken, SESSION_TTL_MS, verifyPassword, verifyTotp } from '@/core/auth/primitives';
import { findRecoveryCodeHash } from '@/core/auth/recovery-codes';

const GENERIC_ERROR = 'Identifiants ou code de vérification invalides.';
const DUMMY_HASH_PROMISE = import('argon2').then((mod) => mod.hash('une-chaîne-aléatoire-jamais-valide', {
  type: mod.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1,
}));

interface LoginUser {
  id: string;
  password_hash: string;
  status: string;
  failed_login_count: number;
  locked_until: Date | null;
  totp_secret_ciphertext: Buffer | null;
  totp_secret_iv: Buffer | null;
  totp_secret_tag: Buffer | null;
  totp_key_version: number | null;
  totp_enabled_at: Date | null;
  totp_last_counter: string;
  totp_recovery_codes_hash: string[];
}

export class InvalidCredentials extends Error {
  constructor() { super(GENERIC_ERROR); this.name = 'InvalidCredentials'; }
}

export function nextLock(count: number, now: Date): Date | null {
  if (count < 5) return null;
  // À partir de 5 échecs : 30 s → 1 min → 2 min, maximum 1 h.
  return new Date(now.getTime() + Math.min(3600, 30 * 2 ** Math.min(count - 5, 10)) * 1000);
}

async function failAttempt(db: PoolClient, userId: string, count: number, now: Date): Promise<void> {
  const failed = count + 1;
  await db.query('UPDATE users SET failed_login_count = $2, locked_until = $3 WHERE id = $1',
    [userId, failed, nextLock(failed, now)]);
}

/**
 * Retourne le secret à placer dans le cookie `HttpOnly`; l'appelant ne le journalise jamais.
 * Le mot de passe, le code TOTP et le compteur sont vérifiés dans la même transaction.
 * Le hachage de compte inconnu amortit l'énumération temporelle ; les messages sont identiques.
 */
export async function login(input: {
  email: string;
  password: string;
  totp: string;
  now?: Date;
  userAgent?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const now = input.now ?? new Date();
  const result = await withIdentityTransaction(async (db) => {
    // Limite persistante, partagée par toutes les instances. Même les comptes inconnus
    // consomment le quota. La clé n'expose ni adresse e-mail ni IP en base.
    const rateKey = process.env.SESSION_SECRET;
    if (!rateKey || rateKey.length < 32) throw new Error('SESSION_SECRET absent ou trop court.');
    const windowStart = new Date(Math.floor(now.getTime() / 900_000) * 900_000);
    const key = ipBucket(input.email.toLowerCase(), rateKey);
    const attempts = await db.query<{ count: number }>(
      `INSERT INTO rate_limits (bucket, key_hash, window_start, count)
       VALUES ('login-email', $1, $2, 1)
       ON CONFLICT (bucket, key_hash, window_start)
       DO UPDATE SET count = rate_limits.count + 1 RETURNING count`, [key, windowStart]);
    if ((attempts.rows[0]?.count ?? 100) > 10) return null;
    const rows = await db.query<LoginUser>(
      `SELECT id, password_hash, status, failed_login_count, locked_until,
        totp_secret_ciphertext, totp_secret_iv, totp_secret_tag, totp_key_version,
        totp_enabled_at, totp_last_counter, totp_recovery_codes_hash
       FROM users WHERE lower(email) = lower($1) FOR UPDATE`, [input.email]);
    const user = rows.rows[0];
    if (!user) {
      await verifyPassword(await DUMMY_HASH_PROMISE, input.password);
      return null;
    }
    if (user.status !== 'active' || (user.locked_until && user.locked_until > now)) return null;
    const validPassword = await verifyPassword(user.password_hash, input.password);
    if (!validPassword) {
      await failAttempt(db, user.id, user.failed_login_count, now);
      return null;
    }
    // Pas de session sans 2FA. Si TOTP n'a pas été provisionné, le compte reste fermé.
    const { totp_secret_ciphertext: ciphertext, totp_secret_iv: iv,
      totp_secret_tag: tag, totp_key_version: keyVersion } = user;
    if (!user.totp_enabled_at || !ciphertext || !iv || !tag || !keyVersion) return null;
    const ringRaw = process.env.APP_ENC_KEYS;
    if (!ringRaw) throw new Error('Ring de clés absent : authentification impossible.');
    const ring = parseKeyRing(ringRaw, Number(process.env.APP_ENC_ACTIVE));
    const secret = Buffer.from(openSecret({ ciphertext, iv, tag, keyVersion }, ring, `user:${user.id}:totp`), 'base64');
    const counter = verifyTotp(secret, input.totp, now.getTime(), Number(user.totp_last_counter));
    const recoveryIndex = counter === null
      ? findRecoveryCodeHash(input.totp, user.totp_recovery_codes_hash)
      : -1;
    if (counter === null && recoveryIndex < 0) {
      await failAttempt(db, user.id, user.failed_login_count, now);
      return null;
    }
    // SELECT FOR UPDATE protège le tableau des codes et le compteur contre le rejeu
    // concurrent. La consommation et la session sont dans la même transaction.
    const remaining = recoveryIndex < 0 ? user.totp_recovery_codes_hash
      : user.totp_recovery_codes_hash.filter((_, index) => index !== recoveryIndex);
    const { token, hash } = createSessionToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db.query(`UPDATE users SET failed_login_count = 0, locked_until = NULL,
      totp_last_counter = $2, last_login_at = $3, totp_recovery_codes_hash = $4
      WHERE id = $1`, [user.id, counter ?? Number(user.totp_last_counter), now, remaining]);
    await db.query(`INSERT INTO sessions (user_id, token_hash, expires_at, user_agent)
      VALUES ($1, $2, $3, $4)`, [user.id, hash, expiresAt, input.userAgent?.slice(0, 256) ?? null]);
    // Notification de sécurité réelle, atomique avec la session. Aucun jeton, IP,
    // code TOTP ou User-Agent n'est enregistré dans la notification.
    await db.query("SELECT set_config('app.notification_user_id', $1, true)", [user.id]);
    await db.query(`INSERT INTO user_notifications (user_id, kind, title, message)
      VALUES ($1, 'security_login', 'Nouvelle connexion', 'Une connexion sécurisée a été établie sur votre compte.')`, [user.id]);
    return { token, expiresAt };
  });
  if (!result) throw new InvalidCredentials();
  return result;
}

/** Une session révoquée ou expirée ne passe jamais. Requête paramétrée, base sans jeton brut. */
export async function getSession(token: string): Promise<{ userId: string; displayName: string } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return withIdentityTransaction(async (db) => {
    const rows = await db.query<{ user_id: string; display_name: string }>(
      `SELECT s.user_id, u.display_name FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL
         AND s.expires_at > now() AND u.status = 'active'`, [hashSessionToken(token)]);
    const row = rows.rows[0];
    return row ? { userId: String(row.user_id), displayName: row.display_name } : null;
  });
}

export async function revokeSession(token: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await withIdentityTransaction((db) => db.query(
    'UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [hashSessionToken(token)],
  ).then(() => undefined));
}

/** Hachage non réversible de l'adresse IP ; clé de déploiement obligatoire pour éviter la corrélation brute. */
export function ipBucket(ip: string, key: string): string {
  if (!key || key.length < 32) throw new Error('Clé rate-limit insuffisante.');
  return createHmac('sha256', key).update(ip).digest('hex');
}
