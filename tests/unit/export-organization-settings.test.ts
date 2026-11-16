import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { formatOrganizationSettingsCsv } from '@/modules/identity/export-organization-settings';
import { formatOrganizationSettingsXlsx } from '@/modules/identity/export-organization-settings-xlsx';

const date = '2026-11-15T10:00:00.000Z';
describe('exports des paramètres d’organisation', () => {
  it.each(['=cmd', '+1', '@x', '-1', '  =cmd'])('neutralise %s dans les deux formats', async (name) => {
    const data = { name, timezone: 'UTC' as const, currency: null, exportedAt: date };
    const csv = formatOrganizationSettingsCsv(data);
    expect(csv).toContain(`"'${name}"`);
    expect(csv).toContain('"Sans période — instantané"');
    expect(csv).toContain(`"${date}"`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await formatOrganizationSettingsXlsx(data)).buffer);
    const sheet = workbook.getWorksheet('Paramètres')!;
    expect(sheet.getCell('B1').value).toBe('Organisation — droits globaux');
    expect(sheet.getCell('B2').value).toBe('Sans période — instantané');
    expect(sheet.getCell('B3').value).toBe(date);
    expect(sheet.getCell('B5').value).toBe(`'${name}`);
    expect(sheet.getCell('B6').value).toBe('UTC');
    sheet.eachRow((row) => row.eachCell((cell) => expect(cell.type).not.toBe(ExcelJS.ValueType.Formula)));
  });
  it('indique les paramètres absents sans inventer de valeur', async () => {
    const data = { name: null, timezone: null, currency: null, exportedAt: date };
    const csv = formatOrganizationSettingsCsv(data);
    expect(csv.match(/Non configuré/g)).toHaveLength(3);
    expect(csv).not.toMatch(/notifications|apparence/i);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load((await formatOrganizationSettingsXlsx(data)).buffer);
    const sheet = workbook.getWorksheet('Paramètres')!;
    expect(sheet.getCell('B5').value).toBe('Non configuré');
    expect(sheet.getCell('B6').value).toBe('Non configuré');
    expect(sheet.getCell('B7').value).toBe('Non configurée');
    expect(sheet.rowCount).toBe(7);
  });
  it('conserve le texte Unicode et échappe les guillemets du CSV', async () => {
    const data = { name: 'Épicerie "A" 🛒', timezone: 'Africa/Abidjan' as const, currency: null, exportedAt: date };
    expect(formatOrganizationSettingsCsv(data)).toContain('"Épicerie ""A"" 🛒"');
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load((await formatOrganizationSettingsXlsx(data)).buffer);
    expect(workbook.getWorksheet('Paramètres')!.getCell('B5').value).toBe(data.name);
  });
});
