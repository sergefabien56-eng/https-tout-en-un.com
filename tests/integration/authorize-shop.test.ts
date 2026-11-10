/** Test des VRAIES policies RLS, sessions, permissions et audit sur PostgreSQL WASM. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';

let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withShopTransaction: async <T>(shopId: string, task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN;');
    try {
      await db.exec('SET LOCAL ROLE app_user;');
      await db.query("SELECT set_config('app.shop_id', $1, true)", [shopId]);
      const result = await task(db as unknown as PoolClient);
      await db.exec('COMMIT;');
      return result;
    } catch (error) {
      await db.exec('ROLLBACK;');
      throw error;
    }
  },
}));

const { withAuthorizedShopTransaction, withAuditedShopMutation } = await import('@/core/auth/authorize-shop');
const { listShopAudit } = await import('@/modules/audit/list-audit');
const owner = createSessionToken();
const manager = createSessionToken();
const assistant = createSessionToken();
const revoked = createSessionToken();
let shop1 = ''; let shop2 = '';

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  await db.exec(`
    INSERT INTO marketplace_apps (label, client_id) VALUES ('test seulement', 'test-client');
    INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
    VALUES (1, gen_random_uuid(), 'test-ci', 'CI', 'XOF', 'Boutique A'),
           (1, gen_random_uuid(), 'test-sn', 'SN', 'XOF', 'Boutique B');
    INSERT INTO users (email, password_hash, display_name) VALUES
      ('owner@test.invalid', 'hash', 'Propriétaire'),
      ('manager@test.invalid', 'hash', 'Gestionnaire'),
      ('assistant@test.invalid', 'hash', 'Assistant');
    INSERT INTO user_roles (user_id, role_code) VALUES (1, 'owner'), (2, 'manager');
  `);
  const ids = await db.query<{ id: string }>('SELECT id::text FROM shops ORDER BY id');
  shop1 = ids.rows[0]!.id; shop2 = ids.rows[1]!.id;
  await db.query('INSERT INTO user_roles (user_id, role_code, shop_id) VALUES (3, $1, $2)', ['assistant', shop2]);
  await db.query('INSERT INTO user_shop_access (user_id, shop_id) VALUES ($1, $2), ($3, $4)',
    [2, shop1, 3, shop2]);
  for (const [id, session] of [[1, owner], [2, manager], [3, assistant], [2, revoked]] as const) {
    await db.query(`INSERT INTO sessions (user_id, token_hash, expires_at, revoked_at)
      VALUES ($1, $2, now() + interval '1 hour', $3)`, [id, session.hash, session === revoked ? new Date() : null]);
  }
  await db.exec(`CREATE ROLE app_user NOLOGIN;
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
});
afterAll(async () => { await db.close(); });

const name = (token: string | undefined, shopId: string, permission: string) =>
  withAuthorizedShopTransaction({ token, shopId, permission }, (client, ctx) =>
    client.query<{ display_name: string }>('SELECT display_name FROM shops WHERE id = $1', [ctx.shopId])
      .then((r) => r.rows[0]?.display_name));

describe('porte serveur : session + shop + permission + RLS dans la même transaction', () => {
  it('le propriétaire global voit les deux boutiques', async () => {
    expect(await name(owner.token, shop1, 'shops:read')).toBe('Boutique A');
    expect(await name(owner.token, shop2, 'shops:read')).toBe('Boutique B');
  });
  it('gestionnaire global mais limité à A ne voit jamais B, même avec sa permission', async () => {
    expect(await name(manager.token, shop1, 'shops:read')).toBe('Boutique A');
    await expect(name(manager.token, shop2, 'shops:read')).rejects.toThrow(/Boutique introuvable ou non autorisée/);
  });
  it('gestionnaire ne peut pas administrer le système, même sur A', async () => {
    await expect(name(manager.token, shop1, 'system:manage')).rejects.toThrow(/Action non autorisée/);
  });
  it('assistant avec rôle B n’accède pas à A ; permission d’écriture refusée sur B', async () => {
    expect(await name(assistant.token, shop2, 'shops:read')).toBe('Boutique B');
    await expect(name(assistant.token, shop1, 'shops:read')).rejects.toThrow(/non autorisée/);
    await expect(name(assistant.token, shop2, 'shops:write')).rejects.toThrow(/Action non autorisée/);
  });
  it('session absente ou révoquée : 401 avant tout callback', async () => {
    await expect(name(undefined, shop1, 'shops:read')).rejects.toMatchObject({ httpStatus: 401 });
    await expect(name(revoked.token, shop1, 'shops:read')).rejects.toMatchObject({ httpStatus: 401 });
  });
  it('boutique inexistante : même message neutre qu’une boutique interdite', async () => {
    await expect(name(manager.token, '999', 'shops:read')).rejects.toThrow(/Boutique introuvable ou non autorisée/);
  });
  it('mutation et audit sont atomiques ; secret expurgé avant écriture dans le journal', async () => {
    const change = { module: 'shops', action: 'shops.rename', entityType: 'shop',
      before: { displayName: 'Boutique A' }, after: { displayName: 'Boutique renommée', token: 'secret-à-expurger' } };
    await withAuditedShopMutation({ token: owner.token, shopId: shop1, permission: 'shops:write' },
      change, (client, ctx) => client.query('UPDATE shops SET display_name=$1 WHERE id=$2',
        ['Boutique renommée', ctx.shopId]));
    const audit = await db.query<{ after: { token: string }; actor_user_id: string; shop_id: string }>(
      "SELECT after, actor_user_id, shop_id FROM audit_log WHERE action='shops.rename'");
    expect(audit.rows[0]?.after.token).toBe('[redacted]');
    expect(String(audit.rows[0]?.shop_id)).toBe(shop1);
    expect(String(audit.rows[0]?.actor_user_id)).toBe('1');
  });
  it('si INSERT audit échoue, la mutation est annulée', async () => {
    await expect(withAuditedShopMutation({ token: owner.token, shopId: shop1, permission: 'shops:write' },
      { module: 'shops', action: '', entityType: 'shop' }, (client, ctx) =>
        client.query('UPDATE shops SET display_name=$1 WHERE id=$2', ['Changement interdit', ctx.shopId])),
    ).rejects.toThrow(/audit_log_action_nonvide_ck/);
    expect(await name(owner.token, shop1, 'shops:read')).toBe('Boutique renommée');
  });
  it('lecture du journal : filtre boutique + RLS et permissions, aucun avant/après exposé', async () => {
    await db.query("INSERT INTO audit_log (shop_id, module, action, before) VALUES ($1, 'shops', 'test.b', '{\"secret\":\"non exposer\"}')", [shop2]);
    await db.query("INSERT INTO audit_log (shop_id, module, action) VALUES (NULL, 'system', 'global')");
    const a = await listShopAudit({ token: owner.token, shopId: shop1, page: 1 });
    expect(a.events.some((entry) => entry.action === 'shops.rename')).toBe(true);
    expect(a.events.every((entry) => entry.shopId === shop1)).toBe(true);
    expect(JSON.stringify(a)).not.toContain('non exposer');
    expect(a.events.map((entry) => entry.action)).not.toContain('global');
    expect(a.events.map((entry) => entry.action)).not.toContain('test.b');
    expect((await listShopAudit({ token: owner.token, shopId: shop2, page: 1 })).events.map((entry) => entry.action)).toContain('test.b');
    expect((await listShopAudit({ token: manager.token, shopId: shop1, page: 1, module: 'shops' })).events.length).toBeGreaterThan(0);
    await expect(listShopAudit({ token: manager.token, shopId: shop2, page: 1 })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listShopAudit({ token: assistant.token, shopId: shop2, page: 1 })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listShopAudit({ token: undefined, shopId: shop1, page: 1 })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listShopAudit({ token: owner.token, shopId: shop1, page: 0 })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listShopAudit({ token: owner.token, shopId: shop1, page: 1, module: "x' OR 1=1 --" })).rejects.toMatchObject({ httpStatus: 400 });
  });

});
