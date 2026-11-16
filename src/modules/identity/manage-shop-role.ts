/** Attribution boutique : propriétaire ou délégué limité aux membres et à ses permissions. */
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { hashSessionToken } from '@/core/auth/primitives';
import { listDelegableRoles } from '@/modules/identity/delegable-roles';
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
    const isOwner = !!owner.rows[0]?.allowed;
    if (userId === context.userId) throw new ForbiddenError('Votre propre compte est protégé.');
    if (!isOwner) {
      // Ordre canonique : comptes, session, rôles. Les mutations existantes de rôles
      // et d'accès verrouillent aussi le compte cible ; la matrice verrouille le rôle.
      await db.query('SELECT id FROM users WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE', [[context.userId, userId]]);
      const session = await db.query(`SELECT s.user_id FROM sessions s JOIN users u ON u.id=s.user_id
        WHERE s.token_hash=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>statement_timestamp()
          AND u.status='active' FOR SHARE OF s`, [hashSessionToken(input.token!), context.userId]);
      if (!session.rowCount) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
      // Bloque simultanément toute modification de matrice portant sur un rôle existant.
      await db.query('SELECT code FROM roles ORDER BY code FOR SHARE');
      const shop = await db.query('SELECT id FROM shops WHERE id=$1 AND deleted_at IS NULL FOR SHARE', [context.shopId]);
      if (!shop.rowCount) throw new ForbiddenError('Boutique introuvable ou non autorisée.');
      const access = await db.query<{ user_id: string }>(`SELECT user_id::text FROM user_shop_access
        WHERE shop_id=$1 AND user_id=ANY($2::bigint[]) AND can_view ORDER BY user_id FOR UPDATE`,
      [context.shopId, [context.userId, userId]]);
      if (access.rows.length !== 2) throw new ForbiddenError('Action non autorisée pour cette boutique ou ce membre.');
      const permission = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
        SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code=ur.role_code
        WHERE ur.user_id=$1 AND (ur.shop_id IS NULL OR ur.shop_id=$2) AND rp.permission_code='roles:manage'
      ) AS allowed`, [context.userId, context.shopId]);
      if (!permission.rows[0]?.allowed) throw new ForbiddenError('Action non autorisée.');
      const manageable = await listDelegableRoles(db, context.userId, context.shopId);
      if (!manageable.some((role) => role.code === roleCode))
        throw new ForbiddenError('Ce rôle dépasse vos permissions sur cette boutique.');
    }
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
        // Seul le propriétaire peut créer ou réactiver l'accès, jamais un délégué.
        if (!isOwner) throw new ForbiddenError('Seul le Propriétaire peut ajouter un membre.');
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
