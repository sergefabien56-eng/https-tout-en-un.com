import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { formatShopExportXlsx } from '@/modules/identity/export-shops-xlsx';
import type { ShopExport } from '@/modules/identity/export-shops';

const fixture: ShopExport = { exportedAt: '2026-01-01T00:00:00.000Z', q: '=cmd', status: undefined, sort: 'name-asc', shops: [
  { id: '1', display_name: '+1', country_code: '@x', currency: 'XOF', status: 'connected' },
  { id: '2', display_name: '  -x', country_code: 'CI', currency: 'XOF', status: 'connected' },
  { id: '3', display_name: 'Émoji 🛒\u0001', country_code: 'CI', currency: 'XOF', status: 'disabled' },
] };

describe('export Excel boutiques', () => {
  it('préserve périmètre, période, filtres, données absentes et neutralise les valeurs hostiles', async () => {
    const data = await formatShopExportXlsx(fixture);
    expect([...data.slice(0, 2)]).toEqual([0x50, 0x4b]);
    const book = new ExcelJS.Workbook(); await book.xlsx.load(data.buffer);
    const sheet = book.getWorksheet('Boutiques')!;
    expect(sheet.getCell('B1').value).toBe('Boutiques accessibles et exportables');
    expect(sheet.getCell('B2').value).toBe('Sans période — instantané');
    expect(sheet.getCell('B3').value).toBe(fixture.exportedAt);
    expect(sheet.getCell('B4').value).toBe("'=cmd");
    expect(sheet.getCell('B5').value).toBe('Tous');
    expect(sheet.getCell('B6').value).toBe('name-asc');
    expect(sheet.getCell('B8').value).toBe("'+1");
    expect(sheet.getCell('C8').value).toBe("'@x");
    expect(sheet.getCell('F8').value).toBe('—');
    expect(sheet.getCell('B9').value).toBe("'  -x");
    expect(sheet.getCell('B10').value).toBe('Émoji 🛒�');
    sheet.eachRow((row) => row.eachCell((cell) => {
      expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
      expect(typeof cell.value).toBe('string');
    }));
  });
  it('refuse les cellules et exports dépassant les limites', async () => {
    await expect(formatShopExportXlsx({ ...fixture, q: 'x'.repeat(32768) })).rejects.toThrow('Valeur trop longue');
    await expect(formatShopExportXlsx({ ...fixture, shops: Array(10001).fill(fixture.shops[0]!) })).rejects.toThrow('Export trop volumineux');
  });
});
