/** Notifications du seul compte connecté ; aucune identité fournie par le navigateur. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError, ValidationError } from '@/core/errors/app-error';

export interface NotificationSummary {
  id: string; kind: 'security_login'; title: string; message: string;
  createdAt: string; readAt: string | null;
}
export async function listOwnNotifications(token: string | undefined, page = 1): Promise<{
  notifications: NotificationSummary[]; nextPage: number | null;
}> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) throw new ValidationError('Page invalide.');
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  return withIdentityTransaction(async (db) => {
    const auth = await db.query<{ user_id: string }>(`SELECT s.user_id FROM sessions s
      JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1
      AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`,
    [hashSessionToken(token)]);
    const userId = auth.rows[0]?.user_id;
    if (!userId) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    await db.query("SELECT set_config('app.notification_user_id', $1, true)", [userId]);
    const rows = await db.query<{
      id: string; kind: 'security_login'; title: string; message: string;
      created_at: Date | string; read_at: Date | string | null;
    }>(`SELECT id::text, kind, title, message, created_at, read_at
      FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3`, [userId, 21, (page - 1) * 20]);
    return { notifications: rows.rows.slice(0, 20).map((r) => ({
      id: String(r.id), kind: r.kind, title: r.title, message: r.message,
      createdAt: new Date(r.created_at).toISOString(),
      readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
    })), nextPage: rows.rows.length > 20 ? page + 1 : null };
  });
}
