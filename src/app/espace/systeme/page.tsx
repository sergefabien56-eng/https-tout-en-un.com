import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDeepHealth } from '@/modules/monitoring/deep-health';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';

const ENVIRONMENT_LABEL = { development: 'Développement', staging: 'Préproduction', production: 'Production' } as const;

export default async function SystemPage() {
  let result: Awaited<ReturnType<typeof getDeepHealth>>;
  try { result = await getDeepHealth((await cookies()).get('toutenun_session')?.value); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 403) notFound();
    throw error;
  }
  return <main className="workspace-main">
    <span className="tag">Administration · Propriétaire</span>
    <h1>Système</h1>
    <p>État de cette instance au {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(result.checkedAt))} UTC. Cet écran ne vérifie pas l’hébergement ni les sauvegardes.</p>
    <div className="card"><h2>Application</h2>
      <dl className="detail-list"><dt>Version du code</dt><dd>{result.version}</dd>
        <dt>Environnement déclaré</dt><dd>{ENVIRONMENT_LABEL[result.environment]}</dd></dl>
      <p>La valeur déclarée ne prouve pas qu’une instance de production est installée ou opérationnelle.</p>
    </div>
    <div className="card"><h2>Base de données</h2>
      <p><span className="tag ok">Connexion vérifiée</span> Une requête de contrôle a réussi.</p>
      <dl className="detail-list"><dt>Migrations appliquées</dt><dd>{result.migrationsApplied}</dd>
        <dt>Durée de la requête de contrôle</dt><dd>{result.databaseQueryMs} ms</dd></dl>
      <p>La durée affichée ne mesure ni le réseau du navigateur ni la disponibilité continue.</p>
    </div>
    <div className="card"><h2>Événements système globaux enregistrés</h2>
      {result.globalEventsRecorded === 0
        ? <p>Aucun événement global enregistré. Ce constat ne prouve pas l’absence d’erreurs : aucun collecteur d’erreurs applicatives n’est encore livré.</p>
        : <dl className="detail-list"><dt>Événements globaux enregistrés</dt><dd>{result.globalEventsRecorded}</dd>
          <dt>Critiques non acquittés</dt><dd>{result.globalCriticalOpen}</dd>
          <dt>Avertissements non acquittés</dt><dd>{result.globalWarningsOpen}</dd></dl>}
      <p>Ces nombres portent uniquement sur la table des événements globaux (sans boutique). Les événements propres aux boutiques ne sont pas agrégés ici ; ce n’est ni une surveillance continue ni un statut de santé.</p>
    </div>
    <div className="card"><h2>File de tâches</h2>
      <p>Indisponible — le worker n’est pas encore livré. Aucun état « OK » n’est simulé. Tâches en attente : indisponibles.</p>
    </div>
  </main>;
}
