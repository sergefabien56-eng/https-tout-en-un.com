/**
 * Branchement de la mesure de latence au démarrage du serveur Node.
 *
 * Aucun import des internes de Next ici : c'est précisément ce qui cassait la compilation
 * (voir le commentaire de `src/modules/monitoring/instrument-routes.ts`). Seul `node:http`
 * est touché, via un module qui n'importe rien d'autre que la base de données et les
 * utilitaires de l'application.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { instrumentHttpServer } = await import('@/modules/monitoring/instrument-routes');
    await instrumentHttpServer();
  } catch {
    // Une mesure qui empêcherait l'application de démarrer serait pire que pas de mesure.
  }
}
