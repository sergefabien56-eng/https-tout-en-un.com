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
  /** Uniquement les lignes globales déjà enregistrées ; pas une mesure de disponibilité. */
  globalEventsRecorded: number;
  globalCriticalOpen: number;
  globalWarningsOpen: number;
}

export async function getDeepHealth(token: string | undefined): Promise<DeepHealth> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, async (db) => {
    const start = performance.now();
    const result = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM schema_migrations');
    const databaseQueryMs = Math.max(0, Math.round(performance.now() - start));
    // Cette transaction d'identité n'a aucun app.shop_id : les politiques RLS
    // cachent les événements boutique. Le WHERE explicite interdit tout mélange.
    const events = await db.query<{
      total: number; critical: number; warnings: number;
    }>(`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE severity = 'critical' AND acknowledged_at IS NULL)::int AS critical,
        count(*) FILTER (WHERE severity = 'warning' AND acknowledged_at IS NULL)::int AS warnings
      FROM system_events WHERE shop_id IS NULL`);
    return { version: appConfig.version, environment: appConfig.environment,
      database: 'ok', databaseQueryMs, migrationsApplied: result.rows[0]?.n ?? 0,
      checkedAt: new Date().toISOString(), queue: 'indisponible',
      globalEventsRecorded: events.rows[0]?.total ?? 0,
      globalCriticalOpen: events.rows[0]?.critical ?? 0,
      globalWarningsOpen: events.rows[0]?.warnings ?? 0 };
  });
}
