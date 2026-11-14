/** Export Excel du même instantané et des mêmes autorisations que l'export CSV. */
import ExcelJS from 'exceljs';
import { ValidationError } from '@/core/errors/app-error';
import { safeXlsxText } from '@/core/export/safe-xlsx';
import { loadAuthorizedRoleMatrixExport } from '@/modules/identity/export-role-matrix';
import type { RoleMatrix } from '@/modules/identity/role-matrix';

export async function formatRoleMatrixXlsx(matrix: RoleMatrix, exportedAt: string): Promise<Uint8Array<ArrayBuffer>> {
  if (matrix.roles.length > 100 || matrix.permissions.length > 1_000)
    throw new ValidationError('Matrice trop volumineuse pour cet export.');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Rôles et permissions', { views: [{ state: 'frozen', ySplit: 4 }] });
  // Valeurs toutes fournies comme chaînes : jamais d'objet {formula: ...} ou lien actif.
  const add = (values: string[]) => sheet.addRow(values.map(safeXlsxText));
  add(['Périmètre', 'Organisation — droits globaux']);
  add(['Période', 'Sans période — instantané']);
  add(['Exporté le UTC', exportedAt]);
  add(['Module', 'Code permission', 'Permission', ...matrix.roles.map((role) => `Rôle : ${role.label} (${role.code})`)]);
  for (const permission of matrix.permissions) {
    add([permission.module, permission.code, permission.label,
      ...matrix.roles.map((role) => matrix.grants[role.code]?.includes(permission.code) ? 'Autorisé' : 'Non autorisé')]);
  }
  sheet.getRow(4).font = { bold: true };
  sheet.columns.forEach((column, index) => { column.width = index === 2 ? 34 : 24; });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function exportRoleMatrixXlsx(token: string | undefined): Promise<Uint8Array<ArrayBuffer>> {
  const { matrix, exportedAt } = await loadAuthorizedRoleMatrixExport(token);
  return formatRoleMatrixXlsx(matrix, exportedAt);
}
