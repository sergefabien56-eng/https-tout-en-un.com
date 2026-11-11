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
    try { const store = await cookies(); result = await searchAuthorizedDirectory(
      store.get('toutenun_session')?.value, q, store.get('toutenun_shop')?.value); }
    catch (error) {
      if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
      if (error instanceof AppError && error.httpStatus === 400) notFound();
      throw error;
    }
  }
  return <main className="workspace-main">
    <span className="tag">Recherche · Phase 1</span>
    <h1>Rechercher dans mon espace</h1>
    <p>Recherche limitée aux boutiques autorisées, aux comptes accessibles avec droit global et aux événements du journal de la boutique sélectionnée si vous y avez accès. Sélectionnez une boutique pour rechercher son journal ; jamais de recherche d’audit multi-boutiques. Les commandes, produits et données Jumia ne sont pas encore disponibles.</p>
    <form action="/espace/recherche" method="get" role="search" className="shop-filters">
      <label htmlFor="directory-query">Boutique, utilisateur, e-mail ou action d’audit</label>
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
      <section className="card" aria-labelledby="search-audit-heading"><h2 id="search-audit-heading">Journal de la boutique sélectionnée</h2>
        {!result.auditShopId ? <p>Sélectionnez une boutique autorisée et dotée d’un droit de lecture du journal.</p>
          : result.audit.length === 0 ? <p>Aucun événement correspondant dans cette boutique.</p>
          : <ul>{result.audit.map((event) => <li key={event.id}><Link
            href={`/espace/journal?shop=${result.auditShopId}&q=${encodeURIComponent(term)}`}>
            {event.module} · {event.action} · {event.occurredAt.slice(0, 10)} UTC</Link></li>)}</ul>}
        {result.auditShopId && <p><Link href={`/espace/journal?shop=${result.auditShopId}&q=${encodeURIComponent(term)}`}>
          Voir le journal filtré de cette boutique</Link></p>}
      </section>
    </>}
  </main>;
}
