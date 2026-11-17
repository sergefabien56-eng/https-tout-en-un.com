/** Journal global : séparation de boutiques vérifiée par RLS sans BYPASSRLS. */
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
const { listGlobalAudit } = await import('@/modules/audit/list-global-audit');
const { GET } = await import('@/app/api/admin/audit/global/route');
const owner = createSessionToken(), manager = createSessionToken(), scoped = createSessionToken(), revoked = createSessionToken();
beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) await db.exec(readFileSync(join(dir, file), 'utf8'));
  await db.exec(`CREATE ROLE audit_test_app NOLOGIN NOBYPASSRLS; GRANT USAGE ON SCHEMA public TO audit_test_app;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO audit_test_app;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO audit_test_app;
    INSERT INTO marketplace_apps (label,client_id) VALUES ('fixture','global-audit');
    INSERT INTO shops (app_id,jumia_shop_sid,business_client_code,country_code,currency,display_name) VALUES
      (1,gen_random_uuid(),'audit-a','CI','XOF','A'),(1,gen_random_uuid(),'audit-b','SN','XOF','B');
    INSERT INTO users (email,password_hash,display_name) VALUES
      ('owner@fixture.invalid','SECRET_HASH','Owner'),('manager@fixture.invalid','x','Manager global'),('scoped@fixture.invalid','x','Manager boutique');
    INSERT INTO user_roles (user_id,role_code,shop_id) VALUES (1,'owner',NULL),(2,'manager',NULL),(3,'manager',1);
    INSERT INTO audit_log (occurred_at,actor_user_id,shop_id,module,action,entity_type,before,after,result,request_id) VALUES
      ('2026-01-01T12:00:00Z',1,NULL,'roles','update_role_permission','role_permission','{"secret":"SECRET_BEFORE"}','{"secret":"SECRET_AFTER"}','success','SECRET_REQUEST'),
      ('2026-01-02T12:00:00Z',1,NULL,'users','manage_directory_access','directory_access',NULL,NULL,'failure',NULL),
      ('2026-01-03T12:00:00Z',3,1,'shop_a','SECRET_SHOP_A','shop',NULL,NULL,'success',NULL),
      ('2026-01-04T12:00:00Z',3,2,'shop_b','SECRET_SHOP_B','shop',NULL,NULL,'success',NULL);`);
  for (const [id, session, revokedAt] of [[1,owner,null],[2,manager,null],[3,scoped,null],[1,revoked,new Date()]] as const)
    await db.query("INSERT INTO sessions (user_id,token_hash,expires_at,revoked_at) VALUES ($1,$2,now()+interval '1 hour',$3)", [id,session.hash,revokedAt]);
});
afterAll(async () => { await db.close(); });
describe('journal global propriétaire', () => {
  it('retourne uniquement les champs limités des événements globaux dans l’ordre', async () => {
    const data = await listGlobalAudit({ token: owner.token, page: 1 });
    expect(data.events.map((r) => r.action)).toEqual(['manage_directory_access', 'update_role_permission']);
    expect(data.events[0]).toMatchObject({ actorUserId: '1', result: 'failure' });
    expect(data.nextPage).toBeNull();
    expect(JSON.stringify(data)).not.toMatch(/SECRET_BEFORE|SECRET_AFTER|SECRET_REQUEST|SECRET_SHOP_A|SECRET_SHOP_B|SECRET_HASH/);
  });
  it('refuse non-propriétaire même avec audit global, rôle boutique et sessions absentes ou révoquées', async () => {
    await expect(listGlobalAudit({ token: manager.token, page: 1 })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listGlobalAudit({ token: scoped.token, page: 1 })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listGlobalAudit({ token: revoked.token, page: 1 })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listGlobalAudit({ token: undefined, page: 1 })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listGlobalAudit({ token: owner.token, page: 0 })).rejects.toMatchObject({ httpStatus: 400 });
  });
  it('filtre recherche littérale, module, acteur, résultat et dates UTC inclusives', async () => {
    const base = { token: owner.token, page: 1 };
    expect((await listGlobalAudit({ ...base, module: 'roles', actorId: '1', from: '2026-01-01', to: '2026-01-01', result: 'success' })).events.map((r) => r.action)).toEqual(['update_role_permission']);
    expect((await listGlobalAudit({ ...base, q: 'DIRECTORY', result: 'failure' })).events.map((r) => r.action)).toEqual(['manage_directory_access']);
    expect((await listGlobalAudit({ ...base, q: '%' })).events).toEqual([]);
    expect((await listGlobalAudit({ ...base, actorId: '2' })).events).toEqual([]);
    await expect(listGlobalAudit({ ...base, from: '2026-01-04', to: '2026-01-01' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listGlobalAudit({ ...base, module: 'roles;DROP' })).rejects.toMatchObject({ httpStatus: 400 });
  });
  it('isole les lignes globales par RLS, y compris sans contexte et sous un autre compte', async () => {
    await db.exec('BEGIN; SET LOCAL ROLE audit_test_app');
    try {
      expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM audit_log')).rows[0]?.n).toBe(0);
      await db.query("SELECT set_config('app.shop_id', '1', true)");
      const shopRows = await db.query<{ action: string }>('SELECT action FROM audit_log ORDER BY id');
      expect(shopRows.rows.map((row) => row.action)).toEqual(['SECRET_SHOP_A']);
      await db.query("SELECT set_config('app.shop_id', '', true)");
      await db.query("SELECT set_config('app.audit_global_user_id', '2', true)");
      expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM audit_log')).rows[0]?.n).toBe(0);
      await db.query("SELECT set_config('app.audit_global_user_id', '1', true)");
      expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM audit_log WHERE shop_id IS NULL')).rows[0]?.n).toBe(2);
      expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM audit_log WHERE shop_id IS NOT NULL')).rows[0]?.n).toBe(0);
      await db.exec('COMMIT');
      await db.exec('BEGIN; SET LOCAL ROLE audit_test_app');
      expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM audit_log')).rows[0]?.n).toBe(0);
    } finally { await db.exec('ROLLBACK'); }
  });
  it('refuse une lecture trompeuse lorsque la policy de migration est absente', async () => {
    await db.exec('DROP POLICY audit_global_owner_read ON audit_log');
    try {
      await expect(listGlobalAudit({ token: owner.token, page: 1 })).rejects.toThrow('Journal global indisponible.');
      const response = await GET(new NextRequest('https://app.example/api/admin/audit/global', {
        headers: { cookie: `toutenun_session=${owner.token}` },
      }));
      expect(response.status).toBe(503); expect(response.headers.get('cache-control')).toBe('no-store');
    } finally {
      const sql = readFileSync(join(process.cwd(), 'drizzle/0016_global_audit_read.up.sql'), 'utf8');
      await db.exec(sql.slice(sql.indexOf('CREATE POLICY audit_global_owner_read'), sql.indexOf('CREATE INDEX audit_log_global_time_id_ix')));
    }
  });
  it('refuse de fonctionner si la RLS est désactivée', async () => {
    await db.exec('ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY');
    try { await expect(listGlobalAudit({ token: owner.token, page: 1 })).rejects.toThrow('Journal global indisponible.'); }
    finally { await db.exec('ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY'); }
  });
  it('respecte la pagination bornée et ne mélange jamais les boutiques', async () => {
    await db.exec("INSERT INTO audit_log (module,action) SELECT 'fixture','page_' || n FROM generate_series(1,25) n");
    const first = await listGlobalAudit({ token: owner.token, page: 1, module: 'fixture' });
    const second = await listGlobalAudit({ token: owner.token, page: 2, module: 'fixture' });
    expect(first.events).toHaveLength(20); expect(first.nextPage).toBe(2);
    expect(second.events).toHaveLength(5); expect(second.nextPage).toBeNull();
    expect(new Set([...first.events,...second.events].map((r) => r.id)).size).toBe(25);
    expect(JSON.stringify([...first.events,...second.events])).not.toMatch(/SECRET_SHOP/);
  });
  it('API protégée, validation des filtres et no-store', async () => {
    const get = (path: string, token?: string) => GET(new NextRequest(`https://app.example/api/admin/audit/global${path}`, {
      headers: token ? { cookie: `toutenun_session=${token}` } : {},
    }));
    const ok = await get('?module=roles', owner.token);
    expect(ok.status).toBe(200); expect(ok.headers.get('cache-control')).toBe('no-store');
    expect((await ok.json() as { events: { action: string }[] }).events.map((r) => r.action)).toEqual(['update_role_permission']);
    expect((await get('', manager.token)).status).toBe(403);
    expect((await get('')).status).toBe(401);
    expect((await get('?page=0', owner.token)).status).toBe(400);
    expect((await get('?from=2026-02-30', owner.token)).status).toBe(400);
  });
});
