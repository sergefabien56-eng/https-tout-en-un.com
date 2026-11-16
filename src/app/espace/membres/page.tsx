import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { AppError } from '@/core/errors/app-error';
import { listShopMembers } from '@/modules/identity/shop-members';
export const dynamic = 'force-dynamic';
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ shop?: string; page?: string }> }) {
  const { shop: requested, page = '1' } = await searchParams;
  const store = await cookies();
  const shop = requested ?? store.get('toutenun_shop')?.value;
  const token = store.get('toutenun_session')?.value;
  if (!shop) return <main className="workspace-main"><span className="tag">Administration</span>
    <h1>Membres de la boutique</h1><p>Sélectionnez une boutique autorisée dans le sélecteur. La permission de gestion des rôles est nécessaire dans cette boutique.</p>
    <Link href="/espace/boutiques">Voir mes boutiques</Link></main>;
  if (!/^[1-9]\d{0,18}$/.test(shop) || !/^[1-9]\d{0,4}$/.test(page)) notFound();
  let result: Awaited<ReturnType<typeof listShopMembers>>;
  try { result = await listShopMembers({ token, shopId: shop, page: Number(page) }); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && (error.httpStatus === 403 || error.httpStatus === 400)) notFound();
    throw error;
  }
  const link = (n: number) => `/espace/membres?${new URLSearchParams({ shop, page: String(n) })}`;
  return <main className="workspace-main"><span className="tag">Administration · Boutique n° {shop}</span>
    <h1>Membres de la boutique</h1>
    <p>Comptes actifs ou suspendus ayant déjà une ligne d’accès active à cette boutique. Les autres boutiques et rôles globaux ne sont pas affichés.</p>
    <p>La modification des rôles par un délégué n’est pas encore disponible ; seul le Propriétaire peut actuellement les attribuer.</p>
    <p><Link href="/espace/boutiques">Changer de boutique avec le sélecteur</Link></p>
    {result.members.length === 0 ? <div className="card" role="status"><h2>Aucun membre</h2><p>Aucun compte disposant d’un accès actif n’est enregistré sur cette page.</p></div>
      : <div className="card users-list" role="region" aria-label="Tableau des membres défilant horizontalement" tabIndex={0}>
        <table><caption>Membres enregistrés — page {page}</caption><thead><tr><th scope="col">Nom</th><th scope="col">Adresse e-mail</th>
          <th scope="col">Statut</th><th scope="col">Rôles de cette boutique</th></tr></thead>
          <tbody>{result.members.map((member) => <tr key={member.id}><td>{member.displayName}</td><td>{member.email}</td>
            <td>{member.status === 'active' ? 'Actif' : 'Suspendu'}</td>
            <td>{member.shopRoles.length ? member.shopRoles.map((role) => role.label).join(', ') : 'Aucun rôle boutique'}</td></tr>)}</tbody>
        </table></div>}
    <nav aria-label="Pagination des membres" className="pagination">
      {Number(page) > 1 && <Link href={link(Number(page) - 1)}>Page précédente</Link>}
      {result.nextPage !== null && <Link href={link(result.nextPage)}>Page suivante</Link>}
    </nav>
  </main>;
}
