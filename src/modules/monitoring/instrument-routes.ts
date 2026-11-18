import {
  normalizeRoutePath, statusClassOf, type HttpMethod,
} from '@/modules/monitoring/route-paths';

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
