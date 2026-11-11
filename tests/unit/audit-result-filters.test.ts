import { describe, expect, it } from 'vitest';
import { auditQueryParams, auditWhere, parseAuditFilters } from '@/modules/audit/filters';

describe('filtre résultat du journal', () => {
  it('accepte seulement les deux résultats définis par le schéma audit', () => {
    expect(parseAuditFilters({ result: 'success' }).result).toBe('success');
    expect(parseAuditFilters({ result: 'failure' }).result).toBe('failure');
    expect(parseAuditFilters({}).result).toBeUndefined();
    for (const invalid of ['unknown', 'SUCCESS', "failure' OR 1=1 --", '']) {
      expect(() => parseAuditFilters({ result: invalid })).toThrow('Filtres invalides.');
    }
  });
  it('conserve les six paramètres existants et ajoute le résultat en dernier, nullable par défaut', () => {
    expect(auditQueryParams('7', { module: 'shops', result: 'failure', q: ' rename ' }))
      .toEqual(['7', 'shops', null, null, null, 'rename', 'failure']);
    expect(auditQueryParams('7', {})).toEqual(['7', null, null, null, null, null, null]);
    expect(auditWhere).toContain('shop_id = $1');
    expect(auditWhere).toContain('result = $7');
  });
});
