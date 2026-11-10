import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  assertStrongPassword, createSessionToken, credentialsSchema, hashPassword, hashSessionToken,
  isAllowedOrigin, SESSION_TTL_MS, totpCode, verifyCsrf, verifyPassword, verifyTotp,
} from '@/core/auth/primitives';

describe('auth — primitives testées, pas encore une connexion livrée', () => {
  it('rejette les mots de passe faibles', () => {
    for (const v of ['password', 'Password1234', 'PASSWORD1234!', 'Pass1!']) {
      expect(() => assertStrongPassword(v)).toThrow();
    }
    expect(() => assertStrongPassword('TrèsLongMot2Passe!')).not.toThrow();
  });
  it('argon2id : sel unique et mot de passe erroné refusé', async () => {
    const h1 = await hashPassword('MotDePasseSolide!2026');
    const h2 = await hashPassword('MotDePasseSolide!2026');
    expect(h1).toMatch(/^\$argon2id\$/);
    expect(h1).not.toBe(h2);
    expect(await verifyPassword(h1, 'MotDePasseSolide!2026')).toBe(true);
    expect(await verifyPassword(h1, 'MotDePasseSolide!2025')).toBe(false);
  });
  it('cookie : le secret est absent de la base ; 12 h maximum', () => {
    const a = createSessionToken(); const b = createSessionToken();
    expect(a.token).not.toEqual(b.token);
    expect(a.hash).toEqual(hashSessionToken(a.token));
    expect(a.hash.toString('hex')).not.toContain(a.token);
    expect(SESSION_TTL_MS).toBe(12 * 60 * 60 * 1000);
  });
  it('TOTP RFC 6238 vecteurs officiels et anti-rejeu', () => {
    const secret = Buffer.from('12345678901234567890');
    expect(totpCode(secret, 59_000)).toBe('287082');
    expect(totpCode(secret, 1_111_111_109_000)).toBe('081804');
    expect(verifyTotp(secret, '287082', 59_000)).toBe(1);
    expect(verifyTotp(secret, '287082', 59_000, 1)).toBeNull();
    expect(verifyTotp(secret, '000000', 59_000)).toBeNull();
    expect(verifyTotp(secret, '287082', 360_000)).toBeNull();
  });
  it('TOTP refuse les codes non numériques et les secrets courts', () => {
    expect(verifyTotp(randomBytes(20), '12345a', Date.now())).toBeNull();
    expect(() => totpCode(Buffer.alloc(8), 0)).toThrow();
  });
  it('CSRF : même jeton + Origin exact, pas de sous-domaine ou de protocole différent', () => {
    const token = createSessionToken().token;
    expect(verifyCsrf(token, token)).toBe(true);
    expect(verifyCsrf(token, token + 'x')).toBe(false);
    expect(verifyCsrf(undefined, token)).toBe(false);
    expect(isAllowedOrigin('https://exemple.com', 'https://exemple.com/app')).toBe(true);
    expect(isAllowedOrigin('http://exemple.com', 'https://exemple.com')).toBe(false);
    expect(isAllowedOrigin('https://exemple.com.evil.test', 'https://exemple.com')).toBe(false);
    expect(isAllowedOrigin(null, 'https://exemple.com')).toBe(false);
  });
  it('validation stricte des identifiants', () => {
    expect(credentialsSchema.safeParse({ email: 'A@EXEMPLE.COM', password: 'abcdefghijkl' }).data?.email).toBe('a@exemple.com');
    expect(credentialsSchema.safeParse({ email: 'malforme', password: 'abcdefghijkl' }).success).toBe(false);
  });
});
