/** Export CSV global : champs autorisés uniquement, filtre identique à la liste, borné. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { safeCsvCell } from '@/core/export/safe-csv';
import { parseUserFilters, userFilterWhere, type UserSummary } from '@/modules/identity/user-list';

export async function exportAuthorizedUsers(
  token: string | undefined, q = '', status = 'all', role = 'all',
): Promise<string> {
  const filters = parseUserFilters(q, status, role);
  return withAuthorizedGlobalTransaction({ token, permission: 'users:read' }, async (db, ctx) => {
    const grant = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_code = rp.role_code
      WHERE ur.user_id = $1 AND ur.shop_id IS NULL AND rp.permission_code = 'reports:export'
    ) AS allowed`, [ctx.userId]);
    if (!grant.rows[0]?.allowed) throw new ForbiddenError('Export non autorisé.');
    const users = await db.query<{
      id: string; display_name: string; email: string;
      status: UserSummary['status']; created_at: Date | string;
    }>(`SELECT id::text, display_name, email, status, created_at FROM users
      WHERE ${userFilterWhere} ORDER BY id DESC LIMIT 10001`,
    [filters.term || null, filters.status, filters.role]);
    if (users.rows.length > 10_000) throw new ValidationError('Export trop volumineux. Réduisez les filtres.');
    const metaColumns = ['Périmètre', 'Exporté le UTC', 'Recherche', 'Statut', 'Rôle'];
    const meta = ['Organisation — droits globaux', new Date().toISOString(), filters.term || 'Non filtrée',
      filters.status, filters.role];
    const columns = ['Identifiant', 'Nom', 'Adresse e-mail', 'Statut', 'Créé le UTC'];
    const lines = [metaColumns.map(safeCsvCell).join(','), meta.map(safeCsvCell).join(','), '',
      columns.map(safeCsvCell).join(',')];
    for (const user of users.rows) lines.push([
      user.id, user.display_name, user.email, user.status, new Date(user.created_at).toISOString(),
    ].map(safeCsvCell).join(','));
    return `\uFEFF${lines.join('\r\n')}\r\n`;
  });
}
