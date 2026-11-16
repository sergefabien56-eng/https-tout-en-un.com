/** Accord individuel sur l'annuaire global : propriétaire seulement, aucune boutique ajoutée. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';
import type { PoolClient } from 'pg';
async function requireOwner(db: PoolClient, userId: string) {
  const result = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code='owner' AND shop_id IS NULL
  ) AS allowed`, [userId]);
  if (!result.rows[0]?.allowed) throw new ForbiddenError('Seul le Propriétaire peut gérer l’accès individuel à l’annuaire.');
}
function validateId(id: string) {
  if (!/^[1-9]\d{0,17}$/.test(id)) throw new ValidationError('Utilisateur invalide.');
}
export async function readDirectoryAccess(token: string | undefined, id: string): Promise<boolean> {
  validateId(id);
  return withAuthorizedGlobalTransaction({ token, permission: 'roles:manage' }, async (db, { userId }) => {
    await requireOwner(db, userId);
    const result = await db.query('SELECT user_id FROM user_directory_access WHERE user_id=$1', [id]);
    return !!result.rowCount;
  });
}
export async function manageDirectoryAccess(input: { token: string | undefined; id: string; expected: unknown; granted: unknown }) {
  validateId(input.id);
  if (typeof input.expected !== 'boolean' || typeof input.granted !== 'boolean') throw new ValidationError('Choix invalide.');
  const expected = input.expected, granted = input.granted;
  return withAuthorizedGlobalTransaction({ token: input.token, permission: 'roles:manage' }, async (db, { userId }) => {
    await requireOwner(db, userId);
    if (userId === input.id) throw new ForbiddenError('Votre propre accès est protégé.');
    const target = await db.query<{ status: string }>('SELECT status FROM users WHERE id=$1 FOR UPDATE', [input.id]);
    if (!target.rows[0]) throw new AppError('NOT_FOUND', { userMessage: 'Utilisateur introuvable.' });
    const owner = await db.query<{ allowed: boolean }>("SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code='owner') AS allowed", [input.id]);
    if (owner.rows[0]?.allowed) throw new ForbiddenError('Le compte Propriétaire est protégé.');
    if (target.rows[0].status === 'invited' && granted) throw new AppError('CONFLICT', { userMessage: 'Les invitations ne sont pas gérées ici.' });
    const current = await db.query('SELECT user_id FROM user_directory_access WHERE user_id=$1', [input.id]);
    const before = !!current.rowCount;
    if (before !== expected) throw new AppError('CONFLICT', { userMessage: 'L’accès a changé. Actualisez la page.' });
    if (before !== granted) {
      if (granted) await db.query('INSERT INTO user_directory_access (user_id, granted_by) VALUES ($1,$2)', [input.id, userId]);
      else await db.query('DELETE FROM user_directory_access WHERE user_id=$1', [input.id]);
      await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [userId]);
      await db.query(`INSERT INTO audit_log (actor_user_id,module,action,entity_type,before,after)
        VALUES ($1,'users','manage_directory_access','directory_access',$2::jsonb,$3::jsonb)`,
      [userId, JSON.stringify({ userId: input.id, granted: before }), JSON.stringify({ userId: input.id, granted })]);
    }
    return { userId: input.id, granted, changed: before !== granted };
  });
}
