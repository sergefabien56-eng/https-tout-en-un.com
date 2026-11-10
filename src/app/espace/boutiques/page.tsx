import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ShopSelectButton } from '@/ui/shop-select-button';
import { listOwnShops } from '@/modules/identity/shop-catalog';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';
export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  const params = await searchParams;
  const raw = params.page ?? '1';
  if (!/^[1-9]\d{0,4}$/.test(raw)) notFound();
  const page = Number(raw);
  const activeId = (await cookies()).get('toutenun_shop')?.value;
  let result: Awaited<ReturnType<typeof listOwnShops>>;
  try { result = await listOwnShops((await cookies()).get('toutenun_session')?.value, page,
      { ...(params.q !== undefined ? { q: params.q } : {}),
        ...(params.status !== undefined ? { status: params.status } : {}) }); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 400) notFound();
    throw error;
  }
  return <main className="workspace-main">
    <span className="tag">Boutiques accessibles</span>
    <h1>Toutes les boutiques autorisées</h1>
    <p>Liste issue de la base et filtrée par vos droits. Aucun chiffre de vente n’est disponible avant la connexion Jumia.</p>
    <form action="/espace/boutiques" method="get" className="shop-filters" role="search">
      <label htmlFor="shop-search">Rechercher une boutique</label>
      <input id="shop-search" name="q" type="search" maxLength={80} defaultValue={params.q ?? ''} placeholder="Nom de boutique" />
      <label htmlFor="shop-status">État</label>
      <select id="shop-status" name="status" defaultValue={params.status ?? ''}>
        <option value="">Tous les états</option>
        <option value="connected">Connectée</option><option value="syncing">Synchronisation</option>
        <option value="synced">Synchronisée</option><option value="partial">Partielle</option>
        <option value="error">Erreur</option><option value="reauth_required">Réauthentification requise</option>
        <option value="disabled">Désactivée</option>
      </select><button type="submit">Filtrer</button>
    </form>
    {activeId && <p><ShopSelectButton shopId="all" label="toutes les boutiques autorisées" selected={false} /></p>}
    {result.shops.length === 0 ? <div className="card" role="status">
      <h2>Aucune boutique accessible</h2><p>Aucune boutique n’est actuellement visible pour votre compte.</p>
    </div> : <div className="card users-list"><table>
      <caption>Boutiques réelles — page {page}</caption>
      <thead><tr><th scope="col">Boutique</th><th scope="col">Pays</th><th scope="col">Devise</th><th scope="col">État</th><th scope="col">Sélection</th><th scope="col">Journal</th></tr></thead>
      <tbody>{result.shops.map((shop) => <tr key={shop.id}><th scope="row">{shop.displayName}</th>
        <td>{shop.countryCode}</td><td>{shop.currency}</td><td>{shop.status}</td>
        <td><ShopSelectButton shopId={shop.id} label={shop.displayName} selected={activeId === shop.id} /></td>
        <td><Link href={`/espace/journal?shop=${shop.id}`}>Voir le journal de {shop.displayName}</Link></td>
      </tr>)}</tbody>
    </table></div>}
    <nav aria-label="Pagination des boutiques" className="pagination">
      {page > 1 && <Link href={`/espace/boutiques?page=${page - 1}&q=${encodeURIComponent(params.q ?? '')}&status=${encodeURIComponent(params.status ?? '')}`}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={`/espace/boutiques?page=${result.nextPage}&q=${encodeURIComponent(params.q ?? '')}&status=${encodeURIComponent(params.status ?? '')}`}>Page suivante</Link>}
    </nav>
  </main>;
}
