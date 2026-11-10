/** Santé profonde accessible au Propriétaire, sans secret ni URL de base en sortie. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';

export interface DeepHealth {
  database: 'ok';
  migrationsApplied: number;
  checkedAt: string;
  queue: 'indisponible';
}

export async function getDeepHealth(token: string | undefined): Promise<DeepHealth> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, async (db) => {
    const result = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM schema_migrations');
    return { database: 'ok', migrationsApplied: result.rows[0]?.n ?? 0,
      checkedAt: new Date().toISOString(), queue: 'indisponible' };
  });
}
