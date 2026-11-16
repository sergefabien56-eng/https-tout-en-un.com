import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import { ValidationError } from '@/core/errors/app-error';
import { validatePdfText, wrapPdfText } from '@/core/export/pdf-text';
import type { DeepHealth } from '@/modules/monitoring/deep-health';
import { loadAuthorizedSystemExport, systemExportRows } from '@/modules/monitoring/export-system';

export async function formatSystemPdf(data: DeepHealth): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await readFile(join(process.cwd(), 'assets/fonts/DejaVuSans.ttf')), { subset: true });
  const supported = new Set(font.getCharacterSet());
  const safe = (text: string) => validatePdfText(text, supported, 254);
  const rows = systemExportRows(data).map((row) => row.map(safe));
  const page = doc.addPage([595, 842]); const margin = 36; const leftWidth = 200;
  page.drawText('Système — instantané', { x: margin, y: 794, size: 16, font, color: rgb(0.12, 0.23, 0.32) });
  let y = 767;
  for (const [index, row] of rows.entries()) {
    const left = wrapPdfText(row[0]!, font, 10, leftWidth - 8);
    const right = wrapPdfText(row[1]!, font, 10, 595 - margin * 2 - leftWidth - 8);
    const height = Math.max(left.length, right.length) * 13 + 9;
    if (y - height < margin) throw new ValidationError('Une valeur ne tient pas dans le PDF.');
    if (index === 3) page.drawRectangle({ x: margin, y: y - height, width: 595 - margin * 2, height, color: rgb(0.92, 0.95, 0.97) });
    for (const [i, line] of left.entries()) page.drawText(line, { x: margin + 4, y: y - 12 - i * 13, size: 10, font });
    for (const [i, line] of right.entries()) page.drawText(line, { x: margin + leftWidth + 4, y: y - 12 - i * 13, size: 10, font });
    y -= height;
    if (index > 3) page.drawLine({ start: { x: margin, y }, end: { x: 595 - margin, y }, thickness: 0.5, color: rgb(0.8, 0.84, 0.87) });
  }
  doc.setTitle('Système — instantané');
  return new Uint8Array(await doc.save());
}
export async function exportSystemPdf(token: string | undefined): Promise<Uint8Array<ArrayBuffer>> {
  return formatSystemPdf(await loadAuthorizedSystemExport(token));
}
