/** Export de la matrice réellement affichée : droits globaux + reports:export. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { safeCsvCell } from '@/core/export/safe-csv';
import { loadRoleMatrix, type RoleMatrix } from '@/modules/identity/role-matrix';

/** Sérialisation pure, éprouvable avec des libellés hostiles sans base. */
export function formatRoleMatrixCsv(matrix: RoleMatrix, exportedAt: string): string {
  if (matrix.roles.length > 100 || matrix.permissions.length > 1_000)
    throw new ValidationError('Matrice trop volumineuse pour cet export.');
  const lines = [
    ['Périmètre', 'Exporté le UTC', 'Période'].map(safeCsvCell).join(','),
    ['Organisation — droits globaux', exportedAt, 'Sans période — instantané'].map(safeCsvCell).join(','),
    '',
    ['Module', 'Code permission', 'Permission', ...matrix.roles.map((role) => `Rôle : ${role.label} (${role.code})`)]
      .map(safeCsvCell).join(','),
  ];
  for (const permission of matrix.permissions) {
    lines.push([permission.module, permission.code, permission.label,
      ...matrix.roles.map((role) => matrix.grants[role.code]?.includes(permission.code) ? 'Autorisé' : 'Non autorisé')]
      .map(safeCsvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export async function loadAuthorizedRoleMatrixExport(token: string | undefined): Promise<{ matrix: RoleMatrix; exportedAt: string }> {
  return withAuthorizedGlobalTransaction({ token, permission: 'roles:manage' }, async (db, { userId }) => {
    const grant = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code = ur.role_code
      WHERE ur.user_id = $1 AND ur.shop_id IS NULL AND rp.permission_code = 'reports:export'
    ) AS allowed`, [userId]);
    if (!grant.rows[0]?.allowed) throw new ForbiddenError('Export non autorisé.');
    return { matrix: await loadRoleMatrix(db), exportedAt: new Date().toISOString() };
  });
}

export async function exportRoleMatrix(token: string | undefined): Promise<string> {
  const { matrix, exportedAt } = await loadAuthorizedRoleMatrixExport(token);
  return formatRoleMatrixCsv(matrix, exportedAt);
}
