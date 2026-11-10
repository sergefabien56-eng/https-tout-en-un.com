/** Codes de secours 2FA : entropie 128 bits, jamais stockés ni journalisés en clair. */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function createRecoveryCodes(count = 10): { codes: string[]; hashes: string[] } {
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('Nombre de codes invalide.');
  const codes = Array.from({ length: count }, () => randomBytes(16).toString('base64url'));
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

export function hashRecoveryCode(code: string): string {
  if (!CODE_PATTERN.test(code)) throw new Error('Code de secours invalide.');
  return createHash('sha256').update(code, 'ascii').digest('hex');
}

/** Retourne l'index du hash utilisé, ou -1. Comparaison constante du digest. */
export function findRecoveryCodeHash(code: string, hashes: readonly string[]): number {
  if (!CODE_PATTERN.test(code)) return -1;
  const digest = Buffer.from(hashRecoveryCode(code), 'hex');
  let found = -1;
  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i];
    if (!hash || !/^[a-f0-9]{64}$/.test(hash)) continue;
    const candidate = Buffer.from(hash, 'hex');
    if (timingSafeEqual(candidate, digest)) found = i;
  }
  return found;
}
