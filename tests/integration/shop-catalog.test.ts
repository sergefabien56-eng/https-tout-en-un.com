/** Catalogue : l'autorisation et la RLS restent vraies sans contexte boutique. */
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';

let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN;');
    try {
      await db.exec('SET LOCAL ROLE app_user;');
      const result = await task(db as unknown as PoolClient);
      await db.exec('COMMIT;'); return result;
    } catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));
const { listOwnShops } = await import('@/modules/identity/shop-catalog');
const { exportOwnShops } = await import('@/modules/identity/export-shops');
const { searchAuthorizedDirectory } = await import('@/modules/identity/directory-search');
const owner = createSessionToken(), manager = createSessionToken(), limited = createSessionToken();
beforeAll(async () => {
  db = await PGlite.create();
  for (const file of readdirSync(join(process.cwd(), 'drizzle')).filter((f) => f.endsWith('.up.sql')).sort())
    await db.exec(readFileSync(join(process.cwd(), 'drizzle', file), 'utf8'));
  await db.exec(`INSERT INTO marketplace_apps (label, client_id) VALUES ('fixture', 'fixture');
    INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
    VALUES (1, gen_random_uuid(), 'shop-a', 'CI', 'XOF', 'A'),
           (1, gen_random_uuid(), 'shop-b', 'SN', 'XOF', 'B');
    INSERT INTO users (email, password_hash, display_name) VALUES
      ('owner@fixture.invalid', 'hash', 'Owner'),
      ('manager@fixture.invalid', 'hash', 'Manager'),
      ('limited@fixture.invalid', 'hash', 'Limited');
    INSERT INTO user_roles (user_id, role_code, shop_id) VALUES
      (1,'owner',NULL),(2,'manager',NULL),(3,'manager',2);
    INSERT INTO user_shop_access (user_id,shop_id) VALUES (2,1),(3,2);
    CREATE ROLE app_user NOLOGIN;
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_user;`);
  for (const [id, session] of [[1,owner],[2,manager],[3,limited]] as const)
    await db.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')", [id,session.hash]);
});
afterAll(async () => { await db.close(); });

describe('catalogue RLS', () => {
  it('owner voit A+B, manager seulement A, rôle B seulement B', async () => {
    expect((await listOwnShops(owner.token)).shops.map((s) => s.displayName)).toEqual(['B','A']);
    expect((await listOwnShops(manager.token)).shops.map((s) => s.displayName)).toEqual(['A']);
    expect((await listOwnShops(limited.token)).shops.map((s) => s.displayName)).toEqual(['B']);
  });
  it('recherche transversale : boutiques RLS et comptes uniquement avec droit global', async () => {
    const shop = await db.query<{ id: string }>(`INSERT INTO shops
      (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
      VALUES (1, gen_random_uuid(), 'search-test', 'CI', 'XOF', 'Recherche Boutique') RETURNING id::text`);
    await db.exec(`INSERT INTO users (email, password_hash, display_name)
      VALUES ('recherche@fixture.invalid','hash','Recherche Compte')`);
    try {
      const own = await searchAuthorizedDirectory(owner.token, ' RECHERCHE ');
      expect(own.shops.map((entry) => entry.displayName)).toEqual(['Recherche Boutique']);
      expect(own.users.map((entry) => entry.email)).toEqual(['recherche@fixture.invalid']);
      expect(JSON.stringify(own)).not.toMatch(/password_hash|token_hash|totp_secret/);
      const global = await searchAuthorizedDirectory(manager.token, 'recherche');
      expect(global.shops).toEqual([]); // Pas d'accès à la nouvelle boutique.
      expect(global.users.map((entry) => entry.email)).toEqual(['recherche@fixture.invalid']);
      const scoped = await searchAuthorizedDirectory(limited.token, 'recherche');
      expect(scoped.shops).toEqual([]);
      expect(scoped.users).toEqual([]); // Le rôle boutique ne donne pas users:read GLOBAL.
      await expect(searchAuthorizedDirectory(undefined, 'recherche')).rejects.toMatchObject({ httpStatus: 401 });
      await expect(searchAuthorizedDirectory(owner.token, 'x')).rejects.toMatchObject({ httpStatus: 400 });
      await expect(searchAuthorizedDirectory(owner.token, 'x'.repeat(81))).rejects.toMatchObject({ httpStatus: 400 });
      await expect(searchAuthorizedDirectory(owner.token, 'recherche\n')).rejects.toMatchObject({ httpStatus: 400 });
      expect((await searchAuthorizedDirectory(owner.token, '%%')).shops).toEqual([]);
    } finally {
      await db.query('DELETE FROM shops WHERE id = $1', [shop.rows[0]!.id]);
      await db.exec("DELETE FROM users WHERE email = 'recherche@fixture.invalid'");
    }
  });
  it('export boutiques : même filtre et tri, RLS + droit par boutique, CSV hostile neutralisé', async () => {
    const fixture = await db.query<{ id: string }>(`INSERT INTO shops
      (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
      VALUES (1, gen_random_uuid(), 'csv-hostile', 'CI', 'XOF', '=cmd') RETURNING id::text`);
    try {
      const ownerCsv = await exportOwnShops(owner.token, { sort: 'name-asc' });
      expect(ownerCsv).toContain('"Boutiques accessibles et exportables"');
      expect(ownerCsv).toContain('"\'=cmd","CI","XOF","connected","—"');
      expect(ownerCsv).toContain('"A"');
      expect(ownerCsv).toContain('"B"');
      expect((await exportOwnShops(owner.token, { q: 'B', status: '', sort: 'name-desc' }))).toContain('"B"');
      const scoped = await exportOwnShops(limited.token);
      expect(scoped).toContain('"B"');
      expect(scoped).not.toContain('"A"');
      expect(scoped).not.toContain('"\'=cmd"');
      await expect(exportOwnShops(undefined)).rejects.toMatchObject({ httpStatus: 401 });
      await expect(exportOwnShops(owner.token, { sort: 'name;DELETE' })).rejects.toMatchObject({ httpStatus: 400 });
      await expect(exportOwnShops(owner.token, { status: 'bad' })).rejects.toMatchObject({ httpStatus: 400 });
      await db.exec("DELETE FROM role_permissions WHERE role_code='manager' AND permission_code='reports:export'");
      try { await expect(exportOwnShops(limited.token)).rejects.toMatchObject({ httpStatus: 403 }); }
      finally { await db.exec("INSERT INTO role_permissions (role_code,permission_code) VALUES ('manager','reports:export')"); }
    } finally { await db.query('DELETE FROM shops WHERE id = $1', [fixture.rows[0]!.id]); }
  });
  it('un accès boutique révoqué cache immédiatement cette boutique', async () => {
    await db.exec('UPDATE user_shop_access SET can_view = false WHERE user_id = 2;');
    expect((await listOwnShops(manager.token)).shops).toEqual([]);
  });
  it('recherche et statut restent filtrés par droits, sans joker SQL', async () => {
    expect((await listOwnShops(owner.token, 1, { q: ' B ' })).shops.map((s) => s.displayName)).toEqual(['B']);
    expect((await listOwnShops(manager.token, 1, { q: 'B' })).shops).toEqual([]);
    expect((await listOwnShops(owner.token, 1, { q: '%' })).shops).toEqual([]);
    expect((await listOwnShops(owner.token, 1, { status: 'connected' })).shops).toHaveLength(2);
    expect((await listOwnShops(owner.token, 1, { q: '', status: '', sort: 'name-asc' })).shops.map((s) => s.displayName))
      .toEqual(['A', 'B']);
    expect((await listOwnShops(owner.token, 1, { sort: 'name-asc' })).shops.map((s) => s.displayName)).toEqual(['A', 'B']);
    expect((await listOwnShops(owner.token, 1, { sort: 'name-desc' })).shops.map((s) => s.displayName)).toEqual(['B', 'A']);
    expect((await listOwnShops(manager.token, 1, { sort: 'name-desc' })).shops).toEqual([]);
    expect((await listOwnShops(limited.token, 1, { sort: 'name-asc' })).shops.map((s) => s.displayName)).toEqual(['B']);
    await expect(listOwnShops(owner.token, 1, { sort: 'name; DROP TABLE shops' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listOwnShops(owner.token, 1, { status: 'malicious' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listOwnShops(owner.token, 1, { q: 'x'.repeat(81) })).rejects.toMatchObject({ httpStatus: 400 });
  });
  it('absence de session et page invalide sont refusées', async () => {
    await expect(listOwnShops(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listOwnShops(createSessionToken().token)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listOwnShops(owner.token, 0)).rejects.toMatchObject({ httpStatus: 400 });
  });
  it('plus de 100 boutiques : pages bornées et sans doublon', async () => {
    const values = Array.from({ length: 105 }, (_, i) =>
      `(1, gen_random_uuid(), 'volume-${i}', 'CI', 'XOF', 'Volume ${i}')`).join(',');
    await db.exec(`INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name) VALUES ${values};`);
    const first = await listOwnShops(owner.token, 1);
    const second = await listOwnShops(owner.token, 2);
    const third = await listOwnShops(owner.token, 3);
    expect([first.shops.length, second.shops.length, third.shops.length]).toEqual([50, 50, 7]);
    expect([first.nextPage, second.nextPage, third.nextPage]).toEqual([2, 3, null]);
    expect(new Set([...first.shops, ...second.shops, ...third.shops].map((s) => s.id)).size).toBe(107);
    const sortedFirst = await listOwnShops(owner.token, 1, { q: 'Volume', sort: 'name-asc' });
    const sortedSecond = await listOwnShops(owner.token, 2, { q: 'Volume', sort: 'name-asc' });
    const sortedThird = await listOwnShops(owner.token, 3, { q: 'Volume', sort: 'name-asc' });
    const sorted = [...sortedFirst.shops, ...sortedSecond.shops, ...sortedThird.shops];
    expect(sorted).toHaveLength(105);
    expect(new Set(sorted.map((shop) => shop.id)).size).toBe(105);
    expect(sorted.map((shop) => shop.displayName)).toEqual([...sorted.map((shop) => shop.displayName)].sort());
    expect((await listOwnShops(manager.token)).shops).toEqual([]);
  });

});
