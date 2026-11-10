/**
 * Chiffrement des secrets (jetons Jumia, secret TOTP) — AES-256-GCM, clé hors base.
 * Référence : docs/architecture.md ADR-006.
 *
 * - la clé maître ne se trouve jamais en base, ni dans une image, ni dans un journal ;
 * - les données associées (AAD) lient le chiffré à son propriétaire et à sa version de clé :
 *   un chiffré déplacé d'une ligne à une autre échoue au déchiffrement ;
 * - un ring de clés permet la rotation sans interruption (re-chiffrement paresseux).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface KeyRing {
  readonly activeVersion: number;
  readonly keys: ReadonlyMap<number, Buffer>;
}

export interface SealedSecret {
  readonly ciphertext: Buffer;
  readonly iv: Buffer;
  readonly tag: Buffer;
  readonly keyVersion: number;
}

export class SecretError extends Error {
  readonly code: 'INVALID_KEY_RING' | 'UNKNOWN_KEY_VERSION' | 'DECRYPT_FAILED';
  constructor(code: SecretError['code'], message: string) {
    super(message);
    this.name = 'SecretError';
    this.code = code;
  }
}

/** Format attendu : APP_ENC_KEYS="1:<base64>,2:<base64>" · APP_ENC_ACTIVE=2 */
export function parseKeyRing(raw: string, activeVersion?: number): KeyRing {
  const keys = new Map<number, Buffer>();
  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (trimmed === '') continue;
    const separator = trimmed.indexOf(':');
    if (separator <= 0) throw new SecretError('INVALID_KEY_RING', 'Clé mal formée (attendu version:base64).');
    const version = Number(trimmed.slice(0, separator));
    if (!Number.isInteger(version) || version <= 0) {
      throw new SecretError('INVALID_KEY_RING', `Version de clé invalide : "${trimmed.slice(0, separator)}"`);
    }
    const key = Buffer.from(trimmed.slice(separator + 1), 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new SecretError('INVALID_KEY_RING', `La clé v${version} doit faire ${KEY_LENGTH} octets (32).`);
    }
    keys.set(version, key);
  }
  if (keys.size === 0) throw new SecretError('INVALID_KEY_RING', 'Aucune clé fournie.');
  const active = activeVersion ?? Math.max(...keys.keys());
  if (!keys.has(active)) throw new SecretError('INVALID_KEY_RING', `Clé active v${active} absente du ring.`);
  return { activeVersion: active, keys };
}

function associatedData(aad: string, keyVersion: number): Buffer {
  return Buffer.from(`${aad}|v${keyVersion}`, 'utf8');
}

export function sealSecret(
  plaintext: string,
  ring: KeyRing,
  aad: string,
  options: { keyVersion?: number } = {},
): SealedSecret {
  const keyVersion = options.keyVersion ?? ring.activeVersion;
  const key = ring.keys.get(keyVersion);
  if (!key) throw new SecretError('UNKNOWN_KEY_VERSION', `Version de clé inconnue : v${keyVersion}`);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(associatedData(aad, keyVersion));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag, keyVersion };
}

export function openSecret(sealed: SealedSecret, ring: KeyRing, aad: string): string {
  const key = ring.keys.get(sealed.keyVersion);
  if (!key) throw new SecretError('UNKNOWN_KEY_VERSION', `Version de clé inconnue : v${sealed.keyVersion}`);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, sealed.iv, { authTagLength: TAG_LENGTH });
    decipher.setAAD(associatedData(aad, sealed.keyVersion));
    decipher.setAuthTag(sealed.tag);
    return Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // Message volontairement neutre : ne jamais indiquer si la clé ou les données sont en cause.
    throw new SecretError('DECRYPT_FAILED', 'Déchiffrement impossible (données, contexte ou clé invalides).');
  }
}

/** Re-chiffrement avec la clé active (rotation paresseuse à la prochaine écriture). */
export function resealSecret(sealed: SealedSecret, ring: KeyRing, aad: string): SealedSecret {
  if (sealed.keyVersion === ring.activeVersion) return sealed;
  return sealSecret(openSecret(sealed, ring, aad), ring, aad);
}

/** Empreinte lisible d'un secret, pour diagnostiquer sans l'exposer (ex. « …a3f9 »). */
export function secretFingerprint(plaintext: string): string {
  return Buffer.from(plaintext).subarray(-4).toString('hex');
}
