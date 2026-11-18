import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDeepHealth } from '@/modules/monitoring/deep-health';
import { getIncidentReport } from '@/modules/monitoring/system-incidents';
import { getRouteLatency } from '@/modules/monitoring/route-latency';
import { flushRouteLatency } from '@/modules/monitoring/route-latency-store';
import { COLLECTOR_SCOPE } from '@/modules/monitoring/collect-errors';
import { IncidentAcknowledgeButton } from '@/ui/incident-acknowledge-button';
import { canExportSystem } from '@/modules/monitoring/export-system';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';

const ENVIRONMENT_LABEL = { development: 'Développement', staging: 'Préproduction', production: 'Production' } as const;

export default async function SystemPage() {
  let result: Awaited<ReturnType<typeof getDeepHealth>>;
  let latency: Awaited<ReturnType<typeof getRouteLatency>>;
  let incidents: Awaited<ReturnType<typeof getIncidentReport>>;
  let mayExport: boolean;
  try { const token = (await cookies()).get('toutenun_session')?.value;
    result = await getDeepHealth(token); mayExport = await canExportSystem(token);
    // Les échantillons déposés en mémoire par l'instrumentation sont écrits ici : elle ne peut
    // pas toucher la base elle-même (voir `instrument-routes.ts`). L'échec du vidage ne doit
    // jamais empêcher l'affichage — un écran Système muet serait pire que des mesures en retard.
    try { await flushRouteLatency(); } catch { /* mesures perdues, écran servi quand même */ }
    // Deux lectures séparées : un incident en échec de lecture ne doit pas effacer la latence.
    latency = await getRouteLatency(token); incidents = await getIncidentReport(token); }
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
    <div className="card"><h2>Incidents applicatifs (30 derniers jours)</h2>
      <dl className="detail-list">
        <dt>Critiques non acquittés</dt><dd>{incidents.openCritical}</dd>
        <dt>Avertissements non acquittés</dt><dd>{incidents.openWarnings}</dd>
        <dt>Informations non acquittées</dt><dd>{incidents.openInfos}</dd>
        <dt>Total sur la fenêtre</dt><dd>{incidents.total}</dd>
      </dl>
      <p>{incidents.total === 0
        ? 'Aucun incident enregistré sur la fenêtre. Ce n’est pas une preuve de bon fonctionnement : seul ce qui a été écrit dans le journal système est compté.'
        : 'Ces chiffres sont des lignes réellement présentes dans le journal système, jamais une estimation.'}</p>
      <p>{COLLECTOR_SCOPE} Ce n’est ni une surveillance continue ni un statut de santé.</p>
      {incidents.incidents.length > 0 && <table className="table">
        <caption>Incidents globaux, non acquittés d’abord</caption>
        <thead><tr><th scope="col">Date (UTC)</th><th scope="col">Gravité</th><th scope="col">Code</th>
          <th scope="col">Message</th><th scope="col">Action</th></tr></thead>
        <tbody>{incidents.incidents.map((incident) => <tr key={incident.id}>
          <td>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })
            .format(new Date(incident.occurredAt))}</td>
          <td>{{ critical: 'Critique', warning: 'Avertissement', info: 'Information' }[incident.severity]}</td>
          <td><code>{incident.code}</code></td>
          <td>{incident.message}</td>
          <td><IncidentAcknowledgeButton id={incident.id} initialAcknowledged={incident.acknowledgedAt} /></td>
        </tr>)}</tbody>
      </table>}
      {incidents.total > incidents.incidents.length && <p>Seuls les {incidents.incidents.length} premiers incidents
        sont affichés sur {incidents.total}. Le reste est consultable dans le journal.</p>}
      <p><small>{incidents.limits}</small></p>
    </div>
    <div className="card"><h2>Latence par route</h2>
      {!latency.measured ? <p>Aucune mesure sur les {latency.windowMinutes} dernières minutes.
        Ce n’est pas « aucune lenteur » : c’est l’absence d’échantillon mesuré.</p> : <>
        <p>{latency.totalSamples} échantillon(s) sur {latency.windowMinutes} minutes, agrégés par tranche de
          {' '}{latency.bucketMinutes} minutes. Seuil « lent » fixé à {latency.slowThresholdMs} ms.</p>
        <table className="table">
          <caption>Durée serveur du gestionnaire de route, hors réseau et hors rendu</caption>
          <thead><tr><th scope="col">Route</th><th scope="col">Méthode</th><th scope="col">Statut</th>
            <th scope="col">Échantillons</th><th scope="col">Moyenne</th><th scope="col">Maximum</th>
            <th scope="col">Lents</th></tr></thead>
          <tbody>{latency.routes.map((route) => <tr key={`${route.routeKey}-${route.method}-${route.statusClass}`}>
            <td><code>/api/{route.routeKey}</code></td><td>{route.method}</td>
            <td>{route.statusClass}xx</td><td>{route.samples}</td>
            <td>{route.averageMs} ms</td><td>{route.maxMs} ms</td>
            <td>{route.slowSamples} ({route.slowPercent} %)</td>
          </tr>)}</tbody>
        </table>
      </>}
      <p><small>{latency.limits}</small></p>
    </div>
    <div className="card"><h2>File de tâches</h2>
      <p>Indisponible — le worker n’est pas encore livré. Aucun état « OK » n’est simulé. Tâches en attente : indisponibles.</p>
    </div>
    <div className="card"><h2>Limitation de connexion</h2>
      {result.queue === null ? <p>Indisponible.</p> : <>
        <dl className="detail-list">
          <dt>Seaux actifs sur la fenêtre</dt><dd>{result.queue.activeBuckets}</dd>
          <dt>Seaux ayant atteint le plafond</dt><dd>{result.queue.bucketsAtLimit}</dd>
          <dt>Tentatives comptées</dt><dd>{result.queue.attemptsInWindow}</dd>
          <dt>Plafond appliqué par connexion</dt><dd>{result.queue.attemptsLimit} tentatives</dd>
          <dt>Fenêtre</dt><dd>{result.queue.windowMinutes} minutes depuis {new Intl.DateTimeFormat('fr-FR',
            { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(result.queue.windowStart))} UTC</dd>
        </dl>
        <p>Mesuré dans la table <code>rate_limits</code>, la même que celle interrogée par la connexion.
          Un seau est une <strong>empreinte</strong> d’adresse e-mail : aucune adresse en clair n’est stockée ni affichée.</p>
        <p>{result.queue.limits} Ce compteur ne surveille pas les erreurs applicatives et ne remplace pas une file de tâches.</p>
      </>}
    </div>
  </main>;
}
