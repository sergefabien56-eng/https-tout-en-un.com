/** Membres boutique : contrôle réel RLS sous rôle applicatif non-BYPASSRLS (PGlite). */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';
let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withShopTransaction: async <T>(shopId: string, task: (client: PoolClient) => Promise<T>) => {
    await db.exec('BEGIN; SET LOCAL ROLE app_user;');
    try { await db.query("SELECT set_config('app.shop_id',$1,true)", [shopId]);
      const result = await task(db as unknown as PoolClient); await db.exec('COMMIT;'); return result;
    } catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));
const { listShopMembers } = await import('@/modules/identity/shop-members');
const { GET } = await import('@/app/api/shops/[shopId]/members/route');
const owner = createSessionToken(), delegate = createSessionToken(), outsider = createSessionToken(), revoked = createSessionToken();
beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'));
  await db.exec(`INSERT INTO marketplace_apps (label,client_id) VALUES ('fixture','fixture');
    INSERT INTO shops (app_id,jumia_shop_sid,business_client_code,country_code,currency,display_name) VALUES
      (1,gen_random_uuid(),'test-a','CI','XOF','Boutique A'),(1,gen_random_uuid(),'test-b','SN','XOF','Boutique B');
    INSERT INTO users (email,password_hash,display_name) VALUES
      ('owner@test.invalid','hidden','Owner'),('delegate@test.invalid','hidden','Délégué A'),
      ('member@test.invalid','hidden','Membre A'),('private-b@test.invalid','hidden','Membre B'),
      ('no-access@test.invalid','hidden','Aucun accès'),('disabled@test.invalid','hidden','Accès désactivé'),
      ('invited@test.invalid','hidden','Invitation'),('suspended@test.invalid','hidden','Membre suspendu');
    UPDATE users SET status='invited' WHERE id=7;
    UPDATE users SET status='suspended' WHERE id=8;
    INSERT INTO role_permissions (role_code,permission_code) VALUES ('manager','roles:manage');
    INSERT INTO user_roles (user_id,role_code,shop_id) VALUES (1,'owner',NULL),(2,'manager',1),(3,'manager',NULL),
      (3,'assistant',1),(3,'stock_manager',2),(4,'assistant',2),(5,'assistant',NULL),(6,'assistant',1),(8,'assistant',1);
    INSERT INTO user_shop_access (user_id,shop_id,can_view) VALUES
      (2,1,true),(3,1,true),(4,2,true),(6,1,false),(7,1,true),(8,1,true);
    CREATE ROLE app_user NOLOGIN; GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
  for (const [id, session, revokedAt] of [[1,owner,null],[2,delegate,null],[4,outsider,null],[2,revoked,new Date()]] as const)
    await db.query("INSERT INTO sessions (user_id,token_hash,expires_at,revoked_at) VALUES ($1,$2,now()+interval '1 hour',$3)", [id,session.hash,revokedAt]);
});
afterAll(async () => { await db.close(); });
describe('membres dans une seule boutique', () => {
  it('n’expose que les accès actifs, avec rôles de la boutique et aucun rôle global', async () => {
    const result = await listShopMembers({ token: delegate.token, shopId: '1' });
    expect(result.members.map((m) => m.email).sort()).toEqual(['delegate@test.invalid','member@test.invalid','suspended@test.invalid']);
    const member = result.members.find((m) => m.email === 'member@test.invalid');
    expect(member?.shopRoles.map((r) => r.code)).toEqual(['assistant']);
    expect(result.members.find((m) => m.email === 'suspended@test.invalid')?.status).toBe('suspended');
    expect(JSON.stringify(result)).not.toMatch(/private-b@test|no-access@test|disabled@test|invited@test|password_hash|token_hash|stock_manager/);
    expect((await listShopMembers({ token: owner.token, shopId: '2' })).members.map((m) => m.email)).toEqual(['private-b@test.invalid']);
  });
  it('refuse autre boutique, permission absente et session invalide', async () => {
    await expect(listShopMembers({ token: delegate.token, shopId: '2' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listShopMembers({ token: outsider.token, shopId: '2' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listShopMembers({ token: undefined, shopId: '1' })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listShopMembers({ token: revoked.token, shopId: '1' })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listShopMembers({ token: owner.token, shopId: '1', page: 0 })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listShopMembers({ token: owner.token, shopId: '999' })).rejects.toMatchObject({ httpStatus: 403 });
  });
  it('borne les résultats et pagine sans déborder sur une autre boutique', async () => {
    await db.exec(`INSERT INTO users (email,password_hash,display_name)
      SELECT 'member-page-' || n || '@test.invalid','hidden','Membre page ' || n FROM generate_series(1,25) n;
      INSERT INTO user_shop_access (user_id,shop_id,can_view)
      SELECT id,1,true FROM users WHERE email LIKE 'member-page-%@test.invalid';`);
    try {
      const first = await listShopMembers({ token: delegate.token, shopId: '1' });
      const second = await listShopMembers({ token: delegate.token, shopId: '1', page: 2 });
      expect(first.members).toHaveLength(20); expect(first.nextPage).toBe(2);
      expect(second.members).toHaveLength(8); expect(second.nextPage).toBeNull();
      expect(new Set([...first.members,...second.members].map((m) => m.id)).size).toBe(28);
      expect(JSON.stringify([...first.members,...second.members])).not.toContain('private-b@test.invalid');
    } finally { await db.exec("DELETE FROM users WHERE email LIKE 'member-page-%@test.invalid'"); }
  });
  it('route JSON non mise en cache et mêmes barrières serveur', async () => {
    const get = (shopId: string, token?: string, page = '1') => GET(new NextRequest(`https://app.example/api/shops/${shopId}/members?page=${page}`, {
      headers: token ? { cookie: `toutenun_session=${token}` } : {},
    }), { params: Promise.resolve({ shopId }) });
    const response = await get('1', delegate.token);
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await get('2', delegate.token)).status).toBe(403);
    expect((await get('1')).status).toBe(401);
    expect((await get('1', delegate.token, '0')).status).toBe(400);
  });
});
