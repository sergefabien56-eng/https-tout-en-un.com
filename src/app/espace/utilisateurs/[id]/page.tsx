import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { getAuthorizedUser } from '@/modules/identity/user-list';
import { getSession } from '@/core/auth/service';
import { getNavigationPermissions } from '@/ui/navigation-permissions';
import { ChangeUserStatusButton } from '@/ui/change-user-status-button';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { active: 'Actif', suspended: 'Suspendu', invited: 'Invité' };
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get('toutenun_session')?.value;
  let user: Awaited<ReturnType<typeof getAuthorizedUser>>;
  try { user = await getAuthorizedUser(token, id); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 403) notFound();
    throw error;
  }
  if (!user) notFound();
  const session = token ? await getSession(token) : null;
  if (!session) redirect('/connexion');
  const grants = await getNavigationPermissions(session.userId);
  const mayChangeStatus = grants.globalPermissions.has('users:write') && session.userId !== id &&
    !user.roles.some((role) => role.code === 'owner') && user.status !== 'invited';
  return <main className="workspace-main">
    <Link href="/espace/utilisateurs">← Retour aux utilisateurs</Link>
    <h1>{user.displayName}</h1>
    <div className="card"><h2>Compte</h2>
      <dl className="detail-list"><dt>Adresse e-mail</dt><dd>{user.email}</dd>
        <dt>Statut</dt><dd>{STATUS[user.status] ?? 'Indisponible'}</dd>
        <dt>Créé le</dt><dd>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(user.createdAt))}</dd></dl>
      {mayChangeStatus && <ChangeUserStatusButton id={id} status={user.status === 'suspended' ? 'suspended' : 'active'} />}
      <p>Une suspension révoque les sessions existantes ; une réactivation ne les restaure pas. Les invitations et les comptes Propriétaire ne sont pas modifiés ici.</p>
    </div>
    <div className="card"><h2>Rôles attribués</h2>
      {user.roles.length === 0 ? <p>Aucun rôle attribué.</p> :
        <ul>{user.roles.map((role) => <li key={`${role.code}-${role.shopId ?? 'global'}`}>
          {role.label} — {role.shopId === null ? 'Global (toutes les boutiques)' : `Boutique n° ${role.shopId}`}
        </li>)}</ul>}
      <p>Consultation uniquement : la modification des rôles n’est pas encore disponible.</p>
    </div>
  </main>;
}
