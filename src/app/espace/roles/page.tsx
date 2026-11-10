import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getRoleMatrix } from '@/modules/identity/role-matrix';
import { AppError } from '@/core/errors/app-error';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  let matrix: Awaited<ReturnType<typeof getRoleMatrix>>;
  try { matrix = await getRoleMatrix((await cookies()).get('toutenun_session')?.value); }
  catch (error) {
    if (error instanceof AppError && error.httpStatus === 401) redirect('/connexion');
    if (error instanceof AppError && error.httpStatus === 403) notFound();
    throw error;
  }
  return <main className="workspace-main">
    <span className="tag">Administration</span>
    <h1>Rôles et permissions</h1>
    <p>Les droits ci-dessous proviennent de la base. Les rôles système ne sont pas modifiables depuis cette page.</p>
    {matrix.roles.length === 0 || matrix.permissions.length === 0
      ? <div role="status" className="card"><h2>Rôles indisponibles</h2>
        <p>Aucun rôle ou permission n’a été configuré.</p></div>
      : <div className="card role-matrix">
        <table>
          <caption>Matrice des autorisations — {matrix.permissions.length} permissions réelles</caption>
          <thead><tr><th scope="col">Permission</th>{matrix.roles.map((r) => <th scope="col" key={r.code}>{r.label}</th>)}</tr></thead>
          <tbody>{matrix.permissions.map((p) => <tr key={p.code}>
            <th scope="row"><strong>{p.label}</strong><small>{p.module} · {p.code}</small></th>
            {matrix.roles.map((r) => <td key={r.code}>
              <span aria-label={`${r.label} — ${p.label} : ${matrix.grants[r.code]?.includes(p.code) ? 'autorisé' : 'non autorisé'}`}>
                {matrix.grants[r.code]?.includes(p.code) ? '✓' : '—'}
              </span>
            </td>)}
          </tr>)}</tbody>
        </table>
      </div>}
  </main>;
}
