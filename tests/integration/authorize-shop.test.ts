/** Test des VRAIES policies RLS, sessions, permissions et audit sur PostgreSQL WASM. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';
import { NextRequest } from 'next/server';

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
const { searchAuthorizedAudit } = await import('@/modules/audit/search-audit');
const { exportShopAudit } = await import('@/modules/audit/export-audit');
const { POST: selectShop } = await import('@/app/api/preferences/shop/route');
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
    expect((await listShopAudit({ token: owner.token, shopId: shop1, page: 1, q: 'RENAME' })).events.map((e) => e.action))
      .toEqual(['shops.rename']);
    expect((await listShopAudit({ token: owner.token, shopId: shop2, page: 1, q: 'rename' })).events).toEqual([]);
    expect((await listShopAudit({ token: owner.token, shopId: shop1, page: 2, q: 'rename' })).events).toEqual([]);
    await expect(listShopAudit({ token: manager.token, shopId: shop2, page: 1, q: 'rename' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listShopAudit({ token: owner.token, shopId: shop1, page: 1, q: 'a'.repeat(81) })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listShopAudit({ token: manager.token, shopId: shop2, page: 1 })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listShopAudit({ token: assistant.token, shopId: shop2, page: 1 })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listShopAudit({ token: undefined, shopId: shop1, page: 1 })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listShopAudit({ token: owner.token, shopId: shop1, page: 0 })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listShopAudit({ token: owner.token, shopId: shop1, page: 1, module: "x' OR 1=1 --" })).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('recherche rapide audit : seulement boutique choisie autorisée, jamais globale ni autre compte', async () => {
    const own = await searchAuthorizedAudit(owner.token, 'RENAME', shop1);
    expect(own.auditShopId).toBe(shop1);
    expect(own.audit.map((entry) => entry.action)).toContain('shops.rename');
    expect(own.audit.every((entry) => entry.shopId === shop1)).toBe(true);
    expect(JSON.stringify(own)).not.toMatch(/secret-à-expurger|token_hash|before|after/);
    expect((await searchAuthorizedAudit(owner.token, 'test.b', shop1)).audit).toEqual([]);
    expect((await searchAuthorizedAudit(owner.token, 'test.b', shop2)).audit.map((entry) => entry.action)).toEqual(['test.b']);
    expect((await searchAuthorizedAudit(manager.token, 'test.b', shop2))).toEqual({ audit: [], auditShopId: null });
    expect((await searchAuthorizedAudit(assistant.token, 'test.b', shop2))).toEqual({ audit: [], auditShopId: null });
    expect((await searchAuthorizedAudit(owner.token, 'rename', 'all'))).toEqual({ audit: [], auditShopId: null });
    expect((await searchAuthorizedAudit(owner.token, 'rename', '1 OR 1=1'))).toEqual({ audit: [], auditShopId: null });
    await expect(searchAuthorizedAudit(undefined, 'rename', shop1)).rejects.toMatchObject({ httpStatus: 401 });
  });
  it('sélection par cookie : Origin/CSRF et droit boutique contrôlés avant écriture', async () => {
    const previous = process.env.APP_URL; process.env.APP_URL = 'https://app.example.com';
    try {
      const csrf = createSessionToken().token;
      const request = (token: string, shopId: string, origin = 'https://app.example.com', csrfHeader = csrf) =>
        new NextRequest('https://app.example.com/api/preferences/shop', { method: 'POST',
          headers: { origin, 'content-type': 'application/json',
            cookie: `toutenun_session=${token}; toutenun_csrf=${csrf}`, 'x-csrf-token': csrfHeader },
          body: JSON.stringify({ shopId }) });
      expect((await selectShop(request(owner.token, shop1, 'https://evil.example'))).status).toBe(403);
      expect((await selectShop(request(owner.token, shop1, 'https://app.example.com', 'bad'))).status).toBe(403);
      expect((await selectShop(request(manager.token, shop2))).status).toBe(403);
      const selected = await selectShop(request(manager.token, shop1));
      expect(selected.status).toBe(200);
      expect(selected.cookies.get('toutenun_shop')?.value).toBe(shop1);
      expect(selected.cookies.get('toutenun_shop')?.httpOnly).toBe(true);
    } finally { if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous; }
  });

  it('export CSV : permission double, filtre période et formule neutralisée, sans événement B/global', async () => {
    await db.query("INSERT INTO audit_log (shop_id,module,action,entity_type) VALUES ($1,'shops','=cmd','@hostile')", [shop1]);
    const today = new Date().toISOString().slice(0, 10);
    const csv = await exportShopAudit({ token: manager.token, shopId: shop1, from: today, to: today });
    expect(csv).toContain('Boutique');
    expect(csv).toContain(`"'=cmd"`);
    expect(csv).toContain(`"'@hostile"`);
    expect(csv).not.toContain('test.b');
    expect(csv).not.toContain('rls-global');
    const searched = await exportShopAudit({ token: manager.token, shopId: shop1, q: '=cmd' });
    expect(searched).toContain('Recherche action/module');
    expect(searched).toContain(`"'=cmd"`);
    expect(searched).not.toContain('shops.rename');
    expect(searched).not.toContain('test.b');
    await expect(exportShopAudit({ token: manager.token, shopId: shop2, q: '=cmd' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportShopAudit({ token: manager.token, shopId: shop2 })).rejects.toMatchObject({ httpStatus: 403 });
    // Un rôle ayant audit:read mais pas reports:export ne peut télécharger le journal.
    await db.exec("INSERT INTO role_permissions(role_code,permission_code) VALUES('stock_manager','audit:read');");
    await db.query('INSERT INTO user_roles(user_id,role_code,shop_id) VALUES (3,$1,$2)', ['stock_manager', shop2]);
    expect((await listShopAudit({ token: assistant.token, shopId: shop2, page: 1 })).events.length).toBeGreaterThan(0);
    await expect(exportShopAudit({ token: assistant.token, shopId: shop2 })).rejects.toMatchObject({ httpStatus: 403 });
  });

});
