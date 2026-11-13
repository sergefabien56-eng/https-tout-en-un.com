/** Rôle global d'un compte existant : Propriétaire global uniquement, jamais owner. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { SCOPED_ROLES, type ScopedRole } from '@/modules/identity/scoped-roles';

export function parseGlobalRole(value: unknown): ScopedRole {
  if (typeof value !== 'string' || !SCOPED_ROLES.some((code) => code === value))
    throw new ValidationError('Rôle global invalide.');
  return value as ScopedRole;
}

/**
 * Attribution/retrait d'un rôle GLOBAL (shop_id NULL) à un compte existant.
 * Aucun rôle Propriétaire n'est attribuable ni retirable par cette route ; soi-même,
 * les invitations et les comptes Propriétaires sont protégés. Aucun accès boutique
 * n'est créé implicitement : un rôle global sans ligne user_shop_access ne donne
 * aucune boutique (le seul contournement est le Propriétaire global).
 * Mutation et audit (shop_id NULL, visible système) atomiques dans la transaction
 * d'identité ; aucun état idempotent ne produit de faux audit.
 */
export async function manageGlobalRole(input: {
  token: string | undefined; userId: string; roleCode: unknown; grant: unknown;
}): Promise<{ userId: string; roleCode: ScopedRole; granted: boolean; changed: boolean }> {
  const { token, userId } = input;
  if (!/^[1-9]\d{0,17}$/.test(userId)) throw new ValidationError('Utilisateur invalide.');
  const roleCode = parseGlobalRole(input.roleCode);
  if (typeof input.grant !== 'boolean') throw new ValidationError('Action invalide.');
  const grant = input.grant;
  return withAuthorizedGlobalTransaction({ token, permission: 'roles:manage' }, async (db, context) => {
    const owner = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner' AND shop_id IS NULL
    ) AS allowed`, [context.userId]);
    if (!owner.rows[0]?.allowed)
      throw new ForbiddenError('Seul le Propriétaire peut attribuer les rôles globaux.');
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
      WHERE user_id = $1 AND role_code = $2 AND shop_id IS NULL`, [userId, roleCode]);
    const wasGranted = current.rows.length > 0;
    let changed = false;
    if (grant) {
      if (!wasGranted) {
        await db.query('INSERT INTO user_roles (user_id, role_code, shop_id) VALUES ($1, $2, NULL)',
          [userId, roleCode]);
        changed = true;
      }
    } else if (wasGranted) {
      // Les lignes user_shop_access sont conservées ; elles ne deviennent
      // indépendantes qu'en l'absence d'autre rôle global ou rôle sur la boutique.
      await db.query('DELETE FROM user_roles WHERE user_id = $1 AND role_code = $2 AND shop_id IS NULL',
        [userId, roleCode]);
      changed = true;
    }
    if (changed) {
      // Policy 0011 : INSERT d'audit étroit hors contexte boutique ; l'acteur est
      // vérifié par la RLS contre ce réglage LOCAL, posé après session vérifiée.
      await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [context.userId]);
      await db.query(`INSERT INTO audit_log
        (actor_user_id, shop_id, module, action, entity_type, before, after)
        VALUES ($1, NULL, 'users', 'manage_global_role', 'user_role', $2::jsonb, $3::jsonb)`,
      [context.userId,
        JSON.stringify({ userId, roleCode, granted: wasGranted }),
        JSON.stringify({ userId, roleCode, granted: grant })]);
    }
    return { userId, roleCode, granted: grant, changed };
  });
}
