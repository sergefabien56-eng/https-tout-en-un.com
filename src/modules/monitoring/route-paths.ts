/**
 * Chemins d'API mesurables — module volontairement SANS aucune dépendance.
 *
 * Pourquoi séparé : l'instrumentation est chargée dans le bundle du serveur de développement.
 * Quand la normalisation vivait dans `route-latency.ts`, l'instrumentation tirait avec elle
 * `authorize-global` → `primitives` → `argon2` → `node-gyp-build` → `fs`, ce que le bundle de
 * développement ne sait pas résoudre. Résultat mesuré : `/api/health` répondait **500** en
 * boucle et Playwright expirait au démarrage du serveur (`Timed out waiting 90000ms`).
 * Ce module ne contient que des constantes et des calculs purs : rien à résoudre.
 */
import { ROUTE_PERMISSIONS } from '@/core/auth/route-permissions';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Tranche d'agrégation : 5 minutes, comme la fenêtre de lecture de l'écran. */
export const LATENCY_BUCKET_MS = 300_000;
/** Au-delà de ce seuil, un échantillon est compté « lent ». Indicateur, jamais une alerte. */
export const SLOW_SAMPLE_MS = 1_000;
/** Rétention de la mesure agrégée : 24 heures. Purge explicite à l'écriture. */
export const LATENCY_RETENTION_MS = 86_400_000;
/** Fenêtre affichée par défaut : 60 minutes, soit 12 tranches. */
export const LATENCY_WINDOW_MS = 3_600_000;

/** Chemin normalisé d'une requête API, ou `null` si la route n'est pas déclarée. */
export function normalizeRoutePath(pathname: string): string | null {
  if (!pathname.startsWith('/api/')) return null;
  const segments = pathname.slice('/api/'.length).split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;
  const declared = Object.keys(ROUTE_PERMISSIONS);
  // Un segment littéral l'emporte toujours sur un segment dynamique : sans cette priorité,
  // `/api/admin/users/export` serait compté comme `admin/users/[id]` et la mesure attribuerait
  // un export réel à la fiche d'un compte. Les statiques sont donc essayées d'abord.
  const exact = declared.find((route) => route === segments.join('/'));
  if (exact) return exact;
  return declared.find((route) => {
    const knownSegments = route.split('/');
    if (knownSegments.length !== segments.length) return false;
    return knownSegments.every((known, index) => known.startsWith('[') || known === segments[index]);
  }) ?? null;
}

/** Classe de statut retenue : 4 catégories, jamais le code exact (précision inutile ici). */
export function statusClassOf(status: number): 2 | 3 | 4 | 5 | null {
  if (!Number.isInteger(status) || status < 100 || status > 599) return null;
  const klass = Math.floor(status / 100);
  return klass === 2 || klass === 3 || klass === 4 || klass === 5 ? klass : null;
}

export function bucketStartOf(now: Date): Date {
  return new Date(Math.floor(now.getTime() / LATENCY_BUCKET_MS) * LATENCY_BUCKET_MS);
}
