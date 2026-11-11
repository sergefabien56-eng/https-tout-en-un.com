/** Compteur plafonné pour la barre supérieure ; seul le compte authentifié est visible. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError } from '@/core/errors/app-error';

/** 100 signifie « 99+ » ; aucun total exhaustif inutile n'est transféré à l'UI. */
export async function countOwnUnreadBadge(token: string | undefined): Promise<number> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  return withIdentityTransaction(async (db) => {
    const auth = await db.query<{ user_id: string }>(`SELECT s.user_id FROM sessions s
      JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1
      AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`, [hashSessionToken(token)]);
    const userId = auth.rows[0]?.user_id;
    if (!userId) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    await db.query("SELECT set_config('app.notification_user_id', $1, true)", [userId]);
    const rows = await db.query<{ n: number }>(`SELECT LEAST(count(*), 100)::int AS n
      FROM user_notifications WHERE user_id = $1 AND read_at IS NULL`, [userId]);
    return rows.rows[0]?.n ?? 0;
  });
}
