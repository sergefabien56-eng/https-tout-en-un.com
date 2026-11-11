import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { isUserRoleFilter, isUserStatusFilter, listAuthorizedUsers } from '@/modules/identity/user-list';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { active: 'Actif', suspended: 'Suspendu', invited: 'Invité' };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string; role?: string }> }) {
  const params = await searchParams;
  const raw = params.page ?? '1';
  const q = params.q ?? '';
  const status = params.status ?? 'all';
  const role = params.role ?? 'all';
  if (!/^[1-9]\d{0,4}$/.test(raw) || !isUserStatusFilter(status) || !isUserRoleFilter(role)) notFound();
  const page = Number(raw);
  let result: Awaited<ReturnType<typeof listAuthorizedUsers>>;
  try {
    result = await listAuthorizedUsers((await cookies()).get('toutenun_session')?.value, page, q, status, role);
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
      <label htmlFor="user-status">Statut du compte</label>
      <select id="user-status" name="status" defaultValue={status}>
        <option value="all">Tous les statuts</option>
        <option value="active">Actifs</option>
        <option value="suspended">Suspendus</option>
        <option value="invited">Invités</option>
      </select>
      <label htmlFor="user-role">Rôle attribué</label>
      <select id="user-role" name="role" defaultValue={role}>
        <option value="all">Tous les rôles</option>
        <option value="owner">Propriétaire</option>
        <option value="manager">Gestionnaire</option>
        <option value="stock_manager">Responsable des stocks</option>
        <option value="accountant">Comptable</option>
        <option value="assistant">Assistant</option>
      </select>
      <button type="submit">Filtrer</button>
    </form>
    <p><a href={`/api/admin/users/export?${new URLSearchParams({ q: q.trim(), status, role })}`}>
      Exporter les utilisateurs correspondant aux filtres en CSV
    </a> (toutes les pages, dans la limite de 10 000 lignes ; droits d’export requis).</p>
    {result.users.length === 0 ? <div className="card" role="status">
      <h2>Aucun utilisateur</h2><p>{q.trim() || status !== 'all' || role !== 'all' ? 'Aucun compte ne correspond à ces filtres.' : 'Aucun compte n’a encore été créé.'}</p>
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
      {page > 1 && <Link href={`/espace/utilisateurs?page=${page - 1}&q=${encodeURIComponent(q.trim())}&status=${status}&role=${role}`}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={`/espace/utilisateurs?page=${result.nextPage}&q=${encodeURIComponent(q.trim())}&status=${status}&role=${role}`}>Page suivante</Link>}
    </nav>
  </main>;
}
