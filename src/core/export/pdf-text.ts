import type { PDFFont } from 'pdf-lib';
import { ValidationError } from '@/core/errors/app-error';
import { safeSpreadsheetText } from '@/core/export/safe-csv';

/** Pas de troncature, de caractère de contrôle ou de glyphe manquant silencieux. */
export function validatePdfText(value: string, supported: Set<number>, maxCharacters: number): string {
  if (Array.from(value).length > maxCharacters || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(value))
    throw new ValidationError('Un libellé est trop long ou contient un caractère non pris en charge pour le PDF.');
  if (Array.from(value).some((char) => !supported.has(char.codePointAt(0)!)))
    throw new ValidationError('Un caractère ne peut pas être affiché dans le PDF.');
  return safeSpreadsheetText(value);
}

/** Coupe à la largeur réelle sans supprimer de caractère, même dans un mot long. */
export function wrapPdfText(text: string, font: PDFFont, size: number, width: number): string[] {
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
