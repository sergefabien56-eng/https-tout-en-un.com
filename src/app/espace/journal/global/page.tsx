import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { listGlobalAudit } from '@/modules/audit/list-global-audit';
import { AppError } from '@/core/errors/app-error';
export const dynamic = 'force-dynamic';
export default async function GlobalAuditPage({ searchParams }: { searchParams: Promise<{
  page?: string; q?: string; module?: string; actorId?: string; from?: string; to?: string; result?: string;
}> }) {
  const { page = '1', q, module, actorId, from, to, result: rawResult } = await searchParams;
  if (!/^[1-9]\d{0,4}$/.test(page) || (rawResult && rawResult !== 'success' && rawResult !== 'failure')) notFound();
  const resultFilter: 'success' | 'failure' | undefined = rawResult === 'success' || rawResult === 'failure' ? rawResult : undefined;
  const filters = { ...(q ? { q } : {}), ...(module ? { module } : {}), ...(actorId ? { actorId } : {}),
    ...(from ? { from } : {}), ...(to ? { to } : {}), ...(resultFilter ? { result: resultFilter } : {}) };
  let data: Awaited<ReturnType<typeof listGlobalAudit>>;
  try { data = await listGlobalAudit({ token: (await cookies()).get('toutenun_session')?.value, page: Number(page), ...filters }); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && (error.httpStatus === 403 || error.httpStatus === 400)) notFound();
    throw error;
  }
  const exportParams = new URLSearchParams(filters).toString();
  const exportQuery = exportParams ? `?${exportParams}` : '';
  const link = (n: number) => `/espace/journal/global?${new URLSearchParams({ ...filters, page: String(n) })}`;
  return <main className="workspace-main"><span className="tag">Administration · Propriétaire</span>
    <h1>Journal global</h1>
    <p>Actions globales de l’organisation uniquement, sans événements de boutique. Les détails avant/après ne sont pas affichés.</p>
    <p><Link href="/espace/journal">Voir le journal d’une boutique</Link></p>
    {/* Exports réservés au propriétaire ; mêmes filtres que la liste, aucun détail avant/après. */}
    <p>{(['csv', 'xlsx', 'pdf'] as const).map((format, index) => (
      <span key={format}>{index > 0 ? ' · ' : null}<a href={`/api/admin/audit/global/export/${format}${exportQuery}`} rel="nofollow">
        {`Exporter cette sélection en ${format === 'csv' ? 'CSV' : format === 'xlsx' ? 'Excel' : 'PDF'}`}</a></span>
    ))}{' '}
      (événements globaux uniquement ; CSV et Excel : 10 000 maximum ; PDF : 1 000 maximum ;
      propriétaire et droit d’export global requis ; aucun détail avant/après).</p>
    <form action="/espace/journal/global" method="get" className="shop-filters" role="search">
      <label htmlFor="global-audit-q">Rechercher une action ou un module</label>
      <input id="global-audit-q" name="q" type="search" maxLength={80} defaultValue={q ?? ''} />
      <label htmlFor="global-audit-module">Module</label><input id="global-audit-module" name="module" defaultValue={module ?? ''} />
      <label htmlFor="global-audit-actor">Acteur (ID)</label><input id="global-audit-actor" name="actorId" inputMode="numeric" defaultValue={actorId ?? ''} />
      <label htmlFor="global-audit-result">Résultat</label><select id="global-audit-result" name="result" defaultValue={resultFilter ?? ''}>
        <option value="">Tous les résultats</option><option value="success">Succès</option><option value="failure">Échec</option></select>
      <label htmlFor="global-audit-from">Du (UTC)</label><input id="global-audit-from" name="from" type="date" defaultValue={from ?? ''} />
      <label htmlFor="global-audit-to">Au (UTC)</label><input id="global-audit-to" name="to" type="date" defaultValue={to ?? ''} />
      <button type="submit">Filtrer</button>
    </form>
    {data.events.length === 0 ? <div className="card" role="status"><h2>Aucun événement global</h2>
      <p>Aucune entrée ne correspond à cette page et à ces filtres.</p></div>
      : <div className="card users-list" role="region" aria-label="Tableau du journal global défilant horizontalement" tabIndex={0}>
        <table><caption>Journal global — page {page}</caption><thead><tr><th scope="col">Date UTC</th><th scope="col">Acteur (ID)</th>
          <th scope="col">Module</th><th scope="col">Action</th><th scope="col">Résultat</th></tr></thead>
          <tbody>{data.events.map((event) => <tr key={event.id}>
            <td>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(event.occurredAt))}</td>
            <td>{event.actorUserId ?? 'Indisponible'}</td><td>{event.module}</td><td>{event.action}</td>
            <td>{event.result === 'success' ? 'Succès' : 'Échec'}</td></tr>)}</tbody></table></div>}
    <nav aria-label="Pagination du journal global" className="pagination">
      {Number(page) > 1 && <Link href={link(Number(page) - 1)}>Page précédente</Link>}
      {data.nextPage !== null && <Link href={link(data.nextPage)}>Page suivante</Link>}
    </nav>
  </main>;
}
