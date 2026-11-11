import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { isNotificationReadFilter, listOwnNotifications } from '@/modules/notifications/list-own';
import { NotificationReadButton } from '@/ui/notification-read-button';

export const dynamic = 'force-dynamic';
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string; filter?: string }> }) {
  const params = await searchParams;
  const raw = params.page ?? '1';
  const filter = params.filter ?? 'all';
  if (!/^[1-9]\d{0,4}$/.test(raw) || !isNotificationReadFilter(filter)) notFound();
  const page = Number(raw);
  let result: Awaited<ReturnType<typeof listOwnNotifications>>;
  try { result = await listOwnNotifications((await cookies()).get('toutenun_session')?.value, page, filter); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    throw error;
  }
  return <main className="workspace-main"><span className="tag">Compte · Réelle</span>
    <h1>Mes notifications</h1>
    <p>Événements enregistrés pour votre compte. Les notifications Jumia et l’envoi par e-mail ne sont pas encore disponibles.</p>
    <p>Cette liste ne s’actualise pas automatiquement. <a href={`/espace/notifications?filter=${filter}&page=${page}`}>Actualiser les notifications</a></p>
    <nav aria-label="Filtrer les notifications" className="pagination">
      <Link href="/espace/notifications?filter=all" aria-current={filter === 'all' ? 'page' : undefined}>Toutes</Link>
      <Link href="/espace/notifications?filter=unread" aria-current={filter === 'unread' ? 'page' : undefined}>Non lues</Link>
      <Link href="/espace/notifications?filter=read" aria-current={filter === 'read' ? 'page' : undefined}>Lues</Link>
    </nav>
    {result.notifications.length === 0 ? <div className="card" role="status"><h2>Aucune notification</h2>
      <p>{filter === 'all' ? 'Aucun événement de sécurité n’a encore été enregistré pour ce compte.' :
        filter === 'unread' ? 'Aucune notification non lue.' : 'Aucune notification lue.'}</p></div>
      : <ul className="notification-list">{result.notifications.map((n) => <li key={n.id} data-notification-id={n.id} className="card">
        <h2>{n.title}</h2><p>{n.message}</p><p>{n.readAt ? 'Lue' : 'Non lue'}</p>
        <small>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(n.createdAt))} UTC</small>
        <NotificationReadButton id={n.id} read={n.readAt !== null} />
      </li>)}</ul>}
    <nav aria-label="Pagination des notifications" className="pagination">
      {page > 1 && <Link href={`/espace/notifications?filter=${filter}&page=${page - 1}`}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={`/espace/notifications?filter=${filter}&page=${result.nextPage}`}>Page suivante</Link>}
    </nav>
  </main>;
}
