import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { formatRoleMatrixXlsx } from '@/modules/identity/export-role-matrix-xlsx';
import type { RoleMatrix } from '@/modules/identity/role-matrix';

const date = '2026-11-14T10:00:00.000Z';
const fixture: RoleMatrix = {
  roles: [{ code: 'owner', label: 'Propriétaire', isSystem: true },
    { code: 'assistant', label: 'Assistant', isSystem: true }],
  permissions: [
    { module: '=cmd', code: '+1', label: '@x' },
    { module: ' \t-2', code: 'normal', label: 'Émoji 🛒' },
    { module: 'users', code: 'users:read', label: 'Texte\u0001interdit' },
  ], grants: { owner: ['+1', 'users:read'], assistant: [] },
};

describe('export Excel de la matrice des rôles', () => {
  it('produit un fichier Excel relisible : périmètre, période, date, droits, textes hostiles sans formule', async () => {
    const bytes = await formatRoleMatrixXlsx(fixture, date);
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer);
    const sheet = workbook.getWorksheet('Rôles et permissions');
    expect(sheet).toBeDefined();
    expect(sheet!.getCell('B1').value).toBe('Organisation — droits globaux');
    expect(sheet!.getCell('B2').value).toBe('Sans période — instantané');
    expect(sheet!.getCell('B3').value).toBe(date);
    expect(sheet!.getCell('A5').value).toBe("'=cmd");
    expect(sheet!.getCell('B5').value).toBe("'+1");
    expect(sheet!.getCell('C5').value).toBe("'@x");
    expect(sheet!.getCell('D5').value).toBe('Autorisé');
    expect(sheet!.getCell('E5').value).toBe('Non autorisé');
    expect(sheet!.getCell('A6').value).toBe("' \t-2");
    expect(sheet!.getCell('C6').value).toBe('Émoji 🛒');
    expect(sheet!.getCell('C7').value).toBe('Texte\ufffdinterdit');
    sheet!.eachRow((row) => row.eachCell((cell) => {
      expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
      expect(typeof cell.value).toBe('string');
    }));
  });
  it('refuse une matrice ou une cellule au-delà des limites', async () => {
    const huge: RoleMatrix = { roles: [], permissions: Array.from({ length: 1_001 }, (_, i) =>
      ({ code: String(i), module: 'm', label: 'p' })), grants: {} };
    await expect(formatRoleMatrixXlsx(huge, date)).rejects.toThrow('Matrice trop volumineuse');
    const longCell: RoleMatrix = { roles: [], permissions: [{ code: 'x', module: 'x', label: 'a'.repeat(32_768) }], grants: {} };
    await expect(formatRoleMatrixXlsx(longCell, date)).rejects.toThrow('Valeur trop longue');
  });
});
