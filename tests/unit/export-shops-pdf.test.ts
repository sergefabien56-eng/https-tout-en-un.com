import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { formatShopExportPdf } from '@/modules/identity/export-shops-pdf';
import type { ShopExport } from '@/modules/identity/export-shops';

const fixture: ShopExport = { exportedAt: '2026-01-01T00:00:00.000Z', q: '=cmd', status: 'connected', sort: 'name-asc', shops: [
  { id: '1', display_name: '+1', country_code: '@x', currency: 'XOF', status: 'connected' },
  { id: '2', display_name: '  -x', country_code: 'CI', currency: 'XOF', status: 'connected' },
] };

describe('PDF boutiques', () => {
  it('dessine contexte, filtres, données absentes et valeurs hostiles neutralisées', async () => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      const bytes = await formatShopExportPdf(fixture);
      expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-');
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getTitle()).toBe('Boutiques');
      expect(pdf.getPageCount()).toBe(1);
      const lines = draw.mock.calls.map(([text]) => text);
      expect(lines).toContain('Périmètre : Boutiques accessibles et exportables');
      expect(lines).toContain('Période : Sans période — instantané');
      expect(lines).toContain('Exporté le UTC : 2026-01-01T00:00:00.000Z');
      expect(lines).toContain("Recherche : '=cmd");
      expect(lines).toContain('État : connected · Tri : name-asc');
      expect(lines).toContain('Ventes et commandes : — (données Jumia indisponibles)');
      expect(lines).toContain("'+1"); expect(lines).toContain("'@x"); expect(lines).toContain("'  -x");
      expect(lines.filter((line) => line === '—')).toHaveLength(2);
    } finally { draw.mockRestore(); }
  });
  it('pagine sans omettre les lignes et répète les en-têtes ; état vide explicite', async () => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      const shops = Array.from({ length: 120 }, (_, n) => ({ ...fixture.shops[0]!, id: `${n + 1}`, display_name: `Boutique ${n + 1}` }));
      const pdf = await PDFDocument.load(await formatShopExportPdf({ ...fixture, shops }));
      expect(pdf.getPageCount()).toBeGreaterThan(1);
      const lines = draw.mock.calls.map(([text]) => text);
      expect(lines).toContain('Boutique 120');
      expect(lines.filter((line) => line === 'Identifiant')).toHaveLength(pdf.getPageCount());
      draw.mockClear();
      await formatShopExportPdf({ ...fixture, status: undefined, shops: [] });
      const empty = draw.mock.calls.map(([text]) => text);
      expect(empty).toContain('État : Tous · Tri : name-asc');
      expect(empty).toContain('Aucune boutique accessible et exportable ne correspond aux filtres.');
    } finally { draw.mockRestore(); }
  });
  it('refuse trop de lignes ou les valeurs illisibles au lieu de les tronquer', async () => {
    await expect(formatShopExportPdf({ ...fixture, shops: Array(1001).fill(fixture.shops[0]!) })).rejects.toThrow('1 000');
    for (const display_name of ['a'.repeat(255), 'Texte\u0001invisible', 'Boutique 🛒'])
      await expect(formatShopExportPdf({ ...fixture, shops: [{ ...fixture.shops[0]!, display_name }] })).rejects.toThrow();
    await expect(formatShopExportPdf({ ...fixture, q: 'a'.repeat(255) })).rejects.toThrow();
    // Un champ étroit mais valide peut dépasser la hauteur d'une page entière.
    await expect(formatShopExportPdf({ ...fixture, shops: [{ ...fixture.shops[0]!, country_code: 'W'.repeat(254) }] }))
      .rejects.toThrow('ne tient pas');
    // Des lignes hautes atteignent la borne de pages avant la borne de boutiques.
    const tall = { ...fixture.shops[0]!, country_code: 'W'.repeat(200) };
    await expect(formatShopExportPdf({ ...fixture, shops: Array(151).fill(tall) })).rejects.toThrow('trop volumineux');
  });
});
