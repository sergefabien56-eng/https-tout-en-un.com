/** PDF des seuls paramètres d'organisation déjà exportés en CSV et Excel. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import { ValidationError } from '@/core/errors/app-error';
import { validatePdfText, wrapPdfText } from '@/core/export/pdf-text';
import { loadAuthorizedOrganizationSettingsExport, type OrganizationSettingsExport } from '@/modules/identity/export-organization-settings';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 36;
const LABEL_WIDTH = 200;
const SIZE = 10;
const LINE_HEIGHT = 14;
const BLUE = rgb(0.12, 0.23, 0.32);
const MAX_FIELD = 254;

export async function formatOrganizationSettingsPdf(data: OrganizationSettingsExport): Promise<Uint8Array<ArrayBuffer>> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const bytes = await readFile(join(process.cwd(), 'assets/fonts/DejaVuSans.ttf'));
  const font = await document.embedFont(bytes, { subset: true });
  const supported = new Set(font.getCharacterSet());
  const safe = (value: string) => validatePdfText(value, supported, MAX_FIELD);
  const meta = [
    'Périmètre : Organisation — droits globaux',
    'Période : Sans période — instantané',
    `Exporté le UTC : ${safe(data.exportedAt)}`,
  ].flatMap((line) => wrapPdfText(line, font, SIZE, PAGE_WIDTH - 2 * MARGIN));
  const rows = [
    ['Nom de l’organisation', safe(data.name ?? 'Non configuré')],
    ['Fuseau horaire de référence', safe(data.timezone ?? 'Non configuré')],
  ];
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawText('Paramètres de l’organisation', { x: MARGIN, y: PAGE_HEIGHT - 48, size: 16, font, color: BLUE });
  const drawLines = (lines: string[], x: number, top: number) => {
    for (const [index, line] of lines.entries()) page.drawText(line, { x, y: top - index * LINE_HEIGHT, size: SIZE, font, color: BLUE });
  };
  drawLines(meta, MARGIN, PAGE_HEIGHT - 72);
  let y = PAGE_HEIGHT - 72 - meta.length * LINE_HEIGHT - 20;
  page.drawRectangle({ x: MARGIN, y: y - 19, width: PAGE_WIDTH - 2 * MARGIN, height: 23, color: rgb(0.92, 0.95, 0.97) });
  drawLines(['Paramètre'], MARGIN + 4, y - 12);
  drawLines(['Valeur'], MARGIN + LABEL_WIDTH + 4, y - 12);
  y -= 23;
  for (const [label, value] of rows) {
    const labels = wrapPdfText(label!, font, SIZE, LABEL_WIDTH - 8);
    const values = wrapPdfText(value!, font, SIZE, PAGE_WIDTH - 2 * MARGIN - LABEL_WIDTH - 8);
    const height = Math.max(labels.length, values.length) * LINE_HEIGHT + 12;
    if (y - height < MARGIN) throw new ValidationError('Une valeur ne tient pas dans le PDF.');
    drawLines(labels, MARGIN + 4, y - 12);
    drawLines(values, MARGIN + LABEL_WIDTH + 4, y - 12);
    y -= height;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.84, 0.87) });
  }
  document.setTitle('Paramètres de l’organisation');
  document.setSubject('Paramètres de l’organisation — instantané');
  return new Uint8Array(await document.save());
}

export async function exportOrganizationSettingsPdf(token: string | undefined): Promise<Uint8Array<ArrayBuffer>> {
  return formatOrganizationSettingsPdf(await loadAuthorizedOrganizationSettingsExport(token));
}
