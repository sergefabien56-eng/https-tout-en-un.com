/** Filtrage du menu côté serveur : aucune permission confiée par le navigateur. */
import { withIdentityTransaction } from '@/core/db/client';

export async function getNavigationPermissions(userId: string): Promise<{
  permissions: ReadonlySet<string>; globalPermissions: ReadonlySet<string>; isGlobalOwner: boolean;
}> {
  return withIdentityTransaction(async (db) => {
    const rows = await db.query<{ permission_code: string; global_grant: boolean }>(
      `SELECT rp.permission_code, bool_or(ur.shop_id IS NULL) AS global_grant FROM role_permissions rp
       JOIN user_roles ur ON ur.role_code = rp.role_code WHERE ur.user_id = $1
       GROUP BY rp.permission_code`, [userId]);
    const access = await db.query<{ owner: boolean; directory: boolean }>(`SELECT
      EXISTS (SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code='owner' AND shop_id IS NULL) AS owner,
      EXISTS (SELECT 1 FROM user_directory_access WHERE user_id=$1) AS directory`, [userId]);
    const isGlobalOwner = !!access.rows[0]?.owner;
    const permissions = new Set(rows.rows.map((r) => r.permission_code));
    const globalPermissions = new Set(rows.rows.filter((r) => r.global_grant).map((r) => r.permission_code));
    if (!isGlobalOwner && !access.rows[0]?.directory) {
      globalPermissions.delete('users:read');
    }
    if (!isGlobalOwner) globalPermissions.delete('users:write');
    return { permissions, globalPermissions, isGlobalOwner };
  });
}
