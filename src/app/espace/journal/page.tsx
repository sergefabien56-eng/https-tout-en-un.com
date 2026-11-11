import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { listShopAudit } from '@/modules/audit/list-audit';
import { auditPeriodPreset } from '@/modules/audit/period-presets';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';
export default async function AuditPage({ searchParams }: {
  searchParams: Promise<{ shop?: string; page?: string; q?: string; module?: string; actorId?: string; from?: string; to?: string }>;
}) {
  const { shop: requestedShop, page: raw = '1', q, module, actorId, from, to } = await searchParams;
  const cookieStore = await cookies();
  const shop = requestedShop ?? cookieStore.get('toutenun_shop')?.value;
  const token = cookieStore.get('toutenun_session')?.value;
  if (!shop) return <main className="workspace-main"><span className="tag">Journal d’activité</span>
    <h1>Choisissez une boutique</h1><p>Le journal exige une boutique autorisée. Aucun événement multi-boutiques n’est affiché sans périmètre vérifié.</p>
    <Link href="/espace/boutiques">Choisir dans mes boutiques</Link></main>;
  if (!/^[1-9]\d{0,18}$/.test(shop) || !/^[1-9]\d{0,4}$/.test(raw)) notFound();
  const filters = { ...(q ? { q } : {}), ...(module ? { module } : {}), ...(actorId ? { actorId } : {}),
    ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const link = (targetPage?: number, exportFile = false) => {
    const params = new URLSearchParams({ shop, ...filters });
    if (targetPage !== undefined) params.set('page', String(targetPage));
    return exportFile ? `/api/shops/${shop}/audit/export?${params}` : `/espace/journal?${params}`;
  };
  // Les raccourcis remplacent uniquement les dates et repartent à la page 1.
  // La route existante valide ensuite boutique, permission et période côté serveur.
  const presetLink = (days: 7 | 30) => {
    const params = new URLSearchParams({ shop, ...filters, ...auditPeriodPreset(days) });
    return `/espace/journal?${params}`;
  };
  let result: Awaited<ReturnType<typeof listShopAudit>>;
  try { result = await listShopAudit({ token, shopId: shop, page: Number(raw), ...filters }); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && (error.httpStatus === 403 || error.httpStatus === 400)) notFound();
    throw error;
  }
  return <main className="workspace-main"><span className="tag">Journal d’activité · Boutique n° {shop}</span>
    <h1>Événements de la boutique</h1><p><Link href="/espace/boutiques">Changer de boutique</Link></p>
    <nav aria-label="Périodes rapides du journal" className="pagination">
      <Link href={presetLink(7)}>7 derniers jours (UTC)</Link>
      <Link href={presetLink(30)}>30 derniers jours (UTC)</Link>
    </nav>
    <form action="/espace/journal" method="get" className="shop-filters" role="search">
      <input name="shop" type="hidden" value={shop} />
      <label htmlFor="audit-query">Rechercher une action ou un module</label>
      <input id="audit-query" name="q" type="search" maxLength={80} defaultValue={q ?? ''} />
      <label htmlFor="audit-module">Module</label><input id="audit-module" name="module" defaultValue={module ?? ''} placeholder="ex. shops" />
      <label htmlFor="audit-actor">Acteur (ID)</label><input id="audit-actor" name="actorId" defaultValue={actorId ?? ''} inputMode="numeric" />
      <label htmlFor="audit-from">Du (UTC)</label><input id="audit-from" name="from" type="date" defaultValue={from ?? ''} />
      <label htmlFor="audit-to">Au (UTC)</label><input id="audit-to" name="to" type="date" defaultValue={to ?? ''} />
      <button type="submit">Filtrer</button>
    </form>
    <p><a href={link(undefined, true)}>Exporter cette sélection en CSV</a></p>
    {result.events.length === 0 ? <div className="card" role="status"><h2>Aucun événement</h2>
      <p>Aucune entrée d’audit enregistrée pour cette boutique.</p></div>
      : <div className="card users-list" role="region" aria-label="Tableau du journal défilant horizontalement" tabIndex={0}><table><caption>Journal réel — page {raw}</caption>
        <thead><tr><th scope="col">Date UTC</th><th scope="col">Module</th><th scope="col">Action</th><th scope="col">Résultat</th></tr></thead>
        <tbody>{result.events.map((event) => <tr key={event.id}><td>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(event.occurredAt))}</td>
          <td>{event.module}</td><td>{event.action}</td><td>{event.result === 'success' ? 'Succès' : 'Échec'}</td></tr>)}</tbody>
      </table></div>}
    <nav aria-label="Pagination du journal" className="pagination">
      {Number(raw) > 1 && <Link href={link(Number(raw) - 1)}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={link(result.nextPage)}>Page suivante</Link>}
    </nav>
  </main>;
}
