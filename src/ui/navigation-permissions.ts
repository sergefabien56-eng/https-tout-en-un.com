/** Filtrage du menu côté serveur : aucune permission confiée par le navigateur. */
import { withIdentityTransaction } from '@/core/db/client';

export async function getNavigationPermissions(userId: string): Promise<{
  permissions: ReadonlySet<string>; globalPermissions: ReadonlySet<string>;
}> {
  const rows = await withIdentityTransaction(async (db) => db.query<{ permission_code: string; global_grant: boolean }>(
    `SELECT rp.permission_code, bool_or(ur.shop_id IS NULL) AS global_grant FROM role_permissions rp
     JOIN user_roles ur ON ur.role_code = rp.role_code WHERE ur.user_id = $1
     GROUP BY rp.permission_code`, [userId],
  ));
  return { permissions: new Set(rows.rows.map((r) => r.permission_code)),
    globalPermissions: new Set(rows.rows.filter((r) => r.global_grant).map((r) => r.permission_code)) }; 
}
