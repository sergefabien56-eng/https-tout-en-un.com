/** Primitives d'authentification côté serveur. Jamais importées dans un Client Component. */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.email().max(254).transform((v) => v.trim().toLowerCase()),
  password: z.string().min(12).max(1024),
});

export function assertStrongPassword(password: string): void {
  if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Mot de passe insuffisant : au moins 12 caractères, majuscule, minuscule, chiffre et symbole.');
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertStrongPassword(password);
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
}

export const verifyPassword = async (hash: string, password: string): Promise<boolean> =>
  argon2.verify(hash, password);

/** Le cookie contient le jeton opaque ; la base ne conserve que son empreinte. */
export function createSessionToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashSessionToken(token) };
}

export function hashSessionToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const TOTP_PERIOD_SECONDS = 30;

/** TOTP RFC 6238 / SHA-1 (interopérable avec les applications d'authentification usuelles). */
export function totpCode(secret: Buffer, atMs: number): string {
  if (secret.length < 20 || !Number.isSafeInteger(atMs) || atMs < 0) throw new Error('Paramètres TOTP invalides.');
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / (TOTP_PERIOD_SECONDS * 1000))));
  const digest = createHmac('sha1', secret).update(counter).digest();
  const offset = (digest.at(-1) ?? 0) & 15;
  return (((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)).toString().padStart(6, '0');
}

/**
 * Tolérance d'une période de chaque côté. Le compteur gagnant doit être mémorisé en base
 * pour empêcher qu'un code puisse être réutilisé pendant les 30 secondes de sa validité.
 */
export function verifyTotp(secret: Buffer, code: string, atMs: number, lastUsedCounter = -1): number | null {
  if (!/^\d{6}$/.test(code) || !Number.isSafeInteger(atMs) || atMs < 0) return null;
  const current = Math.floor(atMs / (TOTP_PERIOD_SECONDS * 1000));
  for (const counter of [current - 1, current, current + 1]) {
    if (counter < 0 || counter <= lastUsedCounter) continue;
    const expected = totpCode(secret, counter * TOTP_PERIOD_SECONDS * 1000);
    if (timingSafeEqual(Buffer.from(code), Buffer.from(expected))) return counter;
  }
  return null;
}

/** Comparaison constante pour le cookie CSRF (double-submit + Origin obligatoire ailleurs). */
export function verifyCsrf(cookieValue: string | undefined, formValue: string | undefined): boolean {
  if (!cookieValue || !formValue || !/^[A-Za-z0-9_-]{32,128}$/.test(cookieValue)) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(formValue);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAllowedOrigin(origin: string | null, appUrl: string): boolean {
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(appUrl).origin; } catch { return false; }
}
