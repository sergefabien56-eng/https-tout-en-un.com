/**
 * Latence réelle par route — façade autorisée.
 *
 * Le calcul et l'accès base vivent dans `route-latency-store.ts`, la normalisation dans
 * `route-paths.ts`. Ce fichier n'ajoute que l'autorisation : lecture réservée au Propriétaire.
 * Cette séparation existe pour une raison mesurée : l'instrumentation du serveur ne doit
 * jamais tirer la chaîne d'authentification (`argon2`), sinon le serveur de développement
 * répond 500 et Playwright expire.
 */
import type { PoolClient } from 'pg';
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { LATENCY_WINDOW_MS } from '@/modules/monitoring/route-paths';
import { readRouteLatencyRows, type RouteLatencyReport } from '@/modules/monitoring/route-latency-store';

export {
  LATENCY_BUCKET_MS, LATENCY_RETENTION_MS, LATENCY_WINDOW_MS, SLOW_SAMPLE_MS,
  bucketStartOf, normalizeRoutePath, statusClassOf,
} from '@/modules/monitoring/route-paths';
export type { HttpMethod } from '@/modules/monitoring/route-paths';
export { readRouteLatencyRows, recordRouteLatency } from '@/modules/monitoring/route-latency-store';
export type { RouteLatencyAggregate, RouteLatencyReport } from '@/modules/monitoring/route-latency-store';

/** Lecture agrégée sur une fenêtre glissante, réservée au Propriétaire via `system:manage`. */
export async function readRouteLatency(_db: PoolClient, now: Date, windowMs = LATENCY_WINDOW_MS): Promise<RouteLatencyReport> {
  return readRouteLatencyRows(now, windowMs);
}

export async function getRouteLatency(token: string | undefined, windowMs?: number): Promise<RouteLatencyReport> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' },
    () => readRouteLatencyRows(new Date(), windowMs ?? LATENCY_WINDOW_MS));
}
