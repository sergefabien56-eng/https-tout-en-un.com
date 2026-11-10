import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  SecretError,
  openSecret,
  parseKeyRing,
  resealSecret,
  sealSecret,
} from '@/core/crypto/envelope';

const KEY_V1 = randomBytes(32).toString('base64');
const KEY_V2 = randomBytes(32).toString('base64');
const ring = parseKeyRing(`1:${KEY_V1}`, 1);
const ringRotated = parseKeyRing(`1:${KEY_V1},2:${KEY_V2}`, 2);
const AAD = 'app:42:refresh_token';

describe('enveloppe AES-256-GCM', () => {
  it('chiffre puis déchiffre à l’identique', () => {
    const sealed = sealSecret('refresh-token-secret-jumia', ring, AAD);
    expect(openSecret(sealed, ring, AAD)).toBe('refresh-token-secret-jumia');
    expect(sealed.keyVersion).toBe(1);
  });

  it('produit un chiffré différent à chaque appel (IV aléatoire)', () => {
    const a = sealSecret('même secret', ring, AAD);
    const b = sealSecret('même secret', ring, AAD);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it('refuse un déchiffrement avec un autre contexte (chiffré déplacé)', () => {
    const sealed = sealSecret('jeton', ring, AAD);
    expect(() => openSecret(sealed, ring, 'app:43:refresh_token')).toThrow(SecretError);
  });

  it('refuse un chiffré altéré (contrôle d’intégrité GCM)', () => {
    const sealed = sealSecret('jeton', ring, AAD);
    const tampered = Buffer.from(sealed.ciphertext);
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    expect(() => openSecret({ ...sealed, ciphertext: tampered }, ring, AAD)).toThrow(/Déchiffrement impossible/);
  });

  it('refuse un tag d’authentification modifié', () => {
    const sealed = sealSecret('jeton', ring, AAD);
    const tag = Buffer.from(sealed.tag);
    tag[0] = (tag[0] ?? 0) ^ 0x01;
    expect(() => openSecret({ ...sealed, tag }, ring, AAD)).toThrow(SecretError);
  });

  it('refuse une version de clé absente du ring', () => {
    expect(() => sealSecret('jeton', ring, AAD, { keyVersion: 9 })).toThrow(/clé inconnue/i);
    const sealed = sealSecret('jeton', ring, AAD);
    expect(() => openSecret(sealed, parseKeyRing(`2:${KEY_V2}`, 2), AAD)).toThrow(/clé inconnue/i);
  });

  it('permet la rotation : ancien chiffré lisible, re-chiffré avec la clé active', () => {
    const sealedV1 = sealSecret('jeton rotatif', ring, AAD);
    expect(openSecret(sealedV1, ringRotated, AAD)).toBe('jeton rotatif');
    const sealedV2 = resealSecret(sealedV1, ringRotated, AAD);
    expect(sealedV2.keyVersion).toBe(2);
    expect(openSecret(sealedV2, ringRotated, AAD)).toBe('jeton rotatif');
  });

  it('valide le format du ring de clés', () => {
    expect(() => parseKeyRing('1:pas-du-base64-de-32-octets')).toThrow(SecretError);
    expect(() => parseKeyRing('')).toThrow(SecretError);
    expect(() => parseKeyRing(`1:${KEY_V1}`, 5)).toThrow(/absente du ring/);
  });
});
