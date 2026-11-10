import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import QRCode from 'qrcode';
import { base32Encode, createFirstOwner } from '@/core/auth/bootstrap';
import { parseKeyRing, openSecret } from '@/core/crypto/envelope';
import { verifyPassword } from '@/core/auth/primitives';

let db: PGlite;
const key = randomBytes(32).toString('base64');
const input = { email: ' Owner@Example.TEST ', displayName: 'Propriétaire Test',
  password: 'MotDePasseSolide!2026', keyRing: `1:${key}`, activeVersion: 1 };

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
});
afterAll(async () => { await db.close(); });

describe('bootstrap propriétaire — réellement exécuté sur PostgreSQL WASM', () => {
  it('base32 : vecteur RFC 4648', () => {
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
    expect(base32Encode(Buffer.from('f'))).toBe('MY');
  });

  it('insère un propriétaire Argon2id et secret TOTP chiffré ; QR générable hors ligne', async () => {
    await db.exec('BEGIN;');
    let result: Awaited<ReturnType<typeof createFirstOwner>>;
    try {
      result = await createFirstOwner(db as unknown as PoolClient, input);
      await db.exec('COMMIT;');
    } catch (e) { await db.exec('ROLLBACK;'); throw e; }
    expect(result.uri).toMatch(/^otpauth:\/\/totp\//);
    expect(result.recoveryCodes).toHaveLength(10);
    expect(new Set(result.recoveryCodes).size).toBe(10);
    expect(result.uri).toContain('algorithm=SHA1');
    expect(result.uri).not.toContain(input.password);
    const qr = await QRCode.toBuffer(result.uri);
    expect(qr.subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
    const row = await db.query<{
      email: string; password_hash: string; totp_secret_ciphertext: Uint8Array;
      totp_secret_iv: Uint8Array; totp_secret_tag: Uint8Array; totp_key_version: number;
      totp_recovery_codes_hash: string[];
    }>('SELECT email, password_hash, totp_secret_ciphertext, totp_secret_iv, totp_secret_tag, totp_key_version, totp_recovery_codes_hash FROM users');
    const user = row.rows[0]!;
    expect(user.email).toBe('owner@example.test');
    expect(user.password_hash).toMatch(/^\$argon2id\$/);
    expect(user.totp_recovery_codes_hash).toHaveLength(10);
    expect(user.totp_recovery_codes_hash).not.toContain(result.recoveryCodes[0]);
    expect(await verifyPassword(user.password_hash, input.password)).toBe(true);
    const secret = openSecret({ ciphertext: Buffer.from(user.totp_secret_ciphertext),
      iv: Buffer.from(user.totp_secret_iv), tag: Buffer.from(user.totp_secret_tag),
      keyVersion: user.totp_key_version }, parseKeyRing(input.keyRing, 1), `user:${result.userId}:totp`);
    expect(Buffer.from(secret, 'base64')).toHaveLength(20);
    const role = await db.query<{ role_code: string }>('SELECT role_code FROM user_roles');
    expect(role.rows[0]?.role_code).toBe('owner');
  });

  it('refuse le second bootstrap sans toucher au premier compte', async () => {
    await db.exec('BEGIN;');
    try { await expect(createFirstOwner(db as unknown as PoolClient, input)).rejects.toThrow(/Bootstrap refusé/); }
    finally { await db.exec('ROLLBACK;'); }
    const users = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM users');
    expect(users.rows[0]?.n).toBe(1);
  });
});
