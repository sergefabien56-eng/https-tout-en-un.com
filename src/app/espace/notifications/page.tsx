import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { listOwnNotifications } from '@/modules/notifications/list-own';

export const dynamic = 'force-dynamic';
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const raw = (await searchParams).page ?? '1';
  if (!/^[1-9]\d{0,4}$/.test(raw)) notFound();
  const page = Number(raw);
  let result: Awaited<ReturnType<typeof listOwnNotifications>>;
  try { result = await listOwnNotifications((await cookies()).get('toutenun_session')?.value, page); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    throw error;
  }
  return <main className="workspace-main"><span className="tag">Compte · Réelle</span>
    <h1>Mes notifications</h1>
    <p>Événements enregistrés pour votre compte. Les notifications Jumia et l’envoi par e-mail ne sont pas encore disponibles.</p>
    {result.notifications.length === 0 ? <div className="card" role="status"><h2>Aucune notification</h2>
      <p>Aucun événement de sécurité n’a encore été enregistré pour ce compte.</p></div>
      : <ul className="notification-list">{result.notifications.map((n) => <li key={n.id} className="card">
        <h2>{n.title}</h2><p>{n.message}</p><small>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(n.createdAt))} UTC</small>
      </li>)}</ul>}
    <nav aria-label="Pagination des notifications" className="pagination">
      {page > 1 && <Link href={`/espace/notifications?page=${page - 1}`}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={`/espace/notifications?page=${result.nextPage}`}>Page suivante</Link>}
    </nav>
  </main>;
}
