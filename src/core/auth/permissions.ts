/** Autorisation serveur : le rôle seul ne suffit pas, le périmètre boutique est obligatoire. */
import { ForbiddenError } from '@/core/errors/app-error';
import { assertShopAccess, type ShopId, type ShopScope } from '@/core/db/shop-scope';

export interface RoleGrant {
  readonly roleCode: string;
  /** null = rôle global ; sinon limité à une boutique. */
  readonly shopId: ShopId | null;
  readonly permissions: readonly string[];
}

export function hasPermission(
  scope: ShopScope,
  grants: readonly RoleGrant[],
  permission: string,
  shopId: ShopId | null,
): boolean {
  // N'autoriser une permission globale QUE sur un rôle global. Une autorisation
  // boutique ne confère pas automatiquement les droits sur une autre boutique.
  if (shopId === null) {
    return grants.some((grant) => grant.shopId === null && grant.permissions.includes(permission));
  }
  try { assertShopAccess(scope, shopId); } catch { return false; }
  return grants.some((grant) =>
    (grant.shopId === null || grant.shopId === shopId) && grant.permissions.includes(permission),
  );
}

export function authorize(
  scope: ShopScope,
  grants: readonly RoleGrant[],
  permission: string,
  shopId: ShopId | null,
): void {
  if (!hasPermission(scope, grants, permission, shopId)) {
    throw new ForbiddenError('Action non autorisée.', `permission ${permission} refusée`);
  }
}
