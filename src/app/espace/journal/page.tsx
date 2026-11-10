import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { listShopAudit } from '@/modules/audit/list-audit';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';
export default async function AuditPage({ searchParams }: {
  searchParams: Promise<{ shop?: string; page?: string }>;
}) {
  const { shop, page: raw = '1' } = await searchParams;
  const token = (await cookies()).get('toutenun_session')?.value;
  if (!shop) return <main className="workspace-main"><span className="tag">Journal d’activité</span>
    <h1>Choisissez une boutique</h1><p>Le journal exige une boutique autorisée. Aucun événement multi-boutiques n’est affiché sans périmètre vérifié.</p>
    <Link href="/espace/boutiques">Choisir dans mes boutiques</Link></main>;
  if (!/^[1-9]\d{0,18}$/.test(shop) || !/^[1-9]\d{0,4}$/.test(raw)) notFound();
  let result: Awaited<ReturnType<typeof listShopAudit>>;
  try { result = await listShopAudit({ token, shopId: shop, page: Number(raw) }); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 403) notFound();
    throw error;
  }
  return <main className="workspace-main"><span className="tag">Journal d’activité · Boutique n° {shop}</span>
    <h1>Événements de la boutique</h1><p><Link href="/espace/boutiques">Changer de boutique</Link></p>
    {result.events.length === 0 ? <div className="card" role="status"><h2>Aucun événement</h2>
      <p>Aucune entrée d’audit enregistrée pour cette boutique.</p></div>
      : <div className="card users-list"><table><caption>Journal réel — page {raw}</caption>
        <thead><tr><th scope="col">Date UTC</th><th scope="col">Module</th><th scope="col">Action</th><th scope="col">Résultat</th></tr></thead>
        <tbody>{result.events.map((event) => <tr key={event.id}><td>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(event.occurredAt))}</td>
          <td>{event.module}</td><td>{event.action}</td><td>{event.result === 'success' ? 'Succès' : 'Échec'}</td></tr>)}</tbody>
      </table></div>}
    <nav aria-label="Pagination du journal" className="pagination">
      {Number(raw) > 1 && <Link href={`/espace/journal?shop=${shop}&page=${Number(raw)-1}`}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={`/espace/journal?shop=${shop}&page=${result.nextPage}`}>Page suivante</Link>}
    </nav>
  </main>;
}
