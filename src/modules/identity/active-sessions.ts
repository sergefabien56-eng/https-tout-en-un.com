/** Sessions du compte courant : jamais de jeton ou empreinte en réponse. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError } from '@/core/errors/app-error';

export interface SessionSummary {
  id: string;
  current: boolean;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export async function listOwnSessions(token: string | undefined): Promise<SessionSummary[]> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  }
  const hash = hashSessionToken(token);
  return withIdentityTransaction(async (db) => {
    const auth = await db.query<{ user_id: string }>(
      `SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.status = 'active'`, [hash],
    );
    const userId = auth.rows[0]?.user_id;
    if (!userId) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    const rows = await db.query<{
      id: string; current: boolean; user_agent: string | null;
      created_at: Date | string; last_seen_at: Date | string; expires_at: Date | string;
    }>(`SELECT id::text, (token_hash = $2) AS current, user_agent,
       created_at, last_seen_at, expires_at FROM sessions
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC, id DESC LIMIT 100`, [userId, hash]);
    // Le User-Agent est contrôlé par le navigateur et peut contenir des chaînes hostiles.
    // Pas de présentation de la valeur brute ni d'envoi d'IP / d'empreinte au client.
    return rows.rows.map((row) => ({ id: String(row.id), current: row.current,
      device: row.user_agent ? 'Navigateur' : 'Appareil non identifié',
      createdAt: new Date(row.created_at).toISOString(),
      lastSeenAt: new Date(row.last_seen_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString() }));
  });
}
