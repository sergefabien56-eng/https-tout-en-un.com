/** Liste administrative réelle, sans secret, bornée et paramétrée. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';

export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
}

export async function listAuthorizedUsers(token: string | undefined, page = 1): Promise<{
  users: UserSummary[]; nextPage: number | null;
}> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) throw new Error('Page invalide.');
  return withAuthorizedGlobalTransaction({ token, permission: 'users:read' }, async (db) => {
    const size = 20;
    const result = await db.query<{
      id: string; display_name: string; email: string;
      status: UserSummary['status']; created_at: Date | string;
    }>(`SELECT id::text, display_name, email, status, created_at FROM users
        ORDER BY id DESC LIMIT $1 OFFSET $2`, [size + 1, (page - 1) * size]);
    return {
      users: result.rows.slice(0, size).map((r) => ({ id: String(r.id), displayName: r.display_name,
        email: r.email, status: r.status, createdAt: new Date(r.created_at).toISOString() })),
      nextPage: result.rows.length > size ? page + 1 : null,
    };
  });
}

/** Fiche administrative sans secrets ; le rôle boutique est distingué du rôle global. */
export interface UserDetail extends UserSummary {
  roles: { code: string; label: string; shopId: string | null }[];
}
export async function getAuthorizedUser(token: string | undefined, id: string): Promise<UserDetail | null> {
  if (!/^[1-9]\d{0,17}$/.test(id)) return null;
  return withAuthorizedGlobalTransaction({ token, permission: 'users:read' }, async (db) => {
    const user = await db.query<{
      id: string; display_name: string; email: string;
      status: UserSummary['status']; created_at: Date | string;
    }>('SELECT id::text, display_name, email, status, created_at FROM users WHERE id = $1', [id]);
    const row = user.rows[0];
    if (!row) return null;
    const assignments = await db.query<{ role_code: string; label: string; shop_id: string | null }>(
      `SELECT ur.role_code, r.label, ur.shop_id::text FROM user_roles ur
       JOIN roles r ON r.code = ur.role_code WHERE ur.user_id = $1
       ORDER BY r.label, ur.shop_id NULLS FIRST`, [id],
    );
    return { id: String(row.id), displayName: row.display_name, email: row.email,
      status: row.status, createdAt: new Date(row.created_at).toISOString(),
      roles: assignments.rows.map((r) => ({ code: r.role_code, label: r.label,
        shopId: r.shop_id === null ? null : String(r.shop_id) })) };
  });
}
