import { describe, expect, it } from 'vitest';
import { isShopSort, parseShopStatus } from '@/modules/identity/shop-catalog';

describe('tri autorisé du catalogue boutiques', () => {
  it('traite status vide du formulaire GET comme tous les états, mais refuse les autres valeurs inconnues', () => {
    expect(parseShopStatus('')).toBeUndefined();
    expect(parseShopStatus(undefined)).toBeUndefined();
    expect(parseShopStatus('connected')).toBe('connected');
    expect(() => parseShopStatus('malicious')).toThrow('Filtres invalides.');
    expect(() => parseShopStatus('ALL')).toThrow('Filtres invalides.');
  });
  it('n’accepte que les trois ordres connus', () => {
    for (const value of ['recent', 'name-asc', 'name-desc']) expect(isShopSort(value)).toBe(true);
    for (const value of ['', 'name; DROP TABLE shops', '__proto__', 'constructor', 'NAME-ASC'])
      expect(isShopSort(value)).toBe(false);
  });
});
