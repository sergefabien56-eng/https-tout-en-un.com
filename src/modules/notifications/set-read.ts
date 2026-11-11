/** Mutation personnelle : session valide, contexte RLS local et audit atomique. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError, ValidationError } from '@/core/errors/app-error';

export async function setOwnNotificationRead(token: string | undefined, id: string, read: boolean): Promise<{ readAt: string | null }> {
  if (!/^[1-9]\d{0,18}$/.test(id)) throw new ValidationError('Notification invalide.');
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  return withIdentityTransaction(async (db) => {
    const auth = await db.query<{ user_id: string }>(`SELECT s.user_id FROM sessions s
      JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1
      AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`, [hashSessionToken(token)]);
    const userId = auth.rows[0]?.user_id;
    if (!userId) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    await db.query("SELECT set_config('app.notification_user_id', $1, true)", [userId]);
    const before = await db.query<{ read_at: Date | string | null }>(
      'SELECT read_at FROM user_notifications WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId]);
    if (!before.rows[0]) throw new AppError('NOT_FOUND', { userMessage: 'Notification introuvable.' });
    const prior = before.rows[0].read_at;
    if ((prior === null) === read) {
      const changed = await db.query<{ read_at: Date | string | null }>(
        `UPDATE user_notifications SET read_at = ${read ? 'GREATEST(now(), created_at)' : 'NULL'}
         WHERE id = $1 AND user_id = $2 RETURNING read_at`, [id, userId]);
      await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
        VALUES ($1, 'notifications', $2, 'user_notification', $3::jsonb, $4::jsonb)`,
      [userId, read ? 'mark_read' : 'mark_unread', JSON.stringify({ notificationId: id, read: prior !== null }),
        JSON.stringify({ notificationId: id, read })]);
      const updated = changed.rows[0]?.read_at;
      return { readAt: updated ? new Date(updated).toISOString() : null };
    }
    return { readAt: prior ? new Date(prior).toISOString() : null };
  });
}
