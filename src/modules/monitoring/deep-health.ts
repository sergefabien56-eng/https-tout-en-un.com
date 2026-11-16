/** Santé profonde accessible au Propriétaire, sans secret ni URL de base en sortie. */
import { performance } from 'node:perf_hooks';
import type { PoolClient } from 'pg';
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
  /** Indisponibles tant que la RLS interdit la lecture globale sans contexte boutique. */
  globalEventsRecorded: number | null;
  globalCriticalOpen: number | null;
  globalWarningsOpen: number | null;
}

export async function readDeepHealth(db: PoolClient): Promise<DeepHealth> {
  const start = performance.now();
  const result = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM schema_migrations');
  const databaseQueryMs = Math.max(0, Math.round(performance.now() - start));
  const migrationsApplied = result.rows[0]?.n;
  if (!Number.isSafeInteger(migrationsApplied) || migrationsApplied === undefined || migrationsApplied < 0)
    throw new Error('Comptage des migrations indisponible.');
  // La policy RLS exige un contexte boutique même pour les événements globaux.
  // Un COUNT sans contexte retourne 0 alors que des lignes peuvent exister :
  // ne pas contourner la RLS, ni présenter ce zéro trompeur comme une mesure.
  return { version: appConfig.version, environment: appConfig.environment,
    database: 'ok', databaseQueryMs, migrationsApplied,
    checkedAt: new Date().toISOString(), queue: 'indisponible',
    globalEventsRecorded: null, globalCriticalOpen: null, globalWarningsOpen: null };
}

export async function getDeepHealth(token: string | undefined): Promise<DeepHealth> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, readDeepHealth);
}
