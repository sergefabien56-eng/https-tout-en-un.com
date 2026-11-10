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
