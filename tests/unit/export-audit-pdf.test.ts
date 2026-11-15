import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { formatAuditExportPdf } from '@/modules/audit/export-audit-pdf';
import type { AuditExport } from '@/modules/audit/export-audit';

const fixture: AuditExport = { shopId: '7', exportedAt: '2026-01-02T00:00:00.000Z',
  filters: { from: '2026-01-01', to: '2026-01-02', module: 'shops', actorId: '5', result: 'failure', q: '=cmd' },
  rows: [{ id: '1', occurred_at: '2026-01-01T01:00:00.000Z', actor_user_id: null, module: 'shops',
    action: '+1', entity_type: '@x', result: 'failure' },
  { id: '2', occurred_at: '2026-01-01T02:00:00.000Z', actor_user_id: '5', module: 'shops',
    action: '  -x', entity_type: null, result: 'success' }] };

describe('PDF journal boutique', () => {
  it('dessine périmètre, dates inclusives, filtres et valeurs hostiles neutralisées', async () => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      const bytes = await formatAuditExportPdf(fixture);
      expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-');
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getTitle()).toBe('Journal boutique'); expect(pdf.getPageCount()).toBe(1);
      const lines = draw.mock.calls.map(([text]) => text);
      expect(lines).toContain('Périmètre : Journal de la boutique autorisée');
      expect(lines).toContain('Boutique : 7');
      expect(lines).toContain('Période début UTC : 2026-01-01');
      expect(lines).toContain('Période fin UTC (incluse) : 2026-01-02');
      expect(lines).toContain('Exporté le UTC : 2026-01-02T00:00:00.000Z');
      expect(lines).toContain("Recherche action/module : '=cmd");
      expect(lines).toContain('Module : shops · Acteur : 5 · Résultat : failure');
      expect(lines).toContain("'+1"); expect(lines).toContain("'@x"); expect(lines).toContain("'  -x");
      expect(lines.filter((line) => line === '—')).toHaveLength(2);
    } finally { draw.mockRestore(); }
  });
  it('pagine, répète les en-têtes et affiche explicitement un journal vide', async () => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      const rows = Array.from({ length: 120 }, (_, n) => ({ ...fixture.rows[0]!, id: `${n + 1}`, action: `action-${n + 1}` }));
      const pdf = await PDFDocument.load(await formatAuditExportPdf({ ...fixture, rows }));
      expect(pdf.getPageCount()).toBeGreaterThan(1);
      const lines = draw.mock.calls.map(([text]) => text);
      expect(lines).toContain('action-120'); expect(lines.filter((line) => line === 'Date UTC')).toHaveLength(pdf.getPageCount());
      draw.mockClear();
      await formatAuditExportPdf({ ...fixture, filters: {}, rows: [] });
      const empty = draw.mock.calls.map(([text]) => text);
      expect(empty).toContain('Période fin UTC (incluse) : Non filtrée');
      expect(empty).toContain('Aucun événement ne correspond aux filtres.');
    } finally { draw.mockRestore(); }
  });
  it('refuse les limites dépassées, les dates invalides et les textes illisibles', async () => {
    await expect(formatAuditExportPdf({ ...fixture, rows: Array(1001).fill(fixture.rows[0]!) })).rejects.toThrow('1 000');
    for (const action of ['a'.repeat(255), 'invisible\u0001', 'Émoji 🛒'])
      await expect(formatAuditExportPdf({ ...fixture, rows: [{ ...fixture.rows[0]!, action }] })).rejects.toThrow();
    await expect(formatAuditExportPdf({ ...fixture, rows: [{ ...fixture.rows[0]!, occurred_at: 'date invalide' }] })).rejects.toThrow('date');
    await expect(formatAuditExportPdf({ ...fixture, rows: [{ ...fixture.rows[0]!, actor_user_id: 'W'.repeat(254) }] })).rejects.toThrow('ne tient pas');
    const tall = { ...fixture.rows[0]!, actor_user_id: 'W'.repeat(200) };
    await expect(formatAuditExportPdf({ ...fixture, rows: Array(151).fill(tall) })).rejects.toThrow('trop volumineux');
  });
});
