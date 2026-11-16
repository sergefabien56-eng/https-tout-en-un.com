/** Lecture de membres STRICTEMENT dans la boutique autorisée ; aucune mutation. */
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { ValidationError } from '@/core/errors/app-error';
export interface ShopMember {
  id: string; displayName: string; email: string; status: 'active' | 'suspended';
  shopRoles: { code: string; label: string }[];
}
export async function listShopMembers(input: { token: string | undefined; shopId: string; page?: number }): Promise<{
  members: ShopMember[]; nextPage: number | null;
}> {
  const page = input.page ?? 1;
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) throw new ValidationError('Page invalide.');
  return withAuthorizedShopTransaction({ token: input.token, shopId: input.shopId, permission: 'roles:manage' }, async (db, ctx) => {
    // Le filtre explicite shop_id complète la RLS. Une ligne d'accès active est
    // obligatoire même si le compte a un rôle global ou s'il s'agit du propriétaire.
    const result = await db.query<{ id: string; display_name: string; email: string; status: ShopMember['status'] }>(
      `SELECT u.id::text, u.display_name, u.email, u.status FROM users u
       JOIN user_shop_access a ON a.user_id=u.id AND a.shop_id=$1 AND a.can_view
       WHERE u.status IN ('active','suspended') ORDER BY u.id DESC LIMIT $2 OFFSET $3`,
      [ctx.shopId, 21, (page - 1) * 20]);
    const shown = result.rows.slice(0, 20);
    if (!shown.length) return { members: [], nextPage: null };
    const ids = shown.map((row) => String(row.id));
    // N'afficher ni les rôles globaux, ni ceux des autres boutiques.
    const roles = await db.query<{ user_id: string; role_code: string; label: string }>(
      `SELECT ur.user_id::text, ur.role_code, r.label FROM user_roles ur JOIN roles r ON r.code=ur.role_code
       WHERE ur.shop_id=$1 AND ur.user_id=ANY($2::bigint[]) ORDER BY r.label,ur.role_code`, [ctx.shopId, ids]);
    return { members: shown.map((row) => ({ id: String(row.id), displayName: row.display_name,
      email: row.email, status: row.status,
      shopRoles: roles.rows.filter((role) => String(role.user_id) === String(row.id))
        .map((role) => ({ code: role.role_code, label: role.label })) })),
      nextPage: result.rows.length > 20 ? page + 1 : null };
  });
}
