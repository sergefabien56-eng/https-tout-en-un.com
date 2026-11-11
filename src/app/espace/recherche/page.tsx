import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { searchAuthorizedDirectory, type DirectorySearchResult } from '@/modules/identity/directory-search';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  if (typeof q !== 'string' || q.length > 80 || [...q].some((char) => char.charCodeAt(0) < 32)) notFound();
  const term = q.trim();
  let result: DirectorySearchResult | null = null;
  if (term.length >= 2) {
    try { result = await searchAuthorizedDirectory((await cookies()).get('toutenun_session')?.value, q); }
    catch (error) {
      if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
      if (error instanceof AppError && error.httpStatus === 400) notFound();
      throw error;
    }
  }
  return <main className="workspace-main">
    <span className="tag">Recherche · Phase 1</span>
    <h1>Rechercher dans mon espace</h1>
    <p>Recherche limitée aux boutiques autorisées et, si vous avez le droit global de consultation, aux comptes utilisateurs. Les commandes, produits et données Jumia ne sont pas encore disponibles.</p>
    <form action="/espace/recherche" method="get" role="search" className="shop-filters">
      <label htmlFor="directory-query">Nom de boutique, utilisateur ou e-mail</label>
      <input id="directory-query" name="q" type="search" maxLength={80} minLength={2} defaultValue={q} required />
      <button type="submit">Rechercher</button>
    </form>
    {!result ? <p role="status">Saisissez au moins deux caractères pour rechercher.</p> : <>
      <section className="card" aria-labelledby="search-shops-heading"><h2 id="search-shops-heading">Boutiques autorisées</h2>
        {result.shops.length === 0 ? <p>Aucune boutique trouvée.</p> : <ul>{result.shops.map((shop) =>
          <li key={shop.id}><Link href={`/espace/boutiques?q=${encodeURIComponent(shop.displayName)}`}>{shop.displayName} · {shop.countryCode}</Link></li>)}</ul>}
        <p><Link href={`/espace/boutiques?q=${encodeURIComponent(term)}`}>Voir les boutiques correspondant à cette recherche</Link></p>
      </section>
      <section className="card" aria-labelledby="search-users-heading"><h2 id="search-users-heading">Utilisateurs accessibles</h2>
        {result.users.length === 0 ? <p>Aucun compte visible ou correspondant à cette recherche.</p> : <ul>{result.users.map((user) =>
          <li key={user.id}><Link href={`/espace/utilisateurs/${user.id}`}>{user.displayName} · {user.email}</Link></li>)}</ul>}
        {result.users.length > 0 && <p><Link href={`/espace/utilisateurs?q=${encodeURIComponent(term)}`}>Voir les utilisateurs correspondant à cette recherche</Link></p>}
      </section>
    </>}
  </main>;
}
