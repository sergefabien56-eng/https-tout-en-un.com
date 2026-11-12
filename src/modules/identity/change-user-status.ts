/** Suspendre/réactiver un compte existant, sans toucher aux invitations ni aux propriétaires. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';

export type ManagedStatus = 'active' | 'suspended';
export function parseManagedStatus(value: unknown): ManagedStatus {
  if (value !== 'active' && value !== 'suspended') throw new ValidationError('Statut invalide.');
  return value;
}

export async function changeUserStatus(token: string | undefined, id: string, requested: unknown): Promise<{
  id: string; status: ManagedStatus; changed: boolean;
}> {
  if (!/^[1-9]\d{0,17}$/.test(id)) throw new ValidationError('Identifiant invalide.');
  const status = parseManagedStatus(requested);
  return withAuthorizedGlobalTransaction({ token, permission: 'users:write' }, async (db, ctx) => {
    if (ctx.userId === id) throw new ForbiddenError('Impossible de modifier votre propre statut.');
    // Verrouillage du compte avant le test de rôle et la mutation : aucun état partiel.
    const target = await db.query<{ status: string }>('SELECT status FROM users WHERE id = $1 FOR UPDATE', [id]);
    const previous = target.rows[0]?.status;
    if (!previous) throw new AppError('NOT_FOUND', { userMessage: 'Utilisateur introuvable.' });
    const roles = await db.query<{ owner: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner'
    ) AS owner`, [id]);
    if (roles.rows[0]?.owner) throw new ForbiddenError('Le statut d’un Propriétaire ne peut pas être modifié ici.');
    if (previous === 'invited') throw new AppError('CONFLICT', { userMessage: 'Une invitation ne peut pas être activée ou suspendue ici.' });
    if (previous === status) return { id, status, changed: false };
    await db.query('UPDATE users SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
    if (status === 'suspended') await db.query(`UPDATE sessions SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`, [id]);
    await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
      VALUES ($1, 'users', 'change_status', 'user', $2::jsonb, $3::jsonb)`,
    [ctx.userId, JSON.stringify({ userId: id, status: previous }), JSON.stringify({ userId: id, status })]);
    return { id, status, changed: true };
  });
}
