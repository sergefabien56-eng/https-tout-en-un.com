import { describe, expect, it } from 'vitest';
import { authorize, hasPermission, type RoleGrant } from '@/core/auth/permissions';
import { createShopScope } from '@/core/db/shop-scope';

const scope = createShopScope({ userId: 'u1', allowedShopIds: ['1'], roleCodes: ['manager'] });
const grants: RoleGrant[] = [
  { roleCode: 'manager', shopId: '1', permissions: ['shops:read', 'orders:read'] },
  { roleCode: 'assistant', shopId: null, permissions: ['notifications:read'] },
];

describe('autorisation par permission + boutique', () => {
  it('accepte une permission accordée sur la bonne boutique', () => {
    expect(hasPermission(scope, grants, 'shops:read', '1')).toBe(true);
  });
  it('refuse la même permission sur une boutique hors périmètre', () => {
    expect(hasPermission(scope, grants, 'shops:read', '2')).toBe(false);
  });
  it('un rôle limité à la boutique ne donne aucun droit global', () => {
    expect(hasPermission(scope, grants, 'shops:read', null)).toBe(false);
  });
  it('un rôle global garde sa permission dans le périmètre autorisé', () => {
    expect(hasPermission(scope, grants, 'notifications:read', '1')).toBe(true);
    expect(hasPermission(scope, grants, 'notifications:read', '2')).toBe(false);
  });
  it('une permission jamais attribuée est refusée', () => {
    expect(() => authorize(scope, grants, 'system:manage', null)).toThrow('Action non autorisée.');
  });
  it('un utilisateur vide de boutique ne peut être construit', () => {
    expect(() => createShopScope({ userId: 'u2', allowedShopIds: [], roleCodes: ['assistant'] })).toThrow();
  });
});
