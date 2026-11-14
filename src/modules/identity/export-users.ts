/** Export CSV global : champs autorisés uniquement, filtre identique à la liste, borné. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { safeCsvCell } from '@/core/export/safe-csv';
import { parseUserFilters, userFilterWhere, type UserSummary, type UserStatusFilter, type UserRoleFilter } from '@/modules/identity/user-list';

export interface UserExportRow { id: string; display_name: string; email: string; status: UserSummary['status']; created_at: Date | string }
export interface UserExport { users: UserExportRow[]; term: string; status: UserStatusFilter; role: UserRoleFilter; exportedAt: string }

export async function loadAuthorizedUsersExport(
  token: string | undefined, q = '', status = 'all', role = 'all',
): Promise<UserExport> {
  const filters = parseUserFilters(q, status, role);
  return withAuthorizedGlobalTransaction({ token, permission: 'users:read' }, async (db, ctx) => {
    const grant = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_code = rp.role_code
      WHERE ur.user_id = $1 AND ur.shop_id IS NULL AND rp.permission_code = 'reports:export'
    ) AS allowed`, [ctx.userId]);
    if (!grant.rows[0]?.allowed) throw new ForbiddenError('Export non autorisé.');
    const users = await db.query<UserExportRow>(`SELECT id::text, display_name, email, status, created_at FROM users
      WHERE ${userFilterWhere} ORDER BY id DESC LIMIT 10001`,
    [filters.term || null, filters.status, filters.role]);
    if (users.rows.length > 10_000) throw new ValidationError('Export trop volumineux. Réduisez les filtres.');
    return { users: users.rows, ...filters, exportedAt: new Date().toISOString() };
  });
}

export function formatUsersExportCsv(data: UserExport): string {
  const metaColumns = ['Périmètre', 'Exporté le UTC', 'Recherche', 'Statut', 'Rôle'];
  const meta = ['Organisation — droits globaux', data.exportedAt, data.term || 'Non filtrée', data.status, data.role];
  const columns = ['Identifiant', 'Nom', 'Adresse e-mail', 'Statut', 'Créé le UTC'];
  const lines = [metaColumns.map(safeCsvCell).join(','), meta.map(safeCsvCell).join(','), '',
    columns.map(safeCsvCell).join(',')];
  for (const user of data.users) lines.push([
    user.id, user.display_name, user.email, user.status, new Date(user.created_at).toISOString(),
  ].map(safeCsvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export async function exportAuthorizedUsers(token: string | undefined, q = '', status = 'all', role = 'all'): Promise<string> {
  return formatUsersExportCsv(await loadAuthorizedUsersExport(token, q, status, role));
}
