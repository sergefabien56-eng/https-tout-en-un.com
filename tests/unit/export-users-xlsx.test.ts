import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { formatUsersExportXlsx } from '@/modules/identity/export-users-xlsx';
import type { UserExport } from '@/modules/identity/export-users';

const fixture: UserExport = { exportedAt: '2026-01-01T00:00:00.000Z', term: '=cmd', status: 'active', role: 'manager', users: [
  { id: '1', display_name: '+1', email: '@x', status: 'active', created_at: '2025-01-02T00:00:00.000Z' },
  { id: '2', display_name: '  -x', email: 'fixture@example.invalid', status: 'active', created_at: '2025-01-03T00:00:00.000Z' },
  { id: '3', display_name: 'Émoji 🛒\u0001', email: 'other@example.invalid', status: 'active', created_at: '2025-01-04T00:00:00.000Z' },
] };

describe('export Excel utilisateurs', () => {
  it('préserve périmètre, période, filtres et neutralise les valeurs hostiles', async () => {
    const bytes = await formatUsersExportXlsx(fixture);
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]);
    const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes.buffer);
    const s = book.getWorksheet('Utilisateurs')!;
    expect(s.getCell('B1').value).toBe('Organisation — droits globaux');
    expect(s.getCell('B2').value).toBe('Sans période — instantané');
    expect(s.getCell('B3').value).toBe(fixture.exportedAt);
    expect(s.getCell('B4').value).toBe("'=cmd");
    expect(s.getCell('B5').value).toBe('active'); expect(s.getCell('B6').value).toBe('manager');
    expect(s.getCell('B8').value).toBe("'+1"); expect(s.getCell('C8').value).toBe("'@x");
    expect(s.getCell('E8').value).toBe('2025-01-02T00:00:00.000Z');
    expect(s.getCell('B9').value).toBe("'  -x"); expect(s.getCell('B10').value).toBe('Émoji 🛒�');
    s.eachRow((row) => row.eachCell((cell) => { expect(cell.type).not.toBe(ExcelJS.ValueType.Formula); expect(typeof cell.value).toBe('string'); }));
  });
  it('refuse cellules et exports dépassant les limites', async () => {
    await expect(formatUsersExportXlsx({ ...fixture, term: 'x'.repeat(32768) })).rejects.toThrow('Valeur trop longue');
    await expect(formatUsersExportXlsx({ ...fixture, users: Array(10001).fill(fixture.users[0]!) })).rejects.toThrow('Export trop volumineux');
  });
});
