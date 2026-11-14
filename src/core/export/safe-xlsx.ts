import { ValidationError } from '@/core/errors/app-error';
import { safeSpreadsheetText } from '@/core/export/safe-csv';

/** Chaîne XML 1.0 valide et neutralisée, sans formule ou lien actif. */
export function safeXlsxText(value: string): string {
  // eslint-disable-next-line no-control-regex -- Ces codes sont interdits en XML 1.0.
  const clean = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff\p{Cs}]/gu, '\ufffd');
  const safe = safeSpreadsheetText(clean);
  if (safe.length > 32_767) throw new ValidationError('Valeur trop longue pour cet export.');
  return safe;
}
