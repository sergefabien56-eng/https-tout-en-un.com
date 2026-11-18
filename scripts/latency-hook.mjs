/**
 * Crochet de mesure de latence — JavaScript pur, HORS du bundle Next.
 *
 * Pourquoi ce fichier existe : `src/instrumentation.ts` est compilé deux fois par Next
 * (runtime nodejs ET edge). Tout ce qu'il importe est donc analysé aussi pour le navigateur :
 * `node:http` y échoue (« UnhandledSchemeError ») et la chaîne `pg` y échoue aussi
 * (« Can't resolve 'fs' »). Dans les deux cas, TOUTES les routes répondent 500 en `next dev`.
 * Un fichier `.mjs` chargé via `import(/* webpackIgnore *\/ …)` n'est pas analysé, n'est pas
 * compilé, et n'existe qu'à l'exécution sous Node.
 *
 * Ce crochet ne fait que constater : URL, méthode, code de statut, durée. Aucune
 * interprétation, aucune écriture en base, aucun identifiant. La normalisation des chemins et
 * la validation vivent côté TypeScript (`src/modules/monitoring/instrument-routes.ts`), là où
 * elles sont testées.
 *
 * Le panneau est choisi explicitement : une application Node peut servir HTTPS et HTTP à la
 * fois. En HTTPS, `https.Server` n'hérite pas de `http.Server` : patcher un seul prototype
 * laisserait la moitié des requêtes invisibles.
 */
import http from 'node:http';
import https from 'node:https';

const BUFFER_KEY = Symbol.for('toutenun.latency.buffer');
const PATCHED = Symbol.for('toutenun.latency.patched');
const MAX_BUFFERED = 500;

export function installLatencyHook(now = () => performance.now()) {
  const buffer = globalThis[BUFFER_KEY] ?? (globalThis[BUFFER_KEY] = []);
  let installed = false;
  for (const serverPrototype of [http.Server.prototype, https.Server.prototype]) {
    if (serverPrototype[PATCHED]) continue;
    patch(serverPrototype, buffer, now);
    installed = true;
  }
  return installed;
}

function patch(serverPrototype, buffer, now) {
  serverPrototype[PATCHED] = true;
  const originalEmit = serverPrototype.emit;
  serverPrototype.emit = function patched(event, ...args) {
    if (event === 'request' && args.length >= 2) {
      const [request, response] = args;
      const startedAt = now();
      try {
        if (buffer.length < MAX_BUFFERED) {
          response.on('finish', () => {
            if (buffer.length < MAX_BUFFERED) {
              buffer.push({
                url: typeof request.url === 'string' ? request.url : '',
                method: typeof request.method === 'string' ? request.method : '',
                statusCode: Number(response.statusCode) || 0,
                durationMs: now() - startedAt,
              });
            }
          });
        }
      } catch {
        // Une mesure ne doit jamais gêner la requête mesurée.
      }
    }
    return originalEmit.apply(this, [event, ...args]);
  };
}

export const latencyBufferKey = BUFFER_KEY;

installLatencyHook();
