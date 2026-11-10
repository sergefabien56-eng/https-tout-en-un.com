/** Matrice de permissions réelles. Les cinq rôles système sont immuables hors migrations. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';

export interface RoleMatrix {
  roles: { code: string; label: string; isSystem: boolean }[];
  permissions: { code: string; label: string; module: string }[];
  grants: Record<string, string[]>;
}

export async function getRoleMatrix(token: string | undefined): Promise<RoleMatrix> {
  return withAuthorizedGlobalTransaction({ token, permission: 'roles:manage' }, async (db) => {
    const roles = await db.query<{ code: string; label: string; is_system: boolean }>(
      'SELECT code, label, is_system FROM roles ORDER BY code',
    );
    const permissions = await db.query<{ code: string; label: string; module: string }>(
      'SELECT code, label, module FROM permissions ORDER BY module, code',
    );
    const rows = await db.query<{ role_code: string; permission_code: string }>(
      'SELECT role_code, permission_code FROM role_permissions ORDER BY role_code, permission_code',
    );
    const grants: Record<string, string[]> = {};
    for (const role of roles.rows) grants[role.code] = [];
    for (const row of rows.rows) grants[row.role_code]?.push(row.permission_code);
    return {
      roles: roles.rows.map((r) => ({ code: r.code, label: r.label, isSystem: r.is_system })),
      permissions: permissions.rows,
      grants,
    };
  });
}
