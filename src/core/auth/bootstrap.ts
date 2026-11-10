/** Bootstrap exceptionnel du premier propriétaire ; aucune inscription publique. */
import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { hashPassword } from '@/core/auth/primitives';
import { createRecoveryCodes } from '@/core/auth/recovery-codes';
import { parseKeyRing, sealSecret } from '@/core/crypto/envelope';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(bytes: Buffer): string {
  let result = ''; let acc = 0; let bits = 0;
  for (const byte of bytes) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32[(acc >>> bits) & 31];
    }
    acc &= (1 << bits) - 1;
  }
  if (bits) result += BASE32[(acc << (5 - bits)) & 31];
  return result;
}

export function provisioningUri(secret: Buffer, email: string): string {
  const issuer = 'TOUT EN UN';
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({ secret: base32Encode(secret), issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${encodeURIComponent(label)}?${params}`;
}

/** Doit être appelé dans une transaction admin isolée, jamais par une route publique. */
export async function createFirstOwner(
  db: PoolClient,
  input: { email: string; displayName: string; password: string; keyRing: string; activeVersion: number },
): Promise<{ uri: string; userId: string; recoveryCodes: string[] }> {
  // Une exécution simultanée ne crée pas deux propriétaires initiaux.
  await db.query('SELECT pg_advisory_xact_lock(1978, 2026)');
  const users = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM users');
  if (users.rows[0]?.n !== 0) throw new Error('Bootstrap refusé : des utilisateurs existent déjà.');
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Adresse e-mail invalide.');
  }
  if (!input.displayName.trim() || input.displayName.length > 120) throw new Error('Nom invalide.');
  const ring = parseKeyRing(input.keyRing, input.activeVersion);
  const secret = randomBytes(20);
  const passwordHash = await hashPassword(input.password);
  const { codes: recoveryCodes, hashes: recoveryHashes } = createRecoveryCodes();
  const inserted = await db.query<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id::text`,
    [email, input.displayName.trim(), passwordHash],
  );
  const id = inserted.rows[0]?.id;
  if (!id) throw new Error('Création du propriétaire échouée.');
  const sealed = sealSecret(secret.toString('base64'), ring, `user:${id}:totp`);
  await db.query(
    `UPDATE users SET totp_secret_ciphertext=$1, totp_secret_iv=$2,
       totp_secret_tag=$3, totp_key_version=$4, totp_enabled_at=now(),
       totp_recovery_codes_hash=$6
     WHERE id=$5`,
    [sealed.ciphertext, sealed.iv, sealed.tag, sealed.keyVersion, id, recoveryHashes],
  );
  await db.query(`INSERT INTO user_roles (user_id, role_code) VALUES ($1, 'owner')`, [id]);
  return { uri: provisioningUri(secret, email), userId: id, recoveryCodes };
}
