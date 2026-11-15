import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { formatOrganizationSettingsPdf } from '@/modules/identity/export-organization-settings-pdf';

const date = '2026-11-15T10:00:00.000Z';
describe('PDF des paramètres de l’organisation', () => {
  it.each(['=cmd', '+1', '@x', '-1', '  =cmd'])('neutralise %s et conserve le contexte', async (name) => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      const bytes = await formatOrganizationSettingsPdf({ name, timezone: 'Africa/Abidjan', exportedAt: date });
      expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-');
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1); expect(pdf.getTitle()).toBe('Paramètres de l’organisation');
      const lines = draw.mock.calls.map(([text]) => text);
      expect(lines).toContain('Périmètre : Organisation — droits globaux');
      expect(lines).toContain('Période : Sans période — instantané');
      expect(lines).toContain(`Exporté le UTC : ${date}`);
      expect(lines).toContain(`'${name}`); expect(lines).toContain('Africa/Abidjan');
      expect(lines).toContain('Nom de l’organisation'); expect(lines).toContain('Fuseau horaire de référence');
    } finally { draw.mockRestore(); }
  });
  it('indique les paramètres absents sans inventer devise ou notifications', async () => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      await formatOrganizationSettingsPdf({ name: null, timezone: null, exportedAt: date });
      const lines = draw.mock.calls.map(([text]) => text);
      expect(lines.filter((line) => line === 'Non configuré')).toHaveLength(2);
      expect(lines.join(' ')).not.toMatch(/devise|notifications|apparence/i);
    } finally { draw.mockRestore(); }
  });
  it('conserve les caractères accentués et refuse les caractères ou longueurs non affichables', async () => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      await formatOrganizationSettingsPdf({ name: 'Épicerie Test', timezone: 'UTC', exportedAt: date });
      expect(draw.mock.calls.map(([text]) => text)).toContain('Épicerie Test');
    } finally { draw.mockRestore(); }
    for (const name of ['a'.repeat(255), 'invisible\u0001', 'Épicerie 🛒'])
      await expect(formatOrganizationSettingsPdf({ name, timezone: 'UTC', exportedAt: date })).rejects.toThrow();
  });
  it('renvoie une ligne longue à la ligne sans la tronquer', async () => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    const name = 'W'.repeat(100);
    try {
      await formatOrganizationSettingsPdf({ name, timezone: 'UTC', exportedAt: date });
      const chunks = draw.mock.calls.map(([text]) => text).filter((text) => /^W+$/.test(text));
      expect(chunks.length).toBeGreaterThan(1); expect(chunks.join('')).toBe(name);
    } finally { draw.mockRestore(); }
  });
});
