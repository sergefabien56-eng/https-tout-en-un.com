/** Santé profonde accessible au Propriétaire, sans secret ni URL de base en sortie. */
import { performance } from 'node:perf_hooks';
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { appConfig, type Environment } from '@/core/config/app.config';

export interface DeepHealth {
  version: string;
  environment: Environment;
  database: 'ok';
  /** Durée de la requête migrations, et non durée totale de l'authentification. */
  databaseQueryMs: number;
  migrationsApplied: number;
  checkedAt: string;
  queue: 'indisponible';
}

export async function getDeepHealth(token: string | undefined): Promise<DeepHealth> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, async (db) => {
    const start = performance.now();
    const result = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM schema_migrations');
    const databaseQueryMs = Math.max(0, Math.round(performance.now() - start));
    return { version: appConfig.version, environment: appConfig.environment,
      database: 'ok', databaseQueryMs, migrationsApplied: result.rows[0]?.n ?? 0,
      checkedAt: new Date().toISOString(), queue: 'indisponible' };
  });
}
