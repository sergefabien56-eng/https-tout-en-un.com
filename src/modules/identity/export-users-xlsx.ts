import ExcelJS from 'exceljs';
import { ValidationError } from '@/core/errors/app-error';
import { safeXlsxText } from '@/core/export/safe-xlsx';
import { loadAuthorizedUsersExport, type UserExport } from '@/modules/identity/export-users';

export async function formatUsersExportXlsx(data: UserExport): Promise<Uint8Array<ArrayBuffer>> {
  if (data.users.length > 10_000) throw new ValidationError('Export trop volumineux. Réduisez les filtres.');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Utilisateurs', { views: [{ state: 'frozen', ySplit: 7 }] });
  const add = (values: string[]) => sheet.addRow(values.map(safeXlsxText));
  add(['Périmètre', 'Organisation — droits globaux']);
  add(['Période', 'Sans période — instantané']);
  add(['Exporté le UTC', data.exportedAt]);
  add(['Recherche', data.term || 'Non filtrée']);
  add(['Statut', data.status]);
  add(['Rôle', data.role]);
  add(['Identifiant', 'Nom', 'Adresse e-mail', 'Statut', 'Créé le UTC']);
  for (const user of data.users)
    add([user.id, user.display_name, user.email, user.status, new Date(user.created_at).toISOString()]);
  sheet.getRow(7).font = { bold: true };
  sheet.columns.forEach((column, i) => { column.width = i === 1 || i === 2 ? 34 : 24; });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function exportAuthorizedUsersXlsx(token: string | undefined, q = '', status = 'all', role = 'all'): Promise<Uint8Array<ArrayBuffer>> {
  return formatUsersExportXlsx(await loadAuthorizedUsersExport(token, q, status, role));
}
