import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { readOrganizationSettings } from '@/modules/identity/organization-settings';
import { OrganizationTimezoneForm } from '@/ui/organization-timezone-form';
import { OrganizationNameForm } from '@/ui/organization-name-form';
import { readOrganizationName } from '@/modules/identity/organization-name';
import { getNavigationPermissions } from '@/ui/navigation-permissions';
import { getSession } from '@/core/auth/service';

export const dynamic = 'force-dynamic';
export default async function SettingsPage() {
  const token = (await cookies()).get('toutenun_session')?.value;
  let result: Awaited<ReturnType<typeof readOrganizationSettings>>;
  let organization: Awaited<ReturnType<typeof readOrganizationName>>;
  try { result = await readOrganizationSettings(token); organization = await readOrganizationName(token); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 403) notFound();
    throw error;
  }
  const session = token ? await getSession(token) : null;
  const grants = session ? await getNavigationPermissions(session.userId) : null;
  return <main className="workspace-main">
    <span className="tag">Administration · Organisation</span><h1>Paramètres</h1>
    <p>Seuls les droits globaux permettent de consulter ou de modifier ces paramètres.</p>
    {grants?.globalPermissions.has('reports:export') && <p>
      <a href="/api/admin/settings/export">Exporter les paramètres en CSV</a>{' · '}
      <a href="/api/admin/settings/export/xlsx">Exporter les paramètres en Excel</a>
      {' '}(nom et fuseau de l’organisation uniquement).
    </p>}
    <div className="card"><h2>Organisation</h2>
      <p>Nom enregistré : <strong>{organization.name ?? 'Non configuré'}</strong>.</p>
      <p>Ce nom désigne votre organisation ; il ne modifie pas le nom officiel de l’application. Il figure dans l’export des paramètres, pas dans les autres exports.</p>
      {grants?.globalPermissions.has('settings:manage') && <OrganizationNameForm current={organization.name} />}
    </div>
    <div className="card"><h2>Fuseau horaire de référence</h2>
      <p>Valeur enregistrée : <strong>{result.timezone ?? 'Non configuré'}</strong>.</p>
      <p>Ce choix est enregistré et audité ; les dates des écrans existants restent en UTC. Aucun traitement métier n’utilise encore ce réglage.</p>
      {grants?.globalPermissions.has('settings:manage') && <OrganizationTimezoneForm current={result.timezone} />}
    </div>
    <div className="card"><h2>Autres paramètres prévus</h2>
      <p>Devise de référence : non configurée ; elle attend la décision de périmètre et n’est pas déduite des boutiques.</p>
      <p>Notifications par e-mail : indisponibles sans service SMTP fiable. Aucun envoi n’est annoncé.</p>
      <p>Apparence : <Link href="/espace/apparence">préférence personnelle d’affichage</Link>, indépendante des paramètres d’organisation.</p>
    </div>
  </main>;
}
