import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getRoleMatrixForPage } from '@/modules/identity/role-matrix';
import { RolePermissionButton } from '@/ui/role-permission-button';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  let data: Awaited<ReturnType<typeof getRoleMatrixForPage>>;
  try { data = await getRoleMatrixForPage((await cookies()).get('toutenun_session')?.value); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 403) notFound();
    throw error;
  }
  const { matrix, canEdit } = data;
  return <main className="workspace-main">
    <span className="tag">Administration</span>
    <h1>Rôles et permissions</h1>
    <p>Les droits proviennent de la base. Seul le Propriétaire peut modifier les quatre autres rôles ; le rôle Propriétaire est protégé.</p>
    <p>Une modification s’applique à tous les comptes ayant ce rôle, globalement ou dans une boutique. Elle ne crée pas d’accès boutique ; d’autres rôles peuvent conserver le même droit.</p>
    <p>La délégation de l’attribution des rôles en boutique n’est pas encore active, même si la permission est accordée. L’export Système reste réservé au Propriétaire.</p>
    <p><a href="/api/admin/roles/export">Exporter la matrice en CSV</a>{' · '}
      <a href="/api/admin/roles/export/xlsx">Exporter la matrice en Excel</a>{' · '}
      <a href="/api/admin/roles/export/pdf">Exporter la matrice en PDF</a> (droits d’export globaux requis).</p>
    {matrix.roles.length === 0 || matrix.permissions.length === 0
      ? <div role="status" className="card"><h2>Rôles indisponibles</h2>
        <p>Aucun rôle ou permission n’a été configuré.</p></div>
      : <div className="card role-matrix" role="region" aria-label="Matrice des autorisations défilant horizontalement" tabIndex={0}>
        <table>
          <caption>Matrice des autorisations — {matrix.permissions.length} permissions réelles</caption>
          <thead><tr><th scope="col">Permission</th>{matrix.roles.map((r) => <th scope="col" key={r.code}>{r.label}</th>)}</tr></thead>
          <tbody>{matrix.permissions.map((p) => <tr key={p.code}>
            <th scope="row"><strong>{p.label}</strong><small>{p.module} · {p.code}</small></th>
            {matrix.roles.map((r) => <td key={r.code}>
              {canEdit && ['manager', 'stock_manager', 'accountant', 'assistant'].includes(r.code)
                ? <RolePermissionButton roleCode={r.code} roleLabel={r.label} permissionCode={p.code}
                    permissionLabel={p.label} granted={!!matrix.grants[r.code]?.includes(p.code)} />
                : <span aria-label={`${r.label} — ${p.label} : ${matrix.grants[r.code]?.includes(p.code) ? 'autorisé' : 'non autorisé'}`}>
                    {matrix.grants[r.code]?.includes(p.code) ? '✓' : '—'}
                  </span>}
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>}
  </main>;
}
