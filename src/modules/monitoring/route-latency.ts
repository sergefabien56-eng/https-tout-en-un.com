/**
 * Latence réelle par route, agrégée par tranche de 5 minutes.
 *
 * Ce que ce module mesure : la durée d'exécution d'un gestionnaire de route API, côté serveur,
 * entre l'entrée dans le gestionnaire et l'écriture de la réponse. Ce qu'il ne mesure PAS :
 * le réseau du navigateur, le rendu, un temps d'attente perçu par l'utilisateur.
 *
 * Rien d'identifiant n'est enregistré : ni requête, ni en-tête, ni session, ni adresse.
 * Le chemin est normalisé (`/api/admin/users/[id]/status`) pour que chaque identifiant ne
 * crée pas sa propre ligne. Une route non déclarée dans `ROUTE_PERMISSIONS` n'est jamais
 * mesurée : la mesure suit la recette de couverture, pas une liste parallèle.
 */
import type { PoolClient } from 'pg';
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ROUTE_PERMISSIONS } from '@/core/auth/route-permissions';
import { withIdentityTransaction } from '@/core/db/client';

/** Tranche d'agrégation : 5 minutes, comme la fenêtre de lecture de l'écran. */
export const LATENCY_BUCKET_MS = 300_000;
/** Au-delà de ce seuil, un échantillon est compté « lent ». Sert d'indicateur, pas d'alerte. */
export const SLOW_SAMPLE_MS = 1_000;
/** Rétention de la mesure brute agrégée : 24 heures. Purge explicite, jamais implicite. */
export const LATENCY_RETENTION_MS = 86_400_000;
/** Fenêtre affichée par défaut : 60 minutes, soit 12 tranches. */
export const LATENCY_WINDOW_MS = 3_600_000;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Chemin normalisé d'une requête API, ou `null` si la route n'est pas déclarée. */
export function normalizeRoutePath(pathname: string): string | null {
  if (!pathname.startsWith('/api/')) return null;
  // Les segments dynamiques du code (`[id]`, `[shopId]`) sont remplacés par `[id]` :
  // une seule clé par route, quel que soit l'identifiant réel.
  const segments = pathname.slice('/api/'.length).split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;
  const declared = Object.keys(ROUTE_PERMISSIONS);
  // Un segment littéral l'emporte toujours sur un segment dynamique : sans cette priorité,
  // `/api/admin/users/export` serait compté comme `admin/users/[id]` et la mesure attribuerait
  // un export réel à la fiche d'un compte. Les statiques sont donc essayées d'abord.
  const matching = (route: string): boolean => {
    const knownSegments = route.split('/');
    if (knownSegments.length !== segments.length) return false;
    return knownSegments.every((known, index) => known.startsWith('[') || known === segments[index]);
  };
  const exact = declared.find((route) => route === segments.join('/'));
  if (exact) return exact;
  return declared.find(matching) ?? null;
}

/** Classe de statut retenue : 4 catégories, jamais le code exact (une précision inutile ici). */
export function statusClassOf(status: number): 2 | 3 | 4 | 5 | null {
  if (!Number.isInteger(status) || status < 100 || status > 599) return null;
  const klass = Math.floor(status / 100);
  return klass === 2 || klass === 3 || klass === 4 || klass === 5 ? klass : null;
}

export function bucketStartOf(now: Date): Date {
  return new Date(Math.floor(now.getTime() / LATENCY_BUCKET_MS) * LATENCY_BUCKET_MS);
}

export interface RouteLatencyAggregate {
  routeKey: string;
  method: HttpMethod;
  statusClass: 2 | 3 | 4 | 5;
  samples: number;
  /** Moyenne arrondie au millième de milliseconde, jamais une valeur inventée. */
  averageMs: number;
  maxMs: number;
  slowSamples: number;
  /** Part des échantillons lents, en pourcentage entier. */
  slowPercent: number;
  lastBucketStart: string;
}

export interface RouteLatencyReport {
  windowMinutes: number;
  windowStart: string;
  bucketMinutes: number;
  slowThresholdMs: number;
  /** Nombre total d'échantillons mesurés sur la fenêtre. */
  totalSamples: number;
  /** `true` seulement si au moins un échantillon existe : zéro mesuré n'est pas « aucun trafic ». */
  measured: boolean;
  routes: RouteLatencyAggregate[];
  limits: string;
}

/**
 * Enregistre un échantillon. Échec silencieux et volontaire : une mesure ne doit jamais
 * faire échouer la requête qu'elle mesure. Le plafond de rétention est appliqué ici,
 * à l'écriture, pour que la table ne grossisse pas indéfiniment sans tâche planifiée.
 */
export async function recordRouteLatency(input: {
  routeKey: string; method: HttpMethod; statusClass: 2 | 3 | 4 | 5;
  durationMs: number; now?: Date;
}): Promise<void> {
  const { routeKey, method, statusClass } = input;
  if (!(routeKey in ROUTE_PERMISSIONS)) throw new Error('Route non déclarée : mesure refusée.');
  const durationMs = Math.round(input.durationMs);
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 3_600_000)
    throw new Error('Durée de mesure invalide.');
  const bucketStart = bucketStartOf(input.now ?? new Date());
  await withIdentityTransaction(async (db) => {
    await db.query(
      `INSERT INTO route_latency (route_key, method, status_class, bucket_start, samples, total_ms, max_ms, slow_samples)
       VALUES ($1, $2, $3,
         to_timestamp(floor(extract(epoch FROM $4::timestamptz) / 300) * 300), 1, $5::bigint, $5::integer, $6::integer)
       ON CONFLICT (route_key, method, status_class, bucket_start) DO UPDATE SET
         samples = route_latency.samples + 1,
         total_ms = route_latency.total_ms + EXCLUDED.total_ms,
         max_ms = GREATEST(route_latency.max_ms, EXCLUDED.max_ms),
         slow_samples = route_latency.slow_samples + EXCLUDED.slow_samples`,
      [routeKey, method, statusClass, bucketStart, durationMs, durationMs >= SLOW_SAMPLE_MS ? 1 : 0]);
    // Purge bornée : une seule fenêtre de rétention, jamais de suppression en masse non mesurée.
    // Purge bornée, alignée sur la même tranche : la contrainte d'alignement reste vérifiée.
    await db.query(`DELETE FROM route_latency WHERE bucket_start <
      to_timestamp(floor(extract(epoch FROM $1::timestamptz) / 300) * 300)`,
      [new Date(bucketStart.getTime() - LATENCY_RETENTION_MS)]);
  });
}

/** Lecture agrégée sur une fenêtre glissante, réservée au Propriétaire via `system:manage`. */
export async function readRouteLatency(db: PoolClient, now: Date, windowMs = LATENCY_WINDOW_MS): Promise<RouteLatencyReport> {
  if (!Number.isSafeInteger(windowMs) || windowMs < LATENCY_BUCKET_MS || windowMs > LATENCY_RETENTION_MS)
    throw new Error('Fenêtre de latence invalide.');
  // Fenêtre glissante : on remonte de `windowMs` depuis l'instant présent, puis on aligne
  // la borne sur la tranche courante. Aligner sur la tranche PUIS reculer d'une tranche
  // entière écarterait à tort la tranche en cours (défaut trouvé par le test).
  const windowStart = new Date(Math.floor((now.getTime() - windowMs) / LATENCY_BUCKET_MS) * LATENCY_BUCKET_MS);
  // Borne haute explicite : une fenêtre close dans le passé ne doit pas ramasser les mesures
  // plus récentes (défaut vu par le test « zéro mesuré » — la requête n'avait qu'une borne basse).
  const windowEnd = new Date(Math.floor(now.getTime() / LATENCY_BUCKET_MS) * LATENCY_BUCKET_MS + LATENCY_BUCKET_MS);
  const result = await db.query<{
    route_key: string; method: HttpMethod; status_class: 2 | 3 | 4 | 5;
    samples: number; total_ms: string; max_ms: number; slow_samples: number; last_bucket: Date | string;
  }>(`SELECT route_key, method, status_class,
        sum(samples)::int AS samples,
        sum(total_ms)::bigint AS total_ms,
        max(max_ms)::int AS max_ms,
        sum(slow_samples)::int AS slow_samples,
        max(bucket_start) AS last_bucket
       FROM route_latency WHERE bucket_start >= $1 AND bucket_start < $2
      GROUP BY route_key, method, status_class
      ORDER BY sum(total_ms)::bigint DESC, route_key ASC, method ASC
      LIMIT 100`, [windowStart, windowEnd]);
  const routes: RouteLatencyAggregate[] = result.rows.map((row) => {
    const samples = Number(row.samples);
    const total = Number(row.total_ms);
    if (!Number.isSafeInteger(samples) || samples <= 0 || !Number.isFinite(total) || total < 0)
      throw new Error('Agrégat de latence incohérent.');
    return {
      routeKey: row.route_key, method: row.method, statusClass: row.status_class,
      samples,
      averageMs: Math.round((total / samples) * 1000) / 1000,
      maxMs: Number(row.max_ms),
      slowSamples: Number(row.slow_samples),
      slowPercent: Math.round((Number(row.slow_samples) / samples) * 100),
      lastBucketStart: new Date(row.last_bucket).toISOString(),
    };
  });
  const totalSamples = routes.reduce((sum, route) => sum + route.samples, 0);
  return {
    windowMinutes: Math.round(windowMs / 60_000),
    windowStart: windowStart.toISOString(),
    bucketMinutes: LATENCY_BUCKET_MS / 60_000,
    slowThresholdMs: SLOW_SAMPLE_MS,
    totalSamples,
    // Distinction centrale : aucune ligne n'est pas « tout va bien », c'est « rien n'a été mesuré ».
    measured: totalSamples > 0,
    routes,
    limits: 'Durée serveur du gestionnaire de route uniquement. Ni réseau, ni rendu, ni atteinte de la base. '
      + 'Rétention 24 h ; aucune requête, aucun identifiant, aucune adresse enregistrés.',
  };
}

export async function getRouteLatency(token: string | undefined, windowMs?: number): Promise<RouteLatencyReport> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' },
    (db) => readRouteLatency(db, new Date(), windowMs));
}
