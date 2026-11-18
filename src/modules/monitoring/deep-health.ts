/** Santé profonde accessible au Propriétaire, sans secret ni URL de base en sortie. */
import { performance } from 'node:perf_hooks';
import type { PoolClient } from 'pg';
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { appConfig, type Environment } from '@/core/config/app.config';

/** Fenêtre de limitation de la connexion : 15 minutes, comme dans `login()`. */
const LOGIN_WINDOW_MS = 900_000;

export interface QueueSnapshot {
  /** Nombre de seaux de limitation actifs sur la fenêtre en cours. */
  activeBuckets: number;
  /** Somme des tentatives comptées sur la fenêtre en cours. */
  attemptsInWindow: number;
  windowStart: string;
  windowMinutes: number;
  /** Le plafond réellement appliqué par `login()` : au-delà, la connexion est refusée. */
  attemptsLimit: number;
  /** Nombre de seaux ayant atteint le plafond : ces adresses sont bloquées. */
  bucketsAtLimit: number;
  /** Un seau est une empreinte, jamais une adresse e-mail en clair. */
  keyKind: 'empreinte';
  /** Ce que ce compteur n'est PAS. */
  limits: string;
}

export interface DeepHealth {
  version: string;
  environment: Environment;
  database: 'ok';
  /** Durée de la requête migrations, et non durée totale de l'authentification. */
  databaseQueryMs: number;
  migrationsApplied: number;
  checkedAt: string;
  /** `null` = aucune file de tâches : le worker n'existe pas encore. */
  queue: QueueSnapshot | null;
  /** Indisponibles tant que la RLS interdit la lecture globale sans contexte boutique. */
  globalEventsRecorded: number | null;
  globalCriticalOpen: number | null;
  globalWarningsOpen: number | null;
}

/**
 * File de limitation de connexion, lue sans secret.
 *
 * `rate_limits` n'est pas vide par hasard : `login()` y écrit une ligne par seau
 * (empreinte de l'adresse e-mail) et par fenêtre. Ce n'est pas une file de tâches
 * au sens d'un worker, et l'écran doit le dire. Seules des valeurs agrégées et
 * l'horodatage de fenêtre sortent : aucune empreinte, aucune adresse.
 */
export async function readQueueSnapshot(db: PoolClient, now: Date): Promise<QueueSnapshot> {
  const windowStart = new Date(Math.floor(now.getTime() / LOGIN_WINDOW_MS) * LOGIN_WINDOW_MS);
  const result = await db.query<{ active: number; attempts: number; at_limit: number }>(
    `SELECT count(*)::int AS active,
            COALESCE(sum(count), 0)::int AS attempts,
            count(*) FILTER (WHERE count > 10)::int AS at_limit
       FROM rate_limits
      WHERE bucket = 'login-email' AND window_start = $1`, [windowStart]);
  const row = result.rows[0];
  if (!row || ![row.active, row.attempts, row.at_limit].every((n) => Number.isSafeInteger(n) && n >= 0))
    throw new Error('Lecture de la file de limitation indisponible.');
  return { activeBuckets: row.active, attemptsInWindow: row.attempts,
    windowStart: windowStart.toISOString(), windowMinutes: LOGIN_WINDOW_MS / 60_000,
    attemptsLimit: 10, bucketsAtLimit: row.at_limit, keyKind: 'empreinte',
    limits: 'Limitation de connexion uniquement : aucun worker, aucune tâche planifiée, aucune reprise.' };
}

export async function readDeepHealth(db: PoolClient): Promise<DeepHealth> {
  const start = performance.now();
  const result = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM schema_migrations');
  const databaseQueryMs = Math.max(0, Math.round(performance.now() - start));
  const migrationsApplied = result.rows[0]?.n;
  if (!Number.isSafeInteger(migrationsApplied) || migrationsApplied === undefined || migrationsApplied < 0)
    throw new Error('Comptage des migrations indisponible.');
  const queue = await readQueueSnapshot(db, new Date());
  // La policy RLS exige un contexte boutique même pour les événements globaux.
  // Un COUNT sans contexte retourne 0 alors que des lignes peuvent exister :
  // ne pas contourner la RLS, ni présenter ce zéro trompeur comme une mesure.
  return { version: appConfig.version, environment: appConfig.environment,
    database: 'ok', databaseQueryMs, migrationsApplied,
    checkedAt: new Date().toISOString(), queue,
    globalEventsRecorded: null, globalCriticalOpen: null, globalWarningsOpen: null };
}

export async function getDeepHealth(token: string | undefined): Promise<DeepHealth> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, readDeepHealth);
}
