import { describe, expect, it } from 'vitest';
import { parseScopedRole } from '@/modules/identity/manage-shop-role';

describe('rôles attribuables par boutique', () => {
  it('limite aux quatre rôles non propriétaires, jamais un rôle global', () => {
    for (const role of ['manager', 'stock_manager', 'accountant', 'assistant'])
      expect(parseScopedRole(role)).toBe(role);
    for (const bad of ['owner', 'OWNER', 'manager;DROP', '', null, 1, {}])
      expect(() => parseScopedRole(bad)).toThrow('Rôle boutique invalide.');
  });
});
