import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { formatUsersExportPdf } from '@/modules/identity/export-users-pdf';
import type { UserExport } from '@/modules/identity/export-users';

const fixture: UserExport = {
  term: '=cmd', status: 'invited', role: 'manager', exportedAt: '2026-11-15T10:00:00.000Z',
  users: [
    { id: '1', display_name: '+1', email: '@x', status: 'invited', created_at: '2026-11-01T08:00:00.000Z' },
    { id: '2', display_name: 'Élodie Test', email: 'demo@example.invalid', status: 'active', created_at: '2026-11-02T08:00:00.000Z' },
  ],
};

describe('PDF des utilisateurs', () => {
  it('produit un PDF relisible en conservant les métadonnées', async () => {
    const bytes = await formatUsersExportPdf(fixture);
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe('Utilisateurs');
    expect(pdf.getSubject()).toContain('instantané filtré');
  });
  it('pagine une grande liste et accepte un résultat vide', async () => {
    const rows = Array.from({ length: 120 }, (_, n) => ({ ...fixture.users[1]!, id: `${n + 1}`, display_name: `Test ${n + 1}` }));
    expect((await PDFDocument.load(await formatUsersExportPdf({ ...fixture, users: rows }))).getPageCount()).toBeGreaterThan(1);
    expect((await PDFDocument.load(await formatUsersExportPdf({ ...fixture, users: [] }))).getPageCount()).toBe(1);
  });
  it('refuse les lignes trop nombreuses, les valeurs illisibles et les dates invalides', async () => {
    const rows = Array.from({ length: 1_001 }, () => fixture.users[0]!);
    await expect(formatUsersExportPdf({ ...fixture, users: rows })).rejects.toThrow('1 000');
    for (const display_name of ['a'.repeat(255), 'Texte\u0001invisible', 'Chariot 🛒'])
      await expect(formatUsersExportPdf({ ...fixture, users: [{ ...fixture.users[0]!, display_name }] })).rejects.toThrow();
    await expect(formatUsersExportPdf({ ...fixture, users: [{ ...fixture.users[0]!, created_at: 'date invalide' }] })).rejects.toThrow('date');
  });
});
