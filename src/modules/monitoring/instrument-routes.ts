/**
 * Mesure de latence branchée sur le serveur HTTP, sans toucher aux gestionnaires de route.
 *
 * Trois approches ont été essayées, dans cet ordre :
 *   1. enrobage généré par route dans `src/app/api/_measured/…` → **rejeté par Next** : dossier
 *      préfixé `_` ignoré par le routeur (vérifié : 0 route produite) ;
 *   2. `getRequestHandler` de `next/dist/server/next-server.js` → correct à l'exécution, mais
 *      l'import des internes de Next depuis `instrumentation.ts` **casse la compilation**
 *      (`WebpackError is not a constructor` dans le minifieur) ;
 *   3. ce fichier : on écoute les événements du serveur HTTP de Node, qui n'ont aucune
 *      dépendance interne. Une requête entre, une réponse se termine, on mesure l'écart.
 *
 * Ce qui est mesuré : la durée murale complète côté serveur (routage, exécution, écriture).
 * Ce qui ne l'est pas : le réseau, le rendu navigateur, la disponibilité de l'hébergeur.
 * Une panne de mesure ne change jamais la réponse : aucune écriture dans le flux ni les en-têtes.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  normalizeRoutePath, recordRouteLatency, statusClassOf, type HttpMethod,
} from '@/modules/monitoring/route-latency';

const METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const GUARD = Symbol.for('toutenun.latency.http-patched');

type HttpServer = { emit: (event: string, ...args: unknown[]) => boolean };

/**
 * Enregistre un échantillon à la fin réelle de la réponse. Exporté pour être testable sans
 * serveur : c'est le seul endroit qui décide de mesurer ou non.
 */
/** Ce dont la mesure a besoin : écouter `finish` et lire le statut. Rien d'autre. */
export interface MeasurableResponse {
  statusCode?: number;
  on?: (event: 'finish', listener: () => void) => unknown;
}

export function measureRequest(requestUrl: string | undefined, method: string | undefined,
  response: MeasurableResponse, startedAt: number, now: () => number = () => performance.now()): boolean {
  const routeKey = requestUrl ? normalizeRoutePath(requestUrl.split('?')[0] ?? requestUrl) : null;
  if (!routeKey) return false;
  if (!METHODS.includes(method as HttpMethod)) return false;
  const onFinish = (): void => {
    const statusClass = statusClassOf(response.statusCode ?? 0);
    if (statusClass === null) return;
    void recordRouteLatency({ routeKey, method: method as HttpMethod, statusClass,
      durationMs: now() - startedAt }).catch(() => undefined);
  };
  if (typeof response.on === 'function') response.on('finish', onFinish);
  else onFinish();
  return true;
}

/**
 * Branche la mesure sur le serveur HTTP de Node. Idempotent : un second appel ne fait rien,
 * et une requête déjà horodatée n'est jamais mesurée deux fois.
 */
export async function instrumentHttpServer(): Promise<void> {
  const http = await import('node:http');
  const serverPrototype = http.Server.prototype as unknown as HttpServer & Record<symbol, boolean>;
  if (serverPrototype[GUARD]) return;
  serverPrototype[GUARD] = true;
  const originalEmit = serverPrototype.emit;
  serverPrototype.emit = function patched(this: HttpServer, event: string, ...args: unknown[]): boolean {
    if (event === 'request' && args.length >= 2) {
      const [request, response] = args as [IncomingMessage, ServerResponse];
      const startedAt = performance.now();
      try {
        measureRequest(request.url, request.method, response, startedAt);
      } catch {
        // Jamais d'interférence avec le traitement de la requête.
      }
    }
    return originalEmit.apply(this, [event, ...args]);
  } as HttpServer['emit'];
}
