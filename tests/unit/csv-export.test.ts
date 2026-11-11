import { describe, expect, it } from 'vitest';
import { safeCsvCell } from '@/modules/audit/export-audit';
import { parseAuditFilters } from '@/modules/audit/filters';

describe('export audit : données hostiles et périodes', () => {
  it.each(['=cmd', '+1', '-1', '@x', '\t=cmd', '  =cmd', '\uFEFF@x'])(
    'neutralise une formule tableur %s', (value) => {
      expect(safeCsvCell(value)).toBe(`"'${value}"`);
    });
  it('double les guillemets, conserve UTF-8, ne change pas les textes ordinaires', () => {
    expect(safeCsvCell('Boutique "café"')).toBe('"Boutique ""café"""');
    expect(safeCsvCell(null)).toBe('""');
  });
  it('refuse dates impossibles ou inversées, accepte les bornes UTC', () => {
    expect(parseAuditFilters({ from: '2026-11-01', to: '2026-11-10' })).toMatchObject({ from: '2026-11-01' });
    expect(() => parseAuditFilters({ from: '2026-02-30' })).toThrow();
    expect(() => parseAuditFilters({ from: '2026-11-11', to: '2026-11-10' })).toThrow();
    expect(() => parseAuditFilters({ q: 'a'.repeat(81) })).toThrow();
    expect(() => parseAuditFilters({ q: 'a\n' })).toThrow();
    expect(parseAuditFilters({ q: '=cmd' })).toMatchObject({ q: '=cmd' });
  });
});
