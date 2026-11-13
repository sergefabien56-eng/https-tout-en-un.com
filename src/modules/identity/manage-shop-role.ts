/** Attributions boutique d'un compte existant : propriétaire global uniquement. */
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { SCOPED_ROLES, type ScopedRole } from '@/modules/identity/scoped-roles';
export function parseScopedRole(value: unknown): ScopedRole {
  if (typeof value !== 'string' || !SCOPED_ROLES.some((code) => code === value))
    throw new ValidationError('Rôle boutique invalide.');
  return value as ScopedRole;
}

export async function manageShopRole(input: {
  token: string | undefined; userId: string; shopId: string; roleCode: unknown; grant: unknown;
}): Promise<{ userId: string; shopId: string; roleCode: ScopedRole; granted: boolean; changed: boolean }> {
  const { token, userId, shopId } = input;
  if (!/^[1-9]\d{0,17}$/.test(userId)) throw new ValidationError('Utilisateur invalide.');
  const roleCode = parseScopedRole(input.roleCode);
  if (typeof input.grant !== 'boolean') throw new ValidationError('Action invalide.');
  const grant = input.grant;
  return withAuthorizedShopTransaction({ token, shopId, permission: 'roles:manage' }, async (db, context) => {
    const owner = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner' AND shop_id IS NULL
    ) AS allowed`, [context.userId]);
    if (!owner.rows[0]?.allowed) throw new ForbiddenError('Seul le Propriétaire peut attribuer les rôles boutique.');
    if (userId === context.userId) throw new ForbiddenError('Votre propre compte est protégé.');
    const target = await db.query<{ status: string }>('SELECT status FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!target.rows[0]) throw new AppError('NOT_FOUND', { userMessage: 'Utilisateur introuvable.' });
    if (target.rows[0].status === 'invited')
      throw new AppError('CONFLICT', { userMessage: 'Les invitations ne sont pas gérées ici.' });
    const targetOwner = await db.query<{ owner: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner'
    ) AS owner`, [userId]);
    if (targetOwner.rows[0]?.owner) throw new ForbiddenError('Le compte Propriétaire est protégé.');
    const current = await db.query<{ id: string }>(`SELECT id::text FROM user_roles
      WHERE user_id = $1 AND role_code = $2 AND shop_id = $3`, [userId, roleCode, context.shopId]);
    const wasGranted = current.rows.length > 0;
    const access = await db.query<{ can_view: boolean }>(`SELECT can_view FROM user_shop_access
      WHERE user_id = $1 AND shop_id = $2 FOR UPDATE`, [userId, context.shopId]);
    const canViewBefore = access.rows[0]?.can_view ?? false;
    let changed = false;
    if (grant) {
      if (!wasGranted) {
        await db.query('INSERT INTO user_roles (user_id, role_code, shop_id) VALUES ($1, $2, $3)',
          [userId, roleCode, context.shopId]);
        changed = true;
      }
      if (access.rows[0]?.can_view !== true) {
        await db.query(`INSERT INTO user_shop_access (user_id, shop_id, can_view) VALUES ($1, $2, true)
          ON CONFLICT (user_id, shop_id) DO UPDATE SET can_view = true`, [userId, context.shopId]);
        changed = true;
      }
    } else if (wasGranted) {
      await db.query('DELETE FROM user_roles WHERE user_id = $1 AND role_code = $2 AND shop_id = $3',
        [userId, roleCode, context.shopId]);
      // Conserver user_shop_access : un autre rôle peut encore en dépendre.
      // Sans rôle ayant shops:read, la policy RLS refuse la boutique malgré cette ligne.
      changed = true;
    }
    if (changed) await db.query(`INSERT INTO audit_log
      (actor_user_id, shop_id, module, action, entity_type, before, after)
      VALUES ($1, $2, 'users', 'manage_shop_role', 'user_role', $3::jsonb, $4::jsonb)`,
    [context.userId, context.shopId,
      JSON.stringify({ userId, roleCode, granted: wasGranted, canView: canViewBefore }),
      JSON.stringify({ userId, roleCode, granted: grant, canView: grant || canViewBefore })]);
    return { userId, shopId: context.shopId, roleCode, granted: grant, changed };
  });
}
