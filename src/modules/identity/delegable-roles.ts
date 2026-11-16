/** Rôles boutique dont chaque permission existe déjà dans les droits effectifs de l'acteur. */
import type { PoolClient } from 'pg';
import { SCOPED_ROLES, type ScopedRole } from '@/modules/identity/scoped-roles';
export async function listDelegableRoles(db: PoolClient, userId: string, shopId: string): Promise<{ code: ScopedRole; label: string }[]> {
  const result = await db.query<{ code: ScopedRole; label: string }>(`SELECT r.code, r.label FROM roles r
    WHERE r.code=ANY($1::text[]) AND NOT EXISTS (
      SELECT 1 FROM role_permissions requested WHERE requested.role_code=r.code AND NOT EXISTS (
        SELECT 1 FROM user_roles own JOIN role_permissions p ON p.role_code=own.role_code
        WHERE own.user_id=$2 AND (own.shop_id IS NULL OR own.shop_id=$3)
          AND p.permission_code=requested.permission_code
      )
    ) ORDER BY r.label, r.code`, [SCOPED_ROLES, userId, shopId]);
  return result.rows;
}
