/**
 * Branchement de la mesure de latence au démarrage du serveur Node.
 *
 * Le crochet réel (`scripts/latency-hook.mjs`) est du JavaScript pur, **hors du bundle**, chargé
 * par `webpackIgnore`. Ce fichier ne contient donc plus aucune référence à `node:http`, à `pg`
 * ou à `argon2`.
 *
 * Pourquoi cette architecture : `src/instrumentation.ts` est compilé **deux fois** par Next,
 * pour les runtimes nodejs ET edge. Tout import statique y est analysé pour l'edge, où `pg`,
 * `argon2`, `fs` et `node:http` n'existent pas. Résultat mesuré le 18/11 : erreurs
 * `Can't resolve 'fs'` puis `UnhandledSchemeError: node:http`, **toutes les routes en 500**
 * pendant `next dev`, et CI rouge au démarrage de Playwright (run 44320835442). Quatre
 * tentatives successives ont échoué avant celle-ci ; elles sont listées dans
 * `instrument-routes.ts` pour ne pas être refaites.
 *
 * Le chargement est gardé par le runtime, puis par un interrupteur explicite : la mesure
 * s'active avec `LATENCY_INSTRUMENTATION=on`. Absence d'interrupteur = aucune mesure, et
 * l'écran Système affiche « aucune mesure » plutôt qu'un chiffre inventé.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.LATENCY_INSTRUMENTATION !== 'on') return;
  try {
    /**
     * `webpackIgnore` est indispensable : sans lui, le spécificateur est résolu au build, le
     * `.mjs` est embarqué, et l'on retombe exactement sur le défaut qu'on vient de corriger.
     * Le fichier vit donc hors du bundle et n'est chargé qu'une fois, au démarrage.
     */
    // Le chemin ne peut pas être relatif au fichier compilé : en production, ce module devient
    // `.next/server/instrumentation.js`, d'où `../scripts/...` ne mène nulle part. Deux
    // candidats essayés dans l'ordre, sans dépendre de `node:path` ni de `node:fs` (interdits
    // dans le graphe de l'instrumentation côté edge). Si aucun ne charge, aucune mesure : c'est
    // un silence, jamais une erreur de démarrage.
    const candidates = [
      // Serveur autonome : la racine du processus contient `.next/` mais pas `scripts/`.
      new URL('.next/standalone/scripts/latency-hook.mjs', `file://${process.cwd()}/`).href,
      new URL('scripts/latency-hook.mjs', `file://${process.cwd()}/`).href,
      new URL('../scripts/latency-hook.mjs', import.meta.url).href,
    ];
    for (const hookUrl of candidates) {
      try {
        await import(/* webpackIgnore: true */ hookUrl);
        return;
      } catch { /* candidat suivant */ }
    }
  } catch {
    // Une mesure qui empêcherait l'application de démarrer serait pire que pas de mesure.
  }
}
