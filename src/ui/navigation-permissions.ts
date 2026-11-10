/** Filtrage du menu côté serveur : aucune permission confiée par le navigateur. */
import { withIdentityTransaction } from '@/core/db/client';

export async function getNavigationPermissions(userId: string): Promise<ReadonlySet<string>> {
  const rows = await withIdentityTransaction(async (db) => db.query<{ permission_code: string }>(
    `SELECT DISTINCT rp.permission_code FROM role_permissions rp
     JOIN user_roles ur ON ur.role_code = rp.role_code WHERE ur.user_id = $1`, [userId],
  ));
  return new Set(rows.rows.map((r) => r.permission_code));
}
