/** Déconnecte toutes les autres sessions du compte dans une transaction auditée. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError } from '@/core/errors/app-error';

export async function revokeAllOtherSessions(token: string | undefined): Promise<{ revokedCount: number }> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  const hash = hashSessionToken(token);
  return withIdentityTransaction(async (db) => {
    // Verrouiller l'appareil courant : une autre requête ne peut pas le révoquer
    // entre la vérification de l'identité et la mutation des autres appareils.
    const auth = await db.query<{ user_id: string }>(
      `SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.status = 'active' FOR UPDATE OF s`, [hash]);
    const userId = auth.rows[0]?.user_id;
    if (!userId) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    const changed = await db.query<{ id: string }>(
      `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND token_hash <> $2
       AND revoked_at IS NULL AND expires_at > now() RETURNING id::text`, [userId, hash]);
    const revokedCount = changed.rows.length;
    // Aucun événement artificiel pour une requête idempotente sans changement.
    if (revokedCount > 0) await db.query(
      `INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
       VALUES ($1, 'auth', 'revoke_all_other_sessions', 'session', $2::jsonb, $3::jsonb)`,
      [userId, JSON.stringify({ activeOtherSessions: revokedCount }),
        JSON.stringify({ activeOtherSessions: 0, revokedCount })],
    );
    return { revokedCount };
  });
}
