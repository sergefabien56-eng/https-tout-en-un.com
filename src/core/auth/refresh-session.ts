/** Renouvellement serveur d'une session active uniquement, sous verrou transactionnel. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError } from '@/core/errors/app-error';

export async function refreshSession(token: string | undefined): Promise<Date> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  return withIdentityTransaction(async (db) => {
    const current = await db.query<{ id: string; expires_at: Date | string; last_seen_at: Date | string }>(
      `SELECT s.id, s.expires_at, s.last_seen_at FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1
       AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'
       FOR UPDATE OF s`, [hashSessionToken(token)],
    );
    const session = current.rows[0];
    if (!session) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    // Une seule écriture au plus toutes les 5 minutes ; le cookie suit la date EN BASE,
    // sans allonger artificiellement la durée d'une session non renouvelée.
    const refreshed = await db.query<{ expires_at: Date | string }>(
      `UPDATE sessions SET last_seen_at = now(), expires_at = now() + interval '12 hours'
       WHERE id = $1 AND last_seen_at <= now() - interval '5 minutes'
       RETURNING expires_at`, [session.id],
    );
    return new Date(refreshed.rows[0]?.expires_at ?? session.expires_at);
  });
}
