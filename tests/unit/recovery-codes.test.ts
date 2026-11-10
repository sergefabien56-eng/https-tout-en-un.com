import { describe, expect, it } from 'vitest';
import { createRecoveryCodes, findRecoveryCodeHash, hashRecoveryCode } from '@/core/auth/recovery-codes';

describe('codes de secours TOTP', () => {
  it('génère 10 codes uniques de 128 bits et uniquement leurs hash en stockage', () => {
    const { codes, hashes } = createRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (let i = 0; i < codes.length; i++) {
      expect(codes[i]).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(hashes[i]).toMatch(/^[a-f0-9]{64}$/);
      expect(hashes[i]).not.toBe(codes[i]);
      expect(findRecoveryCodeHash(codes[i]!, hashes)).toBe(i);
    }
  });
  it('refuse les valeurs malformées, altérées et absentes', () => {
    const { codes, hashes } = createRecoveryCodes(2);
    expect(findRecoveryCodeHash('abcdef', hashes)).toBe(-1);
    expect(findRecoveryCodeHash(codes[0]!.slice(0, -1) + '.', hashes)).toBe(-1);
    expect(findRecoveryCodeHash(codes[0]!, hashes.slice(1))).toBe(-1);
    expect(() => hashRecoveryCode('trop-court')).toThrow();
    expect(() => createRecoveryCodes(21)).toThrow();
  });
});
