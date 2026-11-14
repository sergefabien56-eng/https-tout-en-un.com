import { describe, expect, it } from 'vitest';
import { formatRoleMatrixCsv } from '@/modules/identity/export-role-matrix';
import { formatShopExportCsv } from '@/modules/identity/export-shops';
import { formatUsersExportCsv } from '@/modules/identity/export-users';
import { formatAuditExportCsv } from '@/modules/audit/export-audit';

const at = '2026-01-02T03:04:05.000Z';
const instant = 'Sans période — instantané';
describe('métadonnées des exports CSV L10', () => {
  it('rôles, utilisateurs et boutiques : périmètre, UTC et absence de période explicites', () => {
    const roles = formatRoleMatrixCsv({ roles: [], permissions: [], grants: {} }, at);
    const users = formatUsersExportCsv({ exportedAt: at, term: '=cmd', status: 'active', role: 'owner', users: [] });
    const shops = formatShopExportCsv({ exportedAt: at, q: '+1', status: undefined, sort: 'name-asc', shops: [] });
    for (const csv of [roles, users, shops]) {
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv.split('\r\n')[0]).toContain('"Périmètre"');
      expect(csv.split('\r\n')[0]).toContain('"Exporté le UTC"');
      expect(csv.split('\r\n')[0]).toContain('"Période"');
      expect(csv.split('\r\n')[1]).toContain(`"${at}"`);
      expect(csv.split('\r\n')[1]).toContain(`"${instant}"`);
    }
    expect(users).toContain('"\'=cmd","active","owner"');
    expect(shops).toContain('"\'+1","Tous","name-asc"');
  });
  it('journal : boutique, bornes UTC inclusives, date et tous les filtres sans formule', () => {
    const csv = formatAuditExportCsv({ shopId: '7', exportedAt: at,
      filters: { from: '2026-01-01', to: '2026-01-02', q: '=cmd', module: 'shops', actorId: '5', result: 'failure' }, rows: [] });
    const [header, meta] = csv.split('\r\n');
    expect(header).toContain('"Période début UTC","Période fin UTC (incluse)"');
    expect(header).toContain('"Module filtré","Acteur filtré"');
    expect(meta).toBe(`"7","2026-01-01","2026-01-02","${at}","'=cmd","failure","shops","5"`);
    const unbounded = formatAuditExportCsv({ shopId: '7', exportedAt: at, filters: {}, rows: [] });
    expect(unbounded.split('\r\n')[1]).toBe(`"7","Non filtrée","Non filtrée","${at}","Non filtrée","Tous","Tous","Tous"`);
  });
});
