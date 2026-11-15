/** PDF des mêmes boutiques accessibles, exportables et filtrées que les exports CSV et Excel. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import { ValidationError } from '@/core/errors/app-error';
import { validatePdfText, wrapPdfText } from '@/core/export/pdf-text';
import { loadAuthorizedShopExport, type ShopExport, type ShopExportFilters } from '@/modules/identity/export-shops';

const MAX_SHOPS = 1_000;
const MAX_PAGES = 150;
const MAX_FIELD = 254;
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 36;
const WIDTHS = [65, 205, 70, 70, 115, 245] as const;
const LINE_HEIGHT = 11;
const SIZE = 8;
const BLUE = rgb(0.12, 0.23, 0.32);

export async function formatShopExportPdf(data: ShopExport): Promise<Uint8Array<ArrayBuffer>> {
  if (data.shops.length > MAX_SHOPS) throw new ValidationError('Export PDF trop volumineux. Réduisez les filtres à 1 000 boutiques maximum.');
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const bytes = await readFile(join(process.cwd(), 'assets/fonts/DejaVuSans.ttf'));
  const font = await document.embedFont(bytes, { subset: true });
  const supported = new Set(font.getCharacterSet());
  const safe = (value: string) => validatePdfText(value, supported, MAX_FIELD);
  const meta = [
    'Périmètre : Boutiques accessibles et exportables',
    'Période : Sans période — instantané',
    `Exporté le UTC : ${safe(data.exportedAt)}`,
    `Recherche : ${safe(data.q || 'Non filtrée')}`,
    `État : ${safe(data.status ?? 'Tous')} · Tri : ${safe(data.sort)}`,
    'Ventes et commandes : — (données Jumia indisponibles)',
  ].flatMap((line) => wrapPdfText(line, font, SIZE, PAGE_WIDTH - 2 * MARGIN - 8));
  const rows = data.shops.map((shop) => [shop.id, shop.display_name, shop.country_code,
    shop.currency, shop.status, '—'].map((value) => safe(value)));
  let page: PDFPage;
  let y = 0;
  let pageCount = 0;
  const drawLines = (lines: string[], x: number, top: number) => {
    for (const [index, line] of lines.entries()) page.drawText(line, { x, y: top - index * LINE_HEIGHT, size: SIZE, font, color: BLUE });
  };
  const newPage = () => {
    if (++pageCount > MAX_PAGES) throw new ValidationError('Export PDF trop volumineux. Réduisez les filtres.');
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText('Boutiques', { x: MARGIN, y: PAGE_HEIGHT - 42, size: 15, font, color: BLUE });
    drawLines(meta, MARGIN, PAGE_HEIGHT - 62);
    y = PAGE_HEIGHT - 62 - meta.length * LINE_HEIGHT - 17;
    page.drawText(`Page ${pageCount}`, { x: MARGIN, y, size: SIZE, font, color: BLUE });
    y -= 14;
    page.drawRectangle({ x: MARGIN, y: y - 17, width: PAGE_WIDTH - 2 * MARGIN, height: 20, color: rgb(0.92, 0.95, 0.97) });
    let x = MARGIN;
    ['Identifiant', 'Boutique', 'Pays', 'Devise', 'État', 'Ventes et commandes'].forEach((heading, index) => {
      drawLines([heading], x + 4, y - 10); x += WIDTHS[index]!;
    });
    y -= 20;
  };
  newPage();
  if (!rows.length) drawLines(['Aucune boutique accessible et exportable ne correspond aux filtres.'], MARGIN + 4, y - 12);
  for (const row of rows) {
    const cells = row.map((text, index) => wrapPdfText(text, font, SIZE, WIDTHS[index]! - 8));
    const height = Math.max(...cells.map((cell) => cell.length)) * LINE_HEIGHT + 10;
    if (y - height < MARGIN) newPage();
    if (y - height < MARGIN) throw new ValidationError('Une valeur ne tient pas dans le PDF.');
    let x = MARGIN;
    cells.forEach((lines, index) => { drawLines(lines, x + 4, y - 10); x += WIDTHS[index]!; });
    y -= height;
    page!.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.84, 0.87) });
  }
  document.setTitle('Boutiques');
  document.setSubject('Boutiques accessibles et exportables — instantané filtré');
  return new Uint8Array(await document.save());
}

export async function exportOwnShopsPdf(token: string | undefined, filters: ShopExportFilters = {}): Promise<Uint8Array<ArrayBuffer>> {
  return formatShopExportPdf(await loadAuthorizedShopExport(token, filters));
}
