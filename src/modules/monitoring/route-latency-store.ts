/**
 * Écriture et lecture des mesures de latence — SANS la chaîne d'authentification.
 *
 * Séparé de `route-latency.ts` volontairement : l'instrumentation du serveur ne doit tirer
 * que ce module. Quand elle importait `route-latency.ts`, elle embarquait `authorize-global`
 * → `primitives` → `argon2` → `node-gyp-build` → `fs`, que le bundle de développement ne
 * résout pas. Constaté : `/api/health` répondait **500** et Playwright expirait au démarrage.
 */
import { withIdentityTransaction } from '@/core/db/client';
import {
  LATENCY_BUCKET_MS, LATENCY_RETENTION_MS, SLOW_SAMPLE_MS, assertWritableRouteKey, bucketStartOf,
  type HttpMethod,
} from '@/modules/monitoring/route-paths';
import { MAX_BUFFERED_SAMPLES, decideSamples, type RawLatencySample } from '@/modules/monitoring/instrument-routes';

export interface RouteLatencyAggregate {
  routeKey: string;
  method: HttpMethod;
  statusClass: 2 | 3 | 4 | 5;
  samples: number;
  averageMs: number;
  maxMs: number;
  slowSamples: number;
  slowPercent: number;
  lastBucketStart: string;
}

export interface RouteLatencyReport {
  windowMinutes: number;
  windowStart: string;
  bucketMinutes: number;
  slowThresholdMs: number;
  totalSamples: number;
  /** `true` seulement si au moins un échantillon existe : zéro mesuré n'est pas « rien ». */
  measured: boolean;
  routes: RouteLatencyAggregate[];
  limits: string;
}

/**
 * Enregistre un échantillon. Échec silencieux et volontaire : une mesure ne doit jamais
 * faire échouer la requête qu'elle mesure. La purge de rétention est faite ici, à l'écriture,
 * pour que la table ne grossisse pas indéfiniment sans tâche planifiée.
 */
export async function recordRouteLatency(input: {
  routeKey: string; method: HttpMethod; statusClass: 2 | 3 | 4 | 5;
  durationMs: number; now?: Date;
}): Promise<void> {
  // Refus explicites AVANT toute écriture : une mesure fausse en base est pire qu'une mesure
  // manquante, parce qu'elle est ensuite affichée comme un fait.
  assertWritableRouteKey(input.routeKey);
  const durationMs = Math.round(input.durationMs);
  if (!Number.isFinite(input.durationMs) || durationMs < 0 || durationMs > 3_600_000)
    throw new Error('Durée de mesure invalide.');
  const bucketStart = bucketStartOf(input.now ?? new Date());
  await withIdentityTransaction(async (db) => {
    await db.query(
      `INSERT INTO route_latency (route_key, method, status_class, bucket_start, started_at, samples, total_ms, max_ms, slow_samples)
       VALUES ($1, $2, $3,
         to_timestamp(floor(extract(epoch FROM $4::timestamptz) / 300) * 300), $4::timestamptz,
         1, $5::bigint, $5::integer, $6::integer)
       ON CONFLICT (route_key, method, status_class, bucket_start) DO UPDATE SET
         samples = route_latency.samples + 1,
         total_ms = route_latency.total_ms + EXCLUDED.total_ms,
         max_ms = GREATEST(route_latency.max_ms, EXCLUDED.max_ms),
         slow_samples = route_latency.slow_samples + EXCLUDED.slow_samples`,
      [input.routeKey, input.method, input.statusClass, bucketStart, durationMs,
        durationMs >= SLOW_SAMPLE_MS ? 1 : 0]);
    // Purge de rétention sur l'instant réel, pas sur la tranche : une tranche à cheval sur la
    // limite ne doit pas survivre 5 minutes de trop, ni disparaître trop tôt.
    await db.query('DELETE FROM route_latency WHERE started_at < $1',
    [new Date(bucketStart.getTime() - LATENCY_RETENTION_MS)]);
  });
}

/** Lecture agrégée sur une fenêtre glissante et bornée. Aucun identifiant n'en sort. */
export async function readRouteLatencyRows(now: Date, windowMs: number): Promise<RouteLatencyReport> {
  if (!Number.isSafeInteger(windowMs) || windowMs < LATENCY_BUCKET_MS || windowMs > LATENCY_RETENTION_MS)
    throw new Error('Fenêtre de latence invalide.');
  // Fenêtre exacte, non alignée sur les tranches : une tranche de 5 minutes en cours n'est pas
  // terminée, et l'aligner ferait disparaître les mesures des dernières minutes.
  const windowStart = new Date(now.getTime() - windowMs);
  // Borne haute explicite : une fenêtre close dans le passé ne doit pas ramasser les mesures
  // plus récentes (défaut trouvé par le test « zéro mesuré »).
  const windowEnd = now;
  return withIdentityTransaction(async (db) => {
    const result = await db.query<{
      route_key: string; method: HttpMethod; status_class: 2 | 3 | 4 | 5;
      samples: number; total_ms: string; max_ms: number; slow_samples: number; last_bucket: Date | string;
    }>(`SELECT route_key, method, status_class,
          sum(samples)::int AS samples, sum(total_ms)::bigint AS total_ms,
          max(max_ms)::int AS max_ms, sum(slow_samples)::int AS slow_samples,
          max(bucket_start) AS last_bucket
         FROM route_latency WHERE started_at >= $1 AND started_at < $2
        GROUP BY route_key, method, status_class
        ORDER BY sum(total_ms)::bigint DESC, route_key ASC, method ASC
        LIMIT 100`, [windowStart, windowEnd]);
    const routes: RouteLatencyAggregate[] = result.rows.map((row) => {
      const samples = Number(row.samples);
      const total = Number(row.total_ms);
      if (!Number.isSafeInteger(samples) || samples <= 0 || !Number.isFinite(total) || total < 0)
        throw new Error('Agrégat de latence incohérent.');
      return {
        routeKey: row.route_key, method: row.method, statusClass: row.status_class, samples,
        averageMs: Math.round((total / samples) * 1000) / 1000,
        maxMs: Number(row.max_ms), slowSamples: Number(row.slow_samples),
        slowPercent: Math.round((Number(row.slow_samples) / samples) * 100),
        lastBucketStart: new Date(row.last_bucket).toISOString(),
      };
    });
    const totalSamples = routes.reduce((sum, route) => sum + route.samples, 0);
    return {
      windowMinutes: Math.round(windowMs / 60_000), windowStart: windowStart.toISOString(),
      bucketMinutes: LATENCY_BUCKET_MS / 60_000, slowThresholdMs: SLOW_SAMPLE_MS, totalSamples,
      measured: totalSamples > 0, routes,
      limits: 'Durée serveur du gestionnaire de route uniquement. Ni réseau, ni rendu, ni atteinte de la base. '
        + 'Rétention 24 h ; aucune requête, aucun identifiant, aucune adresse enregistrés. '
        + 'Mesure armée en production uniquement : le serveur de développement de Next ne '
        + 'compile pas l’instrumentation (contrainte constatée, voir instrumentation.ts).',
    };
  });
}

/**
 * Clé du tampon global : le crochet `scripts/latency-hook.mjs` (hors bundle, JavaScript pur)
 * y dépose les requêtes observées. `Symbol.for` garantit que les deux côtés — crochet et
 * application — désignent le même objet sans jamais s'importer l'un l'autre.
 */
const BUFFER_KEY = Symbol.for('toutenun.latency.buffer');

/** Échantillons bruts en attente, et vidage atomique : l'appelant écrit ce qu'il a pris. */
export function drainRawSamples(): RawLatencySample[] {
  const buffer = (globalThis as Record<symbol, RawLatencySample[] | undefined>)[BUFFER_KEY];
  if (!Array.isArray(buffer) || buffer.length === 0) return [];
  return buffer.splice(0, MAX_BUFFERED_SAMPLES);
}

/**
 * Écrit les mesures constatées par le crochet. Le crochet ne parle pas à la base et ne peut
 * pas le faire : c'est l'application (écran Système, lecture des mesures) qui déclenche
 * l'écriture. Un échec d'écriture perd des mesures, jamais une requête.
 */
export async function flushRouteLatency(): Promise<number> {
  const samples = decideSamples(drainRawSamples());
  if (samples.length === 0) return 0;
  let written = 0;
  for (const sample of samples) {
    try {
      await recordRouteLatency(sample);
      written += 1;
    } catch {
      // Échantillon perdu, jamais d'exception remontée à l'appelant.
    }
  }
  return written;
}
