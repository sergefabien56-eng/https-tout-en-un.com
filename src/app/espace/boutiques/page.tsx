import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ShopSelectButton } from '@/ui/shop-select-button';
import { isShopSort, listOwnShops } from '@/modules/identity/shop-catalog';
import { AppError } from '@/core/errors/app-error';
import { getSession } from '@/core/auth/service';
import { getNavigationPermissions } from '@/ui/navigation-permissions';

export const dynamic = 'force-dynamic';
export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string; sort?: string; view?: string }> }) {
  const params = await searchParams;
  const raw = params.page ?? '1';
  const sort = params.sort ?? 'recent';
  const view = params.view ?? 'table';
  if (!/^[1-9]\d{0,4}$/.test(raw) || !isShopSort(sort) || (view !== 'table' && view !== 'cards')) notFound();
  const page = Number(raw);
  const hrefFor = (targetView: 'table' | 'cards', targetPage = page) =>
    `/espace/boutiques?${new URLSearchParams({ page: String(targetPage), q: params.q ?? '',
      status: params.status ?? '', sort, view: targetView })}`;
  const activeId = (await cookies()).get('toutenun_shop')?.value;
  const token = (await cookies()).get('toutenun_session')?.value;
  let result: Awaited<ReturnType<typeof listOwnShops>>;
  try { result = await listOwnShops(token, page,
      { ...(params.q !== undefined ? { q: params.q } : {}),
        ...(params.status !== undefined ? { status: params.status } : {}), sort }); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 400) notFound();
    throw error;
  }
  const session = token ? await getSession(token) : null;
  if (!session) redirect('/connexion');
  const grants = await getNavigationPermissions(session.userId);
  const exportHref = `/api/shops/export?${new URLSearchParams({ q: params.q ?? '',
    status: params.status ?? '', sort })}`;
  return <main className="workspace-main">
    <span className="tag">Boutiques accessibles</span>
    <h1>Toutes les boutiques autorisées</h1>
    <p>Liste issue de la base et filtrée par vos droits. Aucun chiffre de vente n’est disponible avant la connexion Jumia.</p>
    <form action="/espace/boutiques" method="get" className="shop-filters" role="search">
      <input name="view" type="hidden" value={view} />
      <label htmlFor="shop-search">Rechercher une boutique</label>
      <input id="shop-search" name="q" type="search" maxLength={80} defaultValue={params.q ?? ''} placeholder="Nom de boutique" />
      <label htmlFor="shop-status">État</label>
      <select id="shop-status" name="status" defaultValue={params.status ?? ''}>
        <option value="">Tous les états</option>
        <option value="connected">Connectée</option><option value="syncing">Synchronisation</option>
        <option value="synced">Synchronisée</option><option value="partial">Partielle</option>
        <option value="error">Erreur</option><option value="reauth_required">Réauthentification requise</option>
        <option value="disabled">Désactivée</option>
      </select>
      <label htmlFor="shop-sort">Trier les boutiques</label>
      <select id="shop-sort" name="sort" defaultValue={sort}>
        <option value="recent">Plus récentes</option>
        <option value="name-asc">Nom A à Z</option>
        <option value="name-desc">Nom Z à A</option>
      </select><button type="submit">Filtrer</button>
    </form>
    {grants.permissions.has('reports:export') && <p><a href={exportHref}>Exporter les boutiques autorisées en CSV</a>
      {' '}(toutes les pages, droits d’export boutique requis ; chiffres Jumia indisponibles).</p>}
    <nav aria-label="Affichage des boutiques" className="shop-view-switch">
      <Link href={hrefFor('table')} aria-current={view === 'table' ? 'page' : undefined}>Tableau</Link>
      <Link href={hrefFor('cards')} aria-current={view === 'cards' ? 'page' : undefined}>Cartes repliables</Link>
    </nav>
    {activeId && <p><ShopSelectButton shopId="all" label="toutes les boutiques autorisées" selected={false} /></p>}
    {result.shops.length === 0 ? <div className="card" role="status">
      <h2>Aucune boutique accessible</h2><p>{params.q || params.status ? 'Aucune boutique autorisée ne correspond à ces filtres.' : 'Aucune boutique n’est actuellement visible pour votre compte.'}</p>
    </div> : view === 'table' ? <div className="card users-list" role="region" aria-label="Tableau des boutiques défilant horizontalement" tabIndex={0}><table>
      <caption>Boutiques réelles — page {page}</caption>
      <thead><tr><th scope="col">Boutique</th><th scope="col">Pays</th><th scope="col">Devise</th><th scope="col">État</th><th scope="col">Sélection</th><th scope="col">Journal</th></tr></thead>
      <tbody>{result.shops.map((shop) => <tr key={shop.id}><th scope="row">{shop.displayName}</th>
        <td>{shop.countryCode}</td><td>{shop.currency}</td><td>{shop.status}</td>
        <td><ShopSelectButton shopId={shop.id} label={shop.displayName} selected={activeId === shop.id} /></td>
        <td><Link href={`/espace/journal?shop=${shop.id}`}>Voir le journal de {shop.displayName}</Link></td>
      </tr>)}</tbody>
    </table></div> : <div className="shop-cards" aria-label="Cartes des boutiques autorisées">
      {result.shops.map((shop) => <details key={shop.id} className="card shop-card">
        <summary><strong>{shop.displayName}</strong><span>{shop.countryCode} · {shop.status}</span></summary>
        <div className="shop-card-content">
          <dl className="detail-list"><dt>Pays</dt><dd>{shop.countryCode}</dd>
            <dt>Devise</dt><dd>{shop.currency}</dd><dt>État</dt><dd>{shop.status}</dd>
            <dt>Ventes et commandes</dt><dd>— · Indisponibles : aucune donnée Jumia</dd></dl>
          <div className="shop-card-actions">
            <ShopSelectButton shopId={shop.id} label={shop.displayName} selected={activeId === shop.id} />
            <Link href={`/espace/journal?shop=${shop.id}`}>Voir le journal de {shop.displayName}</Link>
          </div>
        </div>
      </details>)}
    </div>}
    <nav aria-label="Pagination des boutiques" className="pagination">
      {page > 1 && <Link href={hrefFor(view, page - 1)}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={hrefFor(view, result.nextPage)}>Page suivante</Link>}
    </nav>
  </main>;
}
