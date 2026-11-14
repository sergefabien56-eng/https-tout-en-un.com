import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { formatAuditExportXlsx } from '@/modules/audit/export-audit-xlsx';
import type { AuditExport } from '@/modules/audit/export-audit';

const fixture: AuditExport = { shopId: '7', exportedAt: '2026-01-02T00:00:00.000Z',
  filters: { from: '2026-01-01', to: '2026-01-02', module: 'shops', actorId: '5', result: 'failure', q: '=cmd' },
  rows: [{ id: '1', occurred_at: '2026-01-01T01:00:00.000Z', actor_user_id: null, module: 'shops',
    action: '+1', entity_type: '@x', result: 'failure' },
  { id: '2', occurred_at: '2026-01-01T02:00:00.000Z', actor_user_id: '5', module: 'shops',
    action: '  -x', entity_type: 'Émoji 🛒\u0001', result: 'success' }] };

describe('export Excel journal boutique', () => {
  it('préserve périmètre, dates, filtres et neutralise les données hostiles', async () => {
    const bytes = await formatAuditExportXlsx(fixture);
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]);
    const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes.buffer);
    const s = book.getWorksheet('Journal boutique')!;
    expect(s.getCell('B1').value).toBe('7'); expect(s.getCell('B2').value).toBe('2026-01-01');
    expect(s.getCell('B3').value).toBe('2026-01-02'); expect(s.getCell('B4').value).toBe(fixture.exportedAt);
    expect(s.getCell('B5').value).toBe("'=cmd"); expect(s.getCell('B6').value).toBe('shops');
    expect(s.getCell('B7').value).toBe('5'); expect(s.getCell('B8').value).toBe('failure');
    expect(s.getCell('E11').value).toBe("'+1"); expect(s.getCell('F11').value).toBe("'@x");
    expect(s.getCell('E12').value).toBe("'  -x"); expect(s.getCell('F12').value).toBe('Émoji 🛒�');
    s.eachRow((row) => row.eachCell((cell) => { expect(cell.type).not.toBe(ExcelJS.ValueType.Formula); expect(typeof cell.value).toBe('string'); }));
  });
  it('refuse les cellules et exports dépassant les limites', async () => {
    await expect(formatAuditExportXlsx({ ...fixture, filters: { q: 'x'.repeat(32768) } })).rejects.toThrow('Valeur trop longue');
    await expect(formatAuditExportXlsx({ ...fixture, rows: Array(10001).fill(fixture.rows[0]!) })).rejects.toThrow('Export trop volumineux');
  });
});
