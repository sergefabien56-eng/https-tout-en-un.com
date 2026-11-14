import ExcelJS from 'exceljs';
import { ValidationError } from '@/core/errors/app-error';
import { safeXlsxText } from '@/core/export/safe-xlsx';
import { loadAuthorizedAuditExport, type AuditExport, type AuditExportInput } from '@/modules/audit/export-audit';

export async function formatAuditExportXlsx(data: AuditExport): Promise<Uint8Array<ArrayBuffer>> {
  if (data.rows.length > 10_000) throw new ValidationError('Export trop volumineux. Réduisez la période.');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Journal boutique', { views: [{ state: 'frozen', ySplit: 10 }] });
  const add = (values: string[]) => sheet.addRow(values.map(safeXlsxText));
  add(['Boutique', data.shopId]);
  add(['Période début UTC', data.filters.from ?? 'Non filtrée']);
  add(['Période fin UTC (incluse)', data.filters.to ?? 'Non filtrée']);
  add(['Exporté le UTC', data.exportedAt]);
  add(['Recherche action/module', data.filters.q?.trim() || 'Non filtrée']);
  add(['Module filtré', data.filters.module ?? 'Tous']);
  add(['Acteur filtré', data.filters.actorId ?? 'Tous']);
  add(['Résultat filtré', data.filters.result ?? 'Tous']);
  add(['Périmètre', 'Journal de la boutique autorisée']);
  add(['Identifiant', 'Date UTC', 'Acteur', 'Module', 'Action', 'Entité', 'Résultat']);
  for (const row of data.rows)
    add([row.id, new Date(row.occurred_at).toISOString(), row.actor_user_id ?? '', row.module,
      row.action, row.entity_type ?? '', row.result]);
  sheet.getRow(10).font = { bold: true };
  sheet.columns.forEach((column, i) => { column.width = i === 1 || i === 4 ? 32 : 24; });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function exportShopAuditXlsx(input: AuditExportInput): Promise<Uint8Array<ArrayBuffer>> {
  return formatAuditExportXlsx(await loadAuthorizedAuditExport(input));
}
