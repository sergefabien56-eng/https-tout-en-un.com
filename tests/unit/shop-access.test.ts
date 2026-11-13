import { describe, expect, it } from 'vitest';
import { classifyShopAccessOrigin } from '@/modules/identity/shop-access';

describe('provenance d’un accès boutique', () => {
  it('classe un accès porté par un rôle boutique, un rôle global, ou indépendant', () => {
    expect(classifyShopAccessOrigin([{ shopId: '7' }], '7')).toBe('scoped_role');
    expect(classifyShopAccessOrigin([{ shopId: '7' }, { shopId: null }], '7')).toBe('scoped_role');
    expect(classifyShopAccessOrigin([{ shopId: null }], '7')).toBe('global_role');
    expect(classifyShopAccessOrigin([{ shopId: '8' }], '7')).toBe('independent');
    expect(classifyShopAccessOrigin([{ shopId: '8' }, { shopId: '9' }], '7')).toBe('independent');
    expect(classifyShopAccessOrigin([], '7')).toBe('independent');
  });
  it('ne confond jamais des identifiants numériques proches', () => {
    expect(classifyShopAccessOrigin([{ shopId: '70' }], '7')).toBe('independent');
    expect(classifyShopAccessOrigin([{ shopId: '1' }], '11')).toBe('independent');
    expect(classifyShopAccessOrigin([{ shopId: '11' }], '11')).toBe('scoped_role');
  });
});
