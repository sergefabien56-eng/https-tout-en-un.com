import { describe, expect, it } from 'vitest';
import { formatRoleMatrixCsv } from '@/modules/identity/export-role-matrix';

const at = '2026-11-12T00:00:00.000Z';
describe('export CSV des rôles', () => {
  it('inclut périmètre, date, rôles et droits effectifs sans inventer des grants', () => {
    const csv = formatRoleMatrixCsv({
      roles: [{ code: 'owner', label: 'Propriétaire', isSystem: true },
        { code: 'assistant', label: 'Assistant', isSystem: true }],
      permissions: [{ code: 'shops:read', label: 'Lire les boutiques', module: 'shops' }],
      grants: { owner: ['shops:read'], assistant: [] },
    }, at);
    expect(csv).toContain('"Organisation — droits globaux","2026-11-12T00:00:00.000Z"');
    expect(csv).toContain('"shops","shops:read","Lire les boutiques","Autorisé","Non autorisé"');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
  });
  it('neutralise les valeurs hostiles et échappe guillemets et sauts de ligne', () => {
    const csv = formatRoleMatrixCsv({
      roles: [{ code: 'role', label: '=cmd', isSystem: false }],
      permissions: [
        { code: 'a', module: '=cmd', label: ' +1' },
        { code: 'b', module: '@x', label: '-2' },
        { code: 'c', module: 'audit', label: '"evil"\nline' },
      ], grants: { role: ['a'] },
    }, at);
    expect(csv).toContain('"\'=cmd","a","\' +1","Autorisé"');
    expect(csv).toContain('"\'@x","b","\'-2","Non autorisé"');
    expect(csv).toContain('"""evil""\nline"');
    expect(csv).not.toContain('"=cmd","a"');
  });
  it('refuse les matrices démesurées', () => {
    expect(() => formatRoleMatrixCsv({ roles: [], permissions: Array.from({ length: 1_001 }, (_, i) =>
      ({ code: String(i), label: '', module: '' })), grants: {} }, at)).toThrow();
  });
});
