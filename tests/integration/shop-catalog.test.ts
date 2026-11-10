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
  it('un accès boutique révoqué cache immédiatement cette boutique', async () => {
    await db.exec('UPDATE user_shop_access SET can_view = false WHERE user_id = 2;');
    expect((await listOwnShops(manager.token)).shops).toEqual([]);
  });
  it('recherche et statut restent filtrés par droits, sans joker SQL', async () => {
    expect((await listOwnShops(owner.token, 1, { q: ' B ' })).shops.map((s) => s.displayName)).toEqual(['B']);
    expect((await listOwnShops(manager.token, 1, { q: 'B' })).shops).toEqual([]);
    expect((await listOwnShops(owner.token, 1, { q: '%' })).shops).toEqual([]);
    expect((await listOwnShops(owner.token, 1, { status: 'connected' })).shops).toHaveLength(2);
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
    expect((await listOwnShops(manager.token)).shops).toEqual([]);
  });

});
