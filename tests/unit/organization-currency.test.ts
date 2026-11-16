import { describe, expect, it } from 'vitest';
import { parseReferenceCurrency } from '@/modules/identity/organization-currency';

describe('devise de référence', () => {
  it('accepte uniquement XOF, le choix effectivement confirmé', () => {
    expect(parseReferenceCurrency('XOF')).toBe('XOF');
    for (const invalid of ['xof', ' XOF', 'USD', '=cmd', null, {}, 0]) expect(() => parseReferenceCurrency(invalid)).toThrow();
  });
});
