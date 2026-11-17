/** Classeur Excel du journal global ; textes assainis pour XML et neutralisés. */
import ExcelJS from 'exceljs';
import { ValidationError } from '@/core/errors/app-error';
import { safeXlsxText } from '@/core/export/safe-xlsx';
import { GLOBAL_EXPORT_COLUMNS, globalExportMeta, type GlobalAuditExport } from '@/modules/audit/export-global-audit';

export async function formatGlobalAuditXlsx(data: GlobalAuditExport): Promise<Uint8Array<ArrayBuffer>> {
  if (data.rows.length > 10_000) throw new ValidationError('Export trop volumineux. Réduisez la période.');
  const workbook = new ExcelJS.Workbook();
  const meta = globalExportMeta(data);
  const sheet = workbook.addWorksheet('Journal global', { views: [{ state: 'frozen', ySplit: meta.length + 2 }] });
  const add = (values: string[]) => sheet.addRow(values.map(safeXlsxText));
  for (const [label, value] of meta) add([label, value]);
  add([...GLOBAL_EXPORT_COLUMNS]);
  for (const row of data.rows)
    add([row.id, row.occurredAt, row.actorUserId ?? '', row.module, row.action, row.entityType ?? '', row.result]);
  sheet.getRow(meta.length + 2).font = { bold: true };
  sheet.columns.forEach((column, i) => { column.width = i === 1 || i === 4 ? 32 : 22; });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
