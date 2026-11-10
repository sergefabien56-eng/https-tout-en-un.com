import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { listOwnShops } from '@/modules/identity/shop-catalog';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';
export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const raw = (await searchParams).page ?? '1';
  if (!/^[1-9]\d{0,4}$/.test(raw)) notFound();
  const page = Number(raw);
  let result: Awaited<ReturnType<typeof listOwnShops>>;
  try { result = await listOwnShops((await cookies()).get('toutenun_session')?.value, page); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    throw error;
  }
  return <main className="workspace-main">
    <span className="tag">Boutiques accessibles</span>
    <h1>Toutes les boutiques autorisées</h1>
    <p>Liste issue de la base et filtrée par vos droits. Aucun chiffre de vente n’est disponible avant la connexion Jumia.</p>
    {result.shops.length === 0 ? <div className="card" role="status">
      <h2>Aucune boutique accessible</h2><p>Aucune boutique n’est actuellement visible pour votre compte.</p>
    </div> : <div className="card users-list"><table>
      <caption>Boutiques réelles — page {page}</caption>
      <thead><tr><th scope="col">Boutique</th><th scope="col">Pays</th><th scope="col">Devise</th><th scope="col">État</th><th scope="col">Journal</th></tr></thead>
      <tbody>{result.shops.map((shop) => <tr key={shop.id}><th scope="row">{shop.displayName}</th>
        <td>{shop.countryCode}</td><td>{shop.currency}</td><td>{shop.status}</td>
        <td><Link href={`/espace/journal?shop=${shop.id}`}>Voir le journal de {shop.displayName}</Link></td>
      </tr>)}</tbody>
    </table></div>}
    <nav aria-label="Pagination des boutiques" className="pagination">
      {page > 1 && <Link href={`/espace/boutiques?page=${page - 1}`}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={`/espace/boutiques?page=${result.nextPage}`}>Page suivante</Link>}
    </nav>
  </main>;
}
