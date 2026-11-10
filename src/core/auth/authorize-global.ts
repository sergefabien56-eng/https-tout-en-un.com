/** Opérations globales : un rôle limité à une boutique NE donne aucun droit global. */
import type { PoolClient } from 'pg';
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError, ForbiddenError } from '@/core/errors/app-error';

export interface GlobalContext { readonly userId: string }

export async function withAuthorizedGlobalTransaction<T>(
  input: { token: string | undefined; permission: string },
  task: (db: PoolClient, context: GlobalContext) => Promise<T>,
): Promise<T> {
  if (!input.token || !/^[A-Za-z0-9_-]{43}$/.test(input.token)) {
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  }
  return withIdentityTransaction(async (db) => {
    const result = await db.query<{ user_id: string }>(
      `SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL
         AND s.expires_at > now() AND u.status = 'active'`,
      [hashSessionToken(input.token!)],
    );
    const row = result.rows[0];
    if (!row) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    const userId = String(row.user_id);
    const grant = await db.query<{ allowed: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON rp.role_code = ur.role_code
        WHERE ur.user_id = $1 AND ur.shop_id IS NULL AND rp.permission_code = $2
      ) AS allowed`, [userId, input.permission],
    );
    if (!grant.rows[0]?.allowed) throw new ForbiddenError('Action non autorisée.');
    return task(db, { userId });
  });
}
