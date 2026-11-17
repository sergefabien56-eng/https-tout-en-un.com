/** Export du journal global : même périmètre que la lecture, aucun détail, formules neutralisées. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { NextRequest } from 'next/server';
import { createSessionToken } from '@/core/auth/primitives';

let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>) => {
    await db.exec('BEGIN; SET LOCAL ROLE audit_test_app');
    try { const result = await task(db as unknown as PoolClient); await db.exec('COMMIT'); return result; }
    catch (error) { await db.exec('ROLLBACK'); throw error; }
  },
}));

const { loadGlobalAuditExport } = await import('@/modules/audit/export-global-audit');
const { formatGlobalAuditCsv } = await import('@/modules/audit/export-global-audit-csv');
const { formatGlobalAuditXlsx } = await import('@/modules/audit/export-global-audit-xlsx');
const { formatGlobalAuditPdf } = await import('@/modules/audit/export-global-audit-pdf');
const csvRoute = await import('@/app/api/admin/audit/global/export/csv/route');
const xlsxRoute = await import('@/app/api/admin/audit/global/export/xlsx/route');
const pdfRoute = await import('@/app/api/admin/audit/global/export/pdf/route');

const owner = createSessionToken();
const delegated = createSessionToken();
const scoped = createSessionToken();
const revoked = createSessionToken();

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort())
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  await db.exec(`CREATE ROLE audit_test_app NOLOGIN NOBYPASSRLS; GRANT USAGE ON SCHEMA public TO audit_test_app;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO audit_test_app;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO audit_test_app;
    INSERT INTO marketplace_apps (label,client_id) VALUES ('fixture','global-audit-export');
    INSERT INTO shops (app_id,jumia_shop_sid,business_client_code,country_code,currency,display_name) VALUES
      (1,gen_random_uuid(),'export-a','CI','XOF','A');
    INSERT INTO users (email,password_hash,display_name) VALUES
      ('owner@fixture.invalid','SECRET_HASH','Owner'),
      ('delegate@fixture.invalid','x','Délégué audit sans export'),
      ('scoped@fixture.invalid','x','Manager boutique');
    INSERT INTO user_roles (user_id,role_code,shop_id) VALUES
      (1,'owner',NULL),(2,'manager',NULL),(3,'manager',1);
    -- Le délégué possède l'audit global mais PAS reports:export : il ne doit jamais exporter.
    DELETE FROM role_permissions WHERE role_code='manager' AND permission_code='reports:export';
    INSERT INTO audit_log (occurred_at,actor_user_id,shop_id,module,action,entity_type,before,after,result,request_id) VALUES
      ('2026-01-01T12:00:00Z',1,NULL,'roles','update_role_permission','role_permission',
        '{"secret":"SECRET_BEFORE"}','{"secret":"SECRET_AFTER"}','success','SECRET_REQUEST'),
      ('2026-01-02T12:00:00Z',1,NULL,'users','manage_directory_access','directory_access',NULL,NULL,'failure',NULL),
      ('2026-01-03T12:00:00Z',1,NULL,'system','=cmd|calc','formula_cell',NULL,NULL,'success',NULL),
      ('2026-01-04T12:00:00Z',3,1,'shop_a','SECRET_SHOP_A','shop',NULL,NULL,'success',NULL);`);
  for (const [id, session, revokedAt] of [[1, owner, null], [2, delegated, null], [3, scoped, null], [1, revoked, new Date()]] as const)
    await db.query("INSERT INTO sessions (user_id,token_hash,expires_at,revoked_at) VALUES ($1,$2,now()+interval '1 hour',$3)",
      [id, session.hash, revokedAt]);
});
afterAll(async () => { await db.close(); });

describe('export du journal global propriétaire', () => {
  it('exporte uniquement les événements globaux, sans before/after/request_id ni boutique', async () => {
    const data = await loadGlobalAuditExport({ token: owner.token });
    expect(data.rows.map((r) => r.action)).toEqual(['=cmd|calc', 'manage_directory_access', 'update_role_permission']);
    const serialized = JSON.stringify(data);
    expect(serialized).not.toMatch(/SECRET_BEFORE|SECRET_AFTER|SECRET_REQUEST|SECRET_SHOP_A|SECRET_HASH/);
    expect(data.rows.some((r) => r.action === 'SECRET_SHOP_A')).toBe(false);
  });

  it('refuse délégué sans droit d’export, rôle boutique, session révoquée et absence de session', async () => {
    await expect(loadGlobalAuditExport({ token: delegated.token })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(loadGlobalAuditExport({ token: scoped.token })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(loadGlobalAuditExport({ token: revoked.token })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(loadGlobalAuditExport({ token: undefined })).rejects.toMatchObject({ httpStatus: 401 });
  });

  it('applique les mêmes filtres que la lecture et valide les entrées', async () => {
    const byModule = await loadGlobalAuditExport({ token: owner.token, module: 'users' });
    expect(byModule.rows.map((r) => r.action)).toEqual(['manage_directory_access']);
    const byResult = await loadGlobalAuditExport({ token: owner.token, result: 'failure' });
    expect(byResult.rows.map((r) => r.action)).toEqual(['manage_directory_access']);
    const byDate = await loadGlobalAuditExport({ token: owner.token, from: '2026-01-03', to: '2026-01-03' });
    expect(byDate.rows.map((r) => r.action)).toEqual(['=cmd|calc']);
    await expect(loadGlobalAuditExport({ token: owner.token, from: '2026-01-04', to: '2026-01-01' }))
      .rejects.toMatchObject({ httpStatus: 400 });
    await expect(loadGlobalAuditExport({ token: owner.token, module: 'roles;DROP' }))
      .rejects.toMatchObject({ httpStatus: 400 });
  });

  it('neutralise une action commençant par = dans le CSV', async () => {
    const csv = formatGlobalAuditCsv(await loadGlobalAuditExport({ token: owner.token }));
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(`"'=cmd|calc"`);
    expect(csv).not.toMatch(/SECRET_BEFORE|SECRET_SHOP_A/);
    expect(csv.split('\r\n')[0]).toContain('Périmètre');
  });

  it('produit un classeur Excel et un PDF valides et bornés', async () => {
    const data = await loadGlobalAuditExport({ token: owner.token });
    const xlsx = await formatGlobalAuditXlsx(data);
    expect(Buffer.from(xlsx.subarray(0, 2)).toString()).toBe('PK');
    const pdf = await formatGlobalAuditPdf(data);
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe('%PDF-');
    const tooMany = { ...data, rows: Array.from({ length: 1_001 }, (_, i) => ({ ...data.rows[0]!, id: String(i) })) };
    await expect(formatGlobalAuditPdf(tooMany)).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('refuse un export trompeur si la policy RLS attendue manque', async () => {
    await db.exec('DROP POLICY audit_global_owner_read ON audit_log');
    try { await expect(loadGlobalAuditExport({ token: owner.token })).rejects.toThrow('Export global indisponible.'); }
    finally {
      const sql = readFileSync(join(process.cwd(), 'drizzle/0016_global_audit_read.up.sql'), 'utf8');
      await db.exec(sql.slice(sql.indexOf('CREATE POLICY audit_global_owner_read'),
        sql.indexOf('CREATE INDEX audit_log_global_time_id_ix')));
    }
  });

  it('routes protégées : en-têtes de téléchargement, no-store et statuts', async () => {
    const call = (route: typeof csvRoute, query: string, token?: string) => route.GET(
      new NextRequest(`https://app.example/api/admin/audit/global/export/csv${query}`, {
        headers: token ? { cookie: `toutenun_session=${token}` } : {},
      }));

    const csv = await call(csvRoute, '?module=users', owner.token);
    expect(csv.status).toBe(200);
    expect(csv.headers.get('cache-control')).toBe('no-store');
    expect(csv.headers.get('x-content-type-options')).toBe('nosniff');
    expect(csv.headers.get('content-type')).toContain('text/csv');
    expect(csv.headers.get('content-disposition')).toContain('journal-global-proprietaire.csv');

    const xlsx = await call(xlsxRoute as typeof csvRoute, '', owner.token);
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers.get('content-type')).toContain('spreadsheetml');
    const pdf = await call(pdfRoute as typeof csvRoute, '', owner.token);
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');

    expect((await call(csvRoute, '', delegated.token)).status).toBe(403);
    expect((await call(csvRoute, '', scoped.token)).status).toBe(403);
    expect((await call(csvRoute, '')).status).toBe(401);
    expect((await call(csvRoute, '?from=2026-02-30', owner.token)).status).toBe(400);
  });
});
