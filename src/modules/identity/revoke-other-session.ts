/** Révoque uniquement une autre session active du compte courant, avec audit atomique. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError, ValidationError } from '@/core/errors/app-error';

export async function revokeOtherSession(token: string | undefined, id: string): Promise<void> {
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9_223_372_036_854_775_807n)
    throw new ValidationError('Session invalide.');
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  const hash = hashSessionToken(token);
  await withIdentityTransaction(async (db) => {
    const auth = await db.query<{ user_id: string }>(
      `SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.status = 'active'`, [hash]);
    const userId = auth.rows[0]?.user_id;
    if (!userId) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    // ID borné au même compte ; la session courante ne peut pas être révoquée par cette route.
    const changed = await db.query<{ id: string }>(
      `UPDATE sessions SET revoked_at = now() WHERE id = $1 AND user_id = $2
       AND token_hash <> $3 AND revoked_at IS NULL AND expires_at > now()
       RETURNING id::text`, [id, userId, hash]);
    if (!changed.rows[0]) throw new AppError('NOT_FOUND', { userMessage: 'Session introuvable.' });
    await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
       VALUES ($1, 'auth', 'revoke_other_session', 'session', $2::jsonb, $3::jsonb)`,
    [userId, JSON.stringify({ sessionId: id, active: true }), JSON.stringify({ sessionId: id, active: false })]);
  });
}
