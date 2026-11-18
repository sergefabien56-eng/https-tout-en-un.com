import { statusClassOf, type HttpMethod } from '@/modules/monitoring/route-paths';
import { ROUTE_PERMISSIONS } from '@/core/auth/route-permissions';

/**
 * Politique de mesure des routes API — décision pure, testée, sans aucun effet de bord.
 *
 * L'installation effective sur le serveur HTTP vit dans `scripts/latency-hook.mjs`, en
 * JavaScript pur, chargé hors du bundle. La raison est mesurée, pas théorique : ce fichier
 * est importé par `src/instrumentation.ts`, que Next compile **deux fois** (runtimes nodejs et
 * edge). Toute référence à `node:http` ou à `pg` depuis ce graphe fait échouer la compilation
 * edge, et TOUTES les routes répondent alors 500 en `next dev` — la CI expire au démarrage
 * du serveur Playwright (run 44320835442).
 *
 * Historique des tentatives, pour ne pas les refaire : import statique de `node:http` (échec
 * `UnhandledSchemeError`), `import()` littéral (même échec), `import()` variable (webpack
 * « Critical dependency » qui casse l'exécution), import statique du magasin `pg` (échec
 * `Can't resolve 'fs'`). Seul un fichier non compilé, chargé par `webpackIgnore`, passe.
 */

/** Méthodes suivies. Les autres (HEAD, OPTIONS, TRACE) ne sont pas mesurées. */
export const MEASURED_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Plafond du tampon mémoire : une mesure ne doit jamais consommer de mémoire sans limite. */
export const MAX_BUFFERED_SAMPLES = 500;

/** Échantillon brut tel que le crochet `.mjs` le dépose (aucune interprétation à ce stade). */
export interface RawLatencySample {
  url: string; method: string; statusCode: number; durationMs: number;
}

/** Échantillon validé et normalisé, prêt à être écrit par le magasin. */
export interface LatencySample {
  routeKey: string; method: HttpMethod; statusClass: 2 | 3 | 4 | 5; durationMs: number;
}

/**
 * Chemins d'API déclarés, avec leurs segments dynamiques : `shops/[shopId]/members`.
 *
 * Construit à partir de `ROUTE_PERMISSIONS`, qui est une simple constante : ce module reste
 * donc sans dépendance native et peut être importé par l'instrumentation (voir l'historique
 * ci-dessus). Le faire était nécessaire : `route-paths.ts` importe `AppError`, qui n'existe
 * pas dans le bundle de l'instrumentation ; l'import levait au chargement et l'écriture des
 * mesures ne partait jamais — incident mesuré en CI le 18/11 (écran Système sans la route
 * `/api/health/deep` pourtant appelée juste avant).
 */
const DECLARED_PATHS = Object.keys(ROUTE_PERMISSIONS).map((route) => route.split('/'));

/** Chemin normalisé d'une requête API, ou `null` si la route n'est pas déclarée. */
export function normalizeRoutePath(pathname: string): string | null {
  if (!pathname.startsWith('/api/')) return null;
  const segments = pathname.slice('/api/'.length).split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;
  // Un segment littéral l'emporte toujours sur un segment dynamique : sans cette priorité,
  // `/api/admin/users/export` serait compté comme `admin/users/[id]` et la mesure attribuerait
  // un export réel à la fiche d'un compte. Les statiques sont donc essayées d'abord.
  const exact = DECLARED_PATHS.find((known) => known.every((part, index) => part === segments[index])
    && known.length === segments.length);
  if (exact) return exact.join('/');
  const dynamic = DECLARED_PATHS.find((known) => known.length === segments.length
    && known.every((part, index) => part.startsWith('[') || part === segments[index]));
  return dynamic ? dynamic.join('/') : null;
}

/**
 * Décide si une requête est mesurable et sous quelle clé. Renvoie `null` plutôt que de lever :
 * une page ou une route non déclarée n'est pas une erreur, c'est une non-mesure.
 */
export function decideSample(raw: RawLatencySample): LatencySample | null {
  const routeKey = normalizeRoutePath((raw.url ?? '').split('?')[0] ?? '');
  if (!routeKey) return null;
  if (!MEASURED_METHODS.includes(raw.method as HttpMethod)) return null;
  const statusClass = statusClassOf(raw.statusCode);
  if (statusClass === null) return null;
  const durationMs = raw.durationMs;
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 3_600_000) return null;
  return { routeKey, method: raw.method as HttpMethod, statusClass, durationMs };
}

/** Convertit un tampon brut en échantillons valides, en écartant silencieusement le reste. */
export function decideSamples(raws: readonly RawLatencySample[]): LatencySample[] {
  return raws.map(decideSample).filter((sample): sample is LatencySample => sample !== null);
}
