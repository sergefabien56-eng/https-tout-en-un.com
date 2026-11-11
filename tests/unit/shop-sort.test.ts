import { describe, expect, it } from 'vitest';
import { isShopSort } from '@/modules/identity/shop-catalog';

describe('tri autorisé du catalogue boutiques', () => {
  it('n’accepte que les trois ordres connus', () => {
    for (const value of ['recent', 'name-asc', 'name-desc']) expect(isShopSort(value)).toBe(true);
    for (const value of ['', 'name; DROP TABLE shops', '__proto__', 'constructor', 'NAME-ASC'])
      expect(isShopSort(value)).toBe(false);
  });
});
