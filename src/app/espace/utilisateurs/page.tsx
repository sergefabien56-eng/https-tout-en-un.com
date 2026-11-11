import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { listAuthorizedUsers } from '@/modules/identity/user-list';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { active: 'Actif', suspended: 'Suspendu', invited: 'Invité' };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const raw = params.page ?? '1';
  const q = params.q ?? '';
  if (!/^[1-9]\d{0,4}$/.test(raw)) notFound();
  const page = Number(raw);
  let result: Awaited<ReturnType<typeof listAuthorizedUsers>>;
  try {
    result = await listAuthorizedUsers((await cookies()).get('toutenun_session')?.value, page, q);
  } catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && (error.httpStatus === 403 || error.httpStatus === 400)) notFound();
    throw error;
  }
  return <main className="workspace-main">
    <span className="tag">Administration</span>
    <h1>Utilisateurs</h1>
    <p>Comptes enregistrés dans votre organisation. Seuls les rôles globaux disposant de « Consulter les utilisateurs » accèdent à cette liste.</p>
    <form action="/espace/utilisateurs" method="get" role="search" className="shop-filters">
      <label htmlFor="user-search">Rechercher un utilisateur</label>
      <input id="user-search" name="q" type="search" maxLength={80} defaultValue={q}
        placeholder="Nom ou adresse e-mail" />
      <button type="submit">Filtrer</button>
    </form>
    {result.users.length === 0 ? <div className="card" role="status">
      <h2>Aucun utilisateur</h2><p>{q.trim() ? 'Aucun compte ne correspond à cette recherche.' : 'Aucun compte n’a encore été créé.'}</p>
    </div> : <div className="card users-list" role="region" aria-label="Tableau des utilisateurs défilant horizontalement" tabIndex={0}>
      <table><caption>Utilisateurs réels — page {page}</caption>
        <thead><tr><th scope="col">Nom</th><th scope="col">Adresse e-mail</th><th scope="col">Statut</th><th scope="col">Créé le</th></tr></thead>
        <tbody>{result.users.map((user) => <tr key={user.id}>
          <td><Link href={`/espace/utilisateurs/${user.id}`}>{user.displayName}</Link></td><td>{user.email}</td>
          <td>{STATUS[user.status] ?? 'Indisponible'}</td>
          <td>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(user.createdAt))}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    <nav aria-label="Pagination des utilisateurs" className="pagination">
      {page > 1 && <Link href={`/espace/utilisateurs?page=${page - 1}&q=${encodeURIComponent(q.trim())}`}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={`/espace/utilisateurs?page=${result.nextPage}&q=${encodeURIComponent(q.trim())}`}>Page suivante</Link>}
    </nav>
  </main>;
}
