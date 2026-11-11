/**
 * Parcours de connexion exécuté sur PGlite (PostgreSQL WASM, mêmes migrations SQL).
 * La transaction identité est remplacée uniquement pour injecter la base en mémoire ;
 * le service d'authentification, ses requêtes SQL et son chiffrement sont les vrais modules.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { hashPassword, totpCode } from '@/core/auth/primitives';
import { createRecoveryCodes } from '@/core/auth/recovery-codes';
import { parseKeyRing, sealSecret } from '@/core/crypto/envelope';

let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN;');
    try {
      const result = await task(db as unknown as PoolClient);
      await db.exec('COMMIT;');
      return result;
    } catch (error) {
      await db.exec('ROLLBACK;');
      throw error;
    }
  },
}));

const { login, getSession, revokeSession, InvalidCredentials } = await import('@/core/auth/service');
const OLD_KEYS = process.env.APP_ENC_KEYS;
const OLD_ACTIVE = process.env.APP_ENC_ACTIVE;
const OLD_SESSION = process.env.SESSION_SECRET;
const testKey = randomBytes(32).toString('base64');
const totpSecret = randomBytes(20);
let userId = '';
// Une date figée finit par expirer la session de 12 h et casse le test de rejeu en CI.
// Chaque appel réutilise le même instant afin de vérifier le rejet du même compteur TOTP.
const now = new Date();

beforeAll(async () => {
  process.env.APP_ENC_KEYS = `1:${testKey}`;
  process.env.APP_ENC_ACTIVE = '1';
  process.env.SESSION_SECRET = randomBytes(32).toString('base64');
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  const hash = await hashPassword('MotDePasseSolide!2026');
  const result = await db.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name)
      VALUES ($1, $2, 'Propriétaire de test') RETURNING id::text`,
    ['owner@example.test', hash],
  );
  userId = result.rows[0]!.id;
  const ring = parseKeyRing(process.env.APP_ENC_KEYS, 1);
  const sealed = sealSecret(totpSecret.toString('base64'), ring, `user:${userId}:totp`);
  await db.query(
    `UPDATE users SET totp_secret_ciphertext=$1, totp_secret_iv=$2,
      totp_secret_tag=$3, totp_key_version=$4, totp_enabled_at=now()
     WHERE id=$5`,
    [sealed.ciphertext, sealed.iv, sealed.tag, sealed.keyVersion, userId],
  );
  await db.query(`INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'owner')`, [userId]);
});

afterAll(async () => {
  await db.close();
  if (OLD_KEYS === undefined) delete process.env.APP_ENC_KEYS; else process.env.APP_ENC_KEYS = OLD_KEYS;
  if (OLD_ACTIVE === undefined) delete process.env.APP_ENC_ACTIVE; else process.env.APP_ENC_ACTIVE = OLD_ACTIVE;
  if (OLD_SESSION === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = OLD_SESSION;
});

const validInput = () => ({
  email: 'owner@example.test', password: 'MotDePasseSolide!2026',
  totp: totpCode(totpSecret, now.getTime()), now,
});

describe('authentification — requêtes et session contre PostgreSQL WASM', () => {
  it('refuse le mauvais mot de passe sans créer de session', async () => {
    await expect(login({ ...validInput(), password: 'erroné' })).rejects.toThrow(InvalidCredentials);
    const result = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM sessions');
    expect(result.rows[0]!.n).toBe(0);
  });

  it('mot de passe + TOTP créent une session opaque consultable', async () => {
    const session = await login(validInput());
    expect(session.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(session.expiresAt.getTime() - now.getTime()).toBe(12 * 3600 * 1000);
    // getSession() évalue now() de la base : injecter un jeton non expiré selon l'heure réelle.
    const dbSession = await db.query<{ bytes: number }>(
      'SELECT octet_length(token_hash) AS bytes FROM sessions WHERE user_id=$1', [userId],
    );
    expect(dbSession.rows[0]!.bytes).toBe(32);
    const notices = await db.query<{ kind: string; message: string }>(
      'SELECT kind, message FROM user_notifications WHERE user_id=$1', [userId]);
    expect(notices.rows).toHaveLength(1);
    expect(notices.rows[0]?.kind).toBe('security_login');
    expect(JSON.stringify(notices.rows)).not.toMatch(/token|totp|mot de passe|agent|adresse ip/i);
    await db.query('UPDATE sessions SET expires_at = now() + interval \'1 hour\'');
    expect(await getSession(session.token)).toEqual({ userId, displayName: 'Propriétaire de test' });
    await revokeSession(session.token);
    expect(await getSession(session.token)).toBeNull();
  });

  it('interdit le rejeu du même code même pendant sa fenêtre de validité', async () => {
    await expect(login(validInput())).rejects.toThrow(InvalidCredentials);
  });

  it('refuse un code 2FA erroné', async () => {
    await expect(login({ ...validInput(), totp: '999999', now: new Date(now.getTime() + 60_000) })).rejects.toThrow(InvalidCredentials);
  });

  it('un code de secours est consommé atomiquement et ne fonctionne jamais deux fois', async () => {
    const { codes, hashes } = createRecoveryCodes(2);
    await db.query('UPDATE users SET totp_recovery_codes_hash=$1 WHERE id=$2', [hashes, userId]);
    const first = await login({ ...validInput(), totp: codes[0]! });
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = await db.query<{ totp_recovery_codes_hash: string[] }>(
      'SELECT totp_recovery_codes_hash FROM users WHERE id=$1', [userId],
    );
    expect(row.rows[0]?.totp_recovery_codes_hash).toEqual([hashes[1]]);
    await expect(login({ ...validInput(), totp: codes[0]! })).rejects.toThrow(InvalidCredentials);
  });

  it('refuse la session malformée et un compte absent sans exposer son existence', async () => {
    expect(await getSession('mauvais-jeton')).toBeNull();
    await expect(login({ ...validInput(), email: 'absent@example.test' })).rejects.toThrow(InvalidCredentials);
  });

  it('bloque après dix tentatives par e-mail dans un quart d’heure', async () => {
    const input = { ...validInput(), email: 'limit@example.test' };
    for (let i = 0; i < 9; i++) {
      await expect(login(input)).rejects.toThrow(InvalidCredentials);
    }
    const row = await db.query<{ count: number }>(
      "SELECT count FROM rate_limits WHERE bucket='login-email' AND key_hash <> '' ORDER BY count DESC LIMIT 1",
    );
    expect(row.rows[0]!.count).toBe(9);
    await expect(login(input)).rejects.toThrow(InvalidCredentials);
    const result = await db.query<{ count: number }>(
      "SELECT max(count)::int AS count FROM rate_limits WHERE bucket='login-email'",
    );
    expect(result.rows[0]!.count).toBe(10);
  });
});
