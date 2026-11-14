/** Neutralisation commune des textes exportés vers les tableurs. */
export function safeSpreadsheetText(value: string | null): string {
  const text = value ?? '';
  // L'apostrophe est posée AVANT tout espace/control : aucun préfixe dangereux après trim.
  return /^[\s\uFEFF]*[=+@-]/u.test(text) ? `'${text}` : text;
}

export function safeCsvCell(value: string | null): string {
  const safe = safeSpreadsheetText(value);
  return `"${safe.replaceAll('"', '""')}"`;
}
