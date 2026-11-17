/** CSV du journal global ; cellules neutralisées contre les formules de tableur. */
import { safeCsvCell } from '@/core/export/safe-csv';
import { GLOBAL_EXPORT_COLUMNS, globalExportMeta, type GlobalAuditExport } from '@/modules/audit/export-global-audit';

export function formatGlobalAuditCsv(data: GlobalAuditExport): string {
  const lines: string[] = [];
  for (const [label, value] of globalExportMeta(data)) lines.push([label, value].map(safeCsvCell).join(','));
  lines.push('', GLOBAL_EXPORT_COLUMNS.map(safeCsvCell).join(','));
  for (const row of data.rows)
    lines.push([row.id, row.occurredAt, row.actorUserId, row.module, row.action, row.entityType, row.result]
      .map(safeCsvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
