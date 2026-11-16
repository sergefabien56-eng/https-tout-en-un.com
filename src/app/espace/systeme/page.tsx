import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDeepHealth } from '@/modules/monitoring/deep-health';
import { canExportSystem } from '@/modules/monitoring/export-system';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';

const ENVIRONMENT_LABEL = { development: 'Développement', staging: 'Préproduction', production: 'Production' } as const;

export default async function SystemPage() {
  let result: Awaited<ReturnType<typeof getDeepHealth>>;
  let mayExport: boolean;
  try { const token = (await cookies()).get('toutenun_session')?.value;
    result = await getDeepHealth(token); mayExport = await canExportSystem(token); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 403) notFound();
    throw error;
  }
  return <main className="workspace-main">
    <span className="tag">Administration · Propriétaire</span>
    <h1>Système</h1>
    {mayExport && <p><a href="/api/admin/system/export">Exporter Système en CSV</a>{' · '}
      <a href="/api/admin/system/export/xlsx">Exporter Système en Excel</a>{' · '}
      <a href="/api/admin/system/export/pdf">Exporter Système en PDF</a> (instantané actualisé au téléchargement).</p>}
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
      <p>Indisponibles : la sécurité de la base ne permet pas actuellement de lire ces compteurs sans périmètre boutique. Aucun zéro n’est déduit de données masquées.</p>
      <p>Aucun collecteur d’erreurs applicatives n’est encore livré ; ce n’est ni une surveillance continue ni un statut de santé.</p>
    </div>
    <div className="card"><h2>File de tâches</h2>
      <p>Indisponible — le worker n’est pas encore livré. Aucun état « OK » n’est simulé. Tâches en attente : indisponibles.</p>
    </div>
  </main>;
}
