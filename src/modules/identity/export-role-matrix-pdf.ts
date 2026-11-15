/** PDF de la matrice : même chargement autorisé que CSV et Excel. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { ValidationError } from '@/core/errors/app-error';
import { safeSpreadsheetText } from '@/core/export/safe-csv';
import { loadAuthorizedRoleMatrixExport } from '@/modules/identity/export-role-matrix';
import type { RoleMatrix } from '@/modules/identity/role-matrix';

// Bornes spécifiques au PDF : chaque groupe de quatre rôles répète la liste de permissions.
const MAX_ROLES = 20;
const MAX_PERMISSIONS = 500;
const MAX_CELL_CHARACTERS = 160;
const MAX_PAGES = 250;
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 36;
const FIRST_COLUMN = 332;
const SIZE = 8;
const LINE_HEIGHT = 11;
const BLUE = rgb(0.12, 0.23, 0.32);

/** Refuse plutôt que tronquer ou afficher un glyphe manquant / contrôle invisible. */
function validateText(value: string, supported: Set<number>): string {
  if (Array.from(value).length > MAX_CELL_CHARACTERS || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(value))
    throw new ValidationError('Un libellé est trop long ou contient un caractère non pris en charge pour le PDF.');
  if (Array.from(value).some((char) => !supported.has(char.codePointAt(0)!)))
    throw new ValidationError('Un caractère de la matrice ne peut pas être affiché dans le PDF.');
  return safeSpreadsheetText(value);
}

/** Coupe les lignes à la largeur exacte sans perdre les caractères. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const character of text) {
    if (current && font.widthOfTextAtSize(current + character, size) > width) {
      lines.push(current); current = character;
    } else current += character;
  }
  if (current || lines.length === 0) lines.push(current);
  return lines;
}

export async function formatRoleMatrixPdf(matrix: RoleMatrix, exportedAt: string): Promise<Uint8Array<ArrayBuffer>> {
  if (matrix.roles.length > MAX_ROLES || matrix.permissions.length > MAX_PERMISSIONS)
    throw new ValidationError('Matrice trop volumineuse pour cet export PDF.');
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  // Fichier distribué avec sa licence ; aucune police ou ressource réseau n'est requise.
  const bytes = await readFile(join(process.cwd(), 'assets/fonts/DejaVuSans.ttf'));
  const font = await document.embedFont(bytes, { subset: true });
  const supported = new Set(font.getCharacterSet());
  const stamp = validateText(exportedAt, supported);
  const roles = matrix.roles.map((role) => ({
    code: role.code, heading: `${validateText(role.label, supported)} (${validateText(role.code, supported)})`,
  }));
  const permissions = matrix.permissions.map((permission) => ({
    code: permission.code,
    label: validateText(permission.label, supported),
    detail: `${validateText(permission.module, supported)} · ${validateText(permission.code, supported)}`,
  }));
  const groups = roles.length ? Array.from({ length: Math.ceil(roles.length / 4) }, (_, i) => roles.slice(i * 4, i * 4 + 4)) : [[]];
  const textWidth = PAGE_WIDTH - 2 * MARGIN;
  let page: PDFPage;
  let y = 0;
  let pageCount = 0;
  const drawLines = (lines: string[], x: number, top: number, size = SIZE) => {
    for (const [index, line] of lines.entries()) page.drawText(line, { x, y: top - index * LINE_HEIGHT, size, font, color: BLUE });
  };
  for (const [groupIndex, group] of groups.entries()) {
    const width = group.length ? (textWidth - FIRST_COLUMN) / group.length : textWidth - FIRST_COLUMN;
    const roleLines = group.map((role) => wrap(role.heading, font, SIZE, width - 8));
    const headerHeight = Math.max(1, ...roleLines.map((lines) => lines.length)) * LINE_HEIGHT + 12;
    const newPage = () => {
      if (++pageCount > MAX_PAGES) throw new ValidationError('Matrice trop volumineuse pour cet export PDF.');
      page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawText('Rôles et permissions', { x: MARGIN, y: PAGE_HEIGHT - 42, size: 15, font, color: BLUE });
      page.drawText('Périmètre : Organisation — droits globaux', { x: MARGIN, y: PAGE_HEIGHT - 62, size: 9, font, color: BLUE });
      page.drawText('Période : Sans période — instantané', { x: MARGIN, y: PAGE_HEIGHT - 76, size: 9, font, color: BLUE });
      page.drawText(`Exporté le UTC : ${stamp}`, { x: MARGIN, y: PAGE_HEIGHT - 90, size: 9, font, color: BLUE });
      page.drawText(`Groupe de rôles ${groupIndex + 1}/${groups.length} · Page ${pageCount}`, {
        x: MARGIN, y: PAGE_HEIGHT - 104, size: 8, font, color: BLUE,
      });
      y = PAGE_HEIGHT - 122;
      page.drawRectangle({ x: MARGIN, y: y - headerHeight + 5, width: textWidth, height: headerHeight, color: rgb(0.92, 0.95, 0.97) });
      drawLines(['Permission / module / code'], MARGIN + 4, y - 5);
      group.forEach((_, i) => drawLines(roleLines[i]!, MARGIN + FIRST_COLUMN + width * i + 4, y - 5));
      y -= headerHeight;
    };
    newPage();
    if (!permissions.length) {
      drawLines(['Aucune permission configurée.'], MARGIN + 4, y - 12);
      continue;
    }
    for (const permission of permissions) {
      const labelLines = wrap(permission.label, font, SIZE, FIRST_COLUMN - 8);
      const detailLines = wrap(permission.detail, font, SIZE, FIRST_COLUMN - 8);
      const lines = [...labelLines, ...detailLines];
      const height = lines.length * LINE_HEIGHT + 10;
      if (y - height < MARGIN) newPage();
      // Une valeur trop longue ne peut déborder ni être discrètement tronquée.
      if (y - height < MARGIN) throw new ValidationError('Un libellé ne tient pas dans le PDF.');
      drawLines(lines, MARGIN + 4, y - 10);
      group.forEach((role, i) => {
        const assigned = Object.hasOwn(matrix.grants, role.code) && Array.isArray(matrix.grants[role.code])
          && matrix.grants[role.code]!.includes(permission.code);
        drawLines([assigned ? 'Autorisé' : 'Non autorisé'], MARGIN + FIRST_COLUMN + width * i + 4, y - 10);
      });
      y -= height;
      page!.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.84, 0.87) });
    }
  }
  document.setTitle('Rôles et permissions');
  document.setSubject('Matrice des droits globaux — instantané');
  return new Uint8Array(await document.save());
}

export async function exportRoleMatrixPdf(token: string | undefined): Promise<Uint8Array<ArrayBuffer>> {
  const { matrix, exportedAt } = await loadAuthorizedRoleMatrixExport(token);
  return formatRoleMatrixPdf(matrix, exportedAt);
}
