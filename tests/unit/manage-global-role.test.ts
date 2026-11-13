import { describe, expect, it } from 'vitest';
import { parseGlobalRole } from '@/modules/identity/manage-global-role';

describe('rôles globaux attribuables', () => {
  it('limite aux quatre rôles non propriétaires, jamais le rôle Propriétaire', () => {
    for (const role of ['manager', 'stock_manager', 'accountant', 'assistant'])
      expect(parseGlobalRole(role)).toBe(role);
    for (const bad of ['owner', 'OWNER', 'Owner', 'manager;DROP', '', 'global', null, 1, {}, []])
      expect(() => parseGlobalRole(bad)).toThrow('Rôle global invalide.');
  });
});
