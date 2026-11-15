import ExcelJS from 'exceljs';
import { safeXlsxText } from '@/core/export/safe-xlsx';
import { loadAuthorizedOrganizationSettingsExport, type OrganizationSettingsExport } from '@/modules/identity/export-organization-settings';

export async function formatOrganizationSettingsXlsx(data: OrganizationSettingsExport): Promise<Uint8Array<ArrayBuffer>> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Paramètres', { views: [{ state: 'frozen', ySplit: 4 }] });
  const add = (values: string[]) => sheet.addRow(values.map(safeXlsxText));
  add(['Périmètre', 'Organisation — droits globaux']);
  add(['Période', 'Sans période — instantané']);
  add(['Exporté le UTC', data.exportedAt]);
  add(['Paramètre', 'Valeur']);
  add(['Nom de l’organisation', data.name ?? 'Non configuré']);
  add(['Fuseau horaire de référence', data.timezone ?? 'Non configuré']);
  sheet.getRow(4).font = { bold: true };
  sheet.columns.forEach((column) => { column.width = 36; });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function exportOrganizationSettingsXlsx(token: string | undefined): Promise<Uint8Array<ArrayBuffer>> {
  return formatOrganizationSettingsXlsx(await loadAuthorizedOrganizationSettingsExport(token));
}
