import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { getAuthorizedUser } from '@/modules/identity/user-list';
import { getSession } from '@/core/auth/service';
import { getNavigationPermissions } from '@/ui/navigation-permissions';
import { ChangeUserStatusButton } from '@/ui/change-user-status-button';
import { listOwnShops } from '@/modules/identity/shop-catalog';
import { listUserShopAccess, type ShopAccessEntry, type ShopAccessOrigin } from '@/modules/identity/shop-access';
import { GrantShopRoleForm, RevokeShopRoleButton } from '@/ui/manage-shop-role-form';
import { RevokeShopAccessButton } from '@/ui/revoke-shop-access-button';
import { SCOPED_ROLES, type ScopedRole } from '@/modules/identity/scoped-roles';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { active: 'Actif', suspended: 'Suspendu', invited: 'Invité' };
const ORIGIN_LABELS: Record<ShopAccessOrigin, string> = {
  scoped_role: 'issu d’un rôle boutique',
  global_role: 'issu d’un rôle global',
  independent: 'indépendant — aucun rôle',
};
export default async function UserDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shopQuery?: string; shopPage?: string }>;
}) {
  const { id } = await params;
  const { shopQuery = '', shopPage: rawShopPage = '1' } = await searchParams;
  if (!/^[1-9]\d{0,4}$/.test(rawShopPage)) notFound();
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
  const protectedAccount = session.userId === id || user.roles.some((role) => role.code === 'owner');
  const mayChangeStatus = grants.globalPermissions.has('users:write') && !protectedAccount && user.status !== 'invited';
  const mayManageShopRoles = grants.globalPermissions.has('roles:manage') && !protectedAccount && user.status !== 'invited';
  let shops: Awaited<ReturnType<typeof listOwnShops>> | null = null;
  let accesses: ShopAccessEntry[] = [];
  if (mayManageShopRoles) {
    try { shops = await listOwnShops(token, Number(rawShopPage), { q: shopQuery, sort: 'name-asc' }); }
    catch (error) {
      if (error instanceof AppError && error.httpStatus === 400) notFound();
      throw error;
    }
    try { accesses = (await listUserShopAccess(token, id)).accesses; }
    catch (error) {
      if (error instanceof AppError && error.httpStatus === 400) notFound();
      throw error;
    }
  }
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
          {mayManageShopRoles && role.shopId !== null && SCOPED_ROLES.some((code) => code === role.code) &&
            <> <RevokeShopRoleButton userId={id} shopId={role.shopId} roleCode={role.code as ScopedRole} /></>}
        </li>)}</ul>}
      <p>Les rôles globaux restent en consultation seule. Seul un Propriétaire peut attribuer ou retirer un rôle boutique ci-dessous.</p>
    </div>
    {mayManageShopRoles && <div className="card"><h2>Accès boutiques</h2>
      {accesses.length === 0 ? <p>Aucun accès boutique n’est enregistré pour ce compte.</p> :
        <ul>{accesses.map((access) => {
          const shopLabel = access.shopName ?? `la boutique n° ${access.shopId}`;
          return <li key={access.shopId}>
            {access.shopName ?? `Boutique n° ${access.shopId}`} — {access.canView ? 'accès actif' : 'accès désactivé'} · {ORIGIN_LABELS[access.origin]}
            {access.origin === 'independent' &&
              <> <RevokeShopAccessButton userId={id} shopId={access.shopId} shopLabel={shopLabel} /></>}
          </li>;
        })}</ul>}
      <p>Retirer un rôle conserve la ligne d’accès : une ligne indépendante est un accès résiduel qui ne donne à lui seul aucune permission. La révoquer ne retire aucun rôle ; les accès issus d’un rôle se gèrent par les rôles.</p>
    </div>}
    {mayManageShopRoles && <div className="card"><h2>Attribuer un rôle boutique</h2>
      <p>Choisissez une boutique autorisée. Cette action active aussi l’accès à cette boutique pour ce rôle ; les autres rôles du compte restent inchangés.</p>
      <form action={`/espace/utilisateurs/${id}`} method="get" className="shop-filters" role="search">
        <label htmlFor="assignment-shop-search">Rechercher une boutique</label>
        <input id="assignment-shop-search" name="shopQuery" type="search" maxLength={80} defaultValue={shopQuery} placeholder="Nom de boutique" />
        <button type="submit">Rechercher</button>
      </form>
      {shops?.shops.length ? <GrantShopRoleForm key={`${shopQuery}-${rawShopPage}`} userId={id} shops={shops.shops} />
        : <p role="status">Aucune boutique autorisée ne correspond à cette recherche.</p>}
      <nav aria-label="Pagination des boutiques à attribuer" className="pagination">
        {Number(rawShopPage) > 1 && <Link href={`/espace/utilisateurs/${id}?${new URLSearchParams({ shopQuery, shopPage: String(Number(rawShopPage) - 1) })}`}>Page précédente</Link>}
        {shops?.nextPage !== null && shops?.nextPage !== undefined && <Link href={`/espace/utilisateurs/${id}?${new URLSearchParams({ shopQuery, shopPage: String(shops.nextPage) })}`}>Page suivante</Link>}
      </nav>
      <p>Les invitations et l’attribution des rôles globaux restent indisponibles ; aucun e-mail n’est envoyé.</p>
    </div>}
  </main>;
}
