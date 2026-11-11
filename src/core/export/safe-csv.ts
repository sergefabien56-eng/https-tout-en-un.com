/** Neutralisation commune des cellules CSV destinées aux tableurs. */
export function safeCsvCell(value: string | null): string {
  const text = value ?? '';
  // L'apostrophe est posée AVANT tout espace/control : aucun préfixe dangereux après trim.
  const safe = /^[\s\uFEFF]*[=+@-]/u.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
