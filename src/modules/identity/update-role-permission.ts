/** Mutation explicite de la matrice globale ; le propriétaire reste immuable. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { SCOPED_ROLES, type ScopedRole } from '@/modules/identity/scoped-roles';

export async function updateRolePermission(input: {
  token: string | undefined; roleCode: unknown; permissionCode: unknown;
  expected: unknown; granted: unknown;
}): Promise<{ roleCode: ScopedRole; permissionCode: string; granted: boolean; changed: boolean }> {
  if (typeof input.roleCode !== 'string' || !SCOPED_ROLES.some((r) => r === input.roleCode))
    throw new ValidationError('Rôle non modifiable.');
  if (typeof input.permissionCode !== 'string' || !/^[a-z]+(?::[a-z_]+){1,2}$/.test(input.permissionCode) || input.permissionCode.length > 100 ||
    typeof input.expected !== 'boolean' || typeof input.granted !== 'boolean')
    throw new ValidationError('Modification invalide.');
  const roleCode = input.roleCode as ScopedRole;
  const permissionCode = input.permissionCode;
  const expected = input.expected;
  const granted = input.granted;
  return withAuthorizedGlobalTransaction({ token: input.token, permission: 'roles:manage' }, async (db, { userId }) => {
    const owner = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code='owner' AND shop_id IS NULL
    ) AS allowed`, [userId]);
    if (!owner.rows[0]?.allowed) throw new ForbiddenError('Seul le Propriétaire peut modifier la matrice.');
    // Sérialise les modifications du même rôle, y compris une permission absente.
    const role = await db.query('SELECT code FROM roles WHERE code=$1 FOR UPDATE', [roleCode]);
    const permission = await db.query('SELECT code FROM permissions WHERE code=$1', [permissionCode]);
    if (!role.rowCount || !permission.rowCount) throw new ValidationError('Rôle ou permission introuvable.');
    const current = await db.query('SELECT 1 FROM role_permissions WHERE role_code=$1 AND permission_code=$2', [roleCode, permissionCode]);
    const before = !!current.rowCount;
    if (before !== expected) throw new AppError('CONFLICT', { userMessage: 'La matrice a changé. Actualisez avant de confirmer.' });
    if (before !== granted) {
      if (granted) await db.query('INSERT INTO role_permissions (role_code, permission_code) VALUES ($1,$2)', [roleCode, permissionCode]);
      else await db.query('DELETE FROM role_permissions WHERE role_code=$1 AND permission_code=$2', [roleCode, permissionCode]);
      await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [userId]);
      await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
        VALUES ($1, 'roles', 'update_role_permission', 'role_permission', $2::jsonb, $3::jsonb)`,
      [userId, JSON.stringify({ roleCode, permissionCode, granted: before }), JSON.stringify({ roleCode, permissionCode, granted })]);
    }
    return { roleCode, permissionCode, granted, changed: before !== granted };
  });
}
