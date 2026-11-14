import { describe, expect, it } from 'vitest';
import { parseOrganizationName } from '@/modules/identity/organization-name';

describe('nom de l’organisation', () => {
  it('normalise le texte et conserve les caractères accentués', () => {
    expect(parseOrganizationName('  Socie\u0301te\u0301 Démo  ')).toBe('Société Démo');
    expect(parseOrganizationName('a'.repeat(100))).toHaveLength(100);
  });
  it('refuse les valeurs vides, trop longues, non textuelles et les caractères de contrôle', () => {
    for (const value of ['', '  ', 'a'.repeat(101), 'test\nfoo', 'test\0', 'foo\u202e', null, {}, 3])
      expect(() => parseOrganizationName(value)).toThrow('Nom d’organisation invalide.');
  });
});
