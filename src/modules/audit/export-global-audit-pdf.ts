/** PDF du journal global du propriétaire ; mêmes garde-fous que le PDF boutique. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import { ValidationError } from '@/core/errors/app-error';
import { validatePdfText, wrapPdfText } from '@/core/export/pdf-text';
import { globalExportMeta, type GlobalAuditExport } from '@/modules/audit/export-global-audit';

const MAX_ROWS = 1_000;
const MAX_PAGES = 150;
const MAX_FIELD = 254;
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 36;
const WIDTHS = [50, 140, 60, 100, 175, 155, 90] as const;
const LINE_HEIGHT = 11;
const SIZE = 8;
const BLUE = rgb(0.12, 0.23, 0.32);

export async function formatGlobalAuditPdf(data: GlobalAuditExport): Promise<Uint8Array<ArrayBuffer>> {
  if (data.rows.length > MAX_ROWS)
    throw new ValidationError('Export PDF trop volumineux. Réduisez les filtres à 1 000 événements maximum.');
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const bytes = await readFile(join(process.cwd(), 'assets/fonts/DejaVuSans.ttf'));
  const font = await document.embedFont(bytes, { subset: true });
  const supported = new Set(font.getCharacterSet());
  const safe = (value: string) => validatePdfText(value, supported, MAX_FIELD);
  const meta = globalExportMeta(data)
    .map(([label, value]) => `${safe(label)} : ${safe(value)}`)
    .flatMap((line) => wrapPdfText(line, font, SIZE, PAGE_WIDTH - 2 * MARGIN - 8));
  const rows = data.rows.map((row) => {
    const date = new Date(row.occurredAt);
    if (Number.isNaN(date.getTime())) throw new ValidationError('Une date du journal ne peut pas être affichée dans le PDF.');
    return [row.id, date.toISOString(), row.actorUserId ?? '—', row.module, row.action,
      row.entityType ?? '—', row.result].map((value) => safe(value));
  });
  let page: PDFPage;
  let y = 0;
  let pageCount = 0;
  const drawLines = (lines: string[], x: number, top: number) => {
    for (const [index, line] of lines.entries())
      page.drawText(line, { x, y: top - index * LINE_HEIGHT, size: SIZE, font, color: BLUE });
  };
  const newPage = () => {
    if (++pageCount > MAX_PAGES) throw new ValidationError('Export PDF trop volumineux. Réduisez les filtres.');
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText('Journal global — propriétaire', { x: MARGIN, y: PAGE_HEIGHT - 42, size: 15, font, color: BLUE });
    drawLines(meta, MARGIN, PAGE_HEIGHT - 62);
    y = PAGE_HEIGHT - 62 - meta.length * LINE_HEIGHT - 17;
    page.drawText(`Page ${pageCount}`, { x: MARGIN, y, size: SIZE, font, color: BLUE });
    y -= 14;
    page.drawRectangle({ x: MARGIN, y: y - 17, width: PAGE_WIDTH - 2 * MARGIN, height: 20, color: rgb(0.92, 0.95, 0.97) });
    let x = MARGIN;
    ['ID', 'Date UTC', 'Acteur', 'Module', 'Action', 'Entité', 'Résultat'].forEach((heading, index) => {
      drawLines([heading], x + 4, y - 10); x += WIDTHS[index]!;
    });
    y -= 20;
  };
  newPage();
  if (!rows.length) drawLines(['Aucun événement global ne correspond aux filtres.'], MARGIN + 4, y - 12);
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
  document.setTitle('Journal global — propriétaire');
  document.setSubject('Actions globales de l’organisation, hors boutiques — période filtrée');
  return new Uint8Array(await document.save());
}
