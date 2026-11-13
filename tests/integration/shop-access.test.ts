/** Accès indépendants : listing sous RLS, révocation atomique et refus — PostgreSQL WASM. */
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
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN;');
    try {
      await db.exec('SET LOCAL ROLE app_user;');
      const result = await task(db as unknown as PoolClient);
      await db.exec('COMMIT;');
      return result;
    } catch (error) {
      await db.exec('ROLLBACK;');
      throw error;
    }
  },
}));

const { listUserShopAccess, revokeShopAccess, grantGlobalRoleShopAccess } = await import('@/modules/identity/shop-access');
const { withAuthorizedShopTransaction } = await import('@/core/auth/authorize-shop');
const owner = createSessionToken();
const manager = createSessionToken();
const assistant = createSessionToken();
let shop1 = '';
let shop2 = '';

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  await db.exec(`
    INSERT INTO marketplace_apps (label, client_id) VALUES ('test seulement', 'test-client');
    INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
    VALUES (1, gen_random_uuid(), 'access-a', 'CI', 'XOF', 'Boutique A'),
           (1, gen_random_uuid(), 'access-b', 'SN', 'XOF', 'Boutique B');
    INSERT INTO users (email, password_hash, display_name) VALUES
      ('owner@test.invalid', 'hash', 'Propriétaire'),
      ('manager@test.invalid', 'hash', 'Gestionnaire'),
      ('assistant@test.invalid', 'hash', 'Assistant'),
      ('invite@test.invalid', 'hash', 'Invité'),
      ('owner2@test.invalid', 'hash', 'Autre propriétaire');
    INSERT INTO user_roles (user_id, role_code) VALUES (1, 'owner'), (2, 'manager'), (5, 'owner');
    UPDATE users SET status = 'invited' WHERE id = 4;
  `);
  const ids = await db.query<{ id: string }>('SELECT id::text FROM shops ORDER BY id');
  shop1 = ids.rows[0]!.id;
  shop2 = ids.rows[1]!.id;
  await db.query('INSERT INTO user_roles (user_id, role_code, shop_id) VALUES (3, $1, $2)', ['assistant', shop2]);
  // Gestionnaire global : accès A issu de son rôle global. Assistant : accès B via rôle
  // boutique, et accès A résiduel indépendant (aucun rôle sur A).
  await db.query('INSERT INTO user_shop_access (user_id, shop_id) VALUES ($1, $2), ($3, $4), ($5, $6)',
    [2, shop1, 3, shop2, 3, shop1]);
  for (const [id, session] of [[1, owner], [2, manager], [3, assistant]] as const) {
    await db.query(`INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, now() + interval '1 hour')`, [id, session.hash]);
  }
  await db.exec(`CREATE ROLE app_user NOLOGIN;
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
});
afterAll(async () => { await db.close(); });

describe('listing des accès boutique avec provenance (Propriétaire global seul)', () => {
  it('distingue accès par rôle boutique, par rôle global et indépendant, avec noms réels', async () => {
    const listed = await listUserShopAccess(owner.token, '3');
    expect(listed.userId).toBe('3');
    expect(listed.accesses).toHaveLength(2);
    const accessA = listed.accesses.find((entry) => entry.shopId === shop1);
    const accessB = listed.accesses.find((entry) => entry.shopId === shop2);
    expect(accessA).toMatchObject({ shopName: 'Boutique A', canView: true, origin: 'independent' });
    expect(accessB).toMatchObject({ shopName: 'Boutique B', canView: true, origin: 'scoped_role' });
    expect(accessA?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const global = await listUserShopAccess(owner.token, '2');
    expect(global.accesses).toMatchObject([{ shopId: shop1, shopName: 'Boutique A', origin: 'global_role' }]);
    expect(JSON.stringify(listed)).not.toMatch(/password_hash|token_hash|totp_secret/i);
  });
  it('refuse non-Propriétaire, session absente et identifiants invalides', async () => {
    await expect(listUserShopAccess(manager.token, '3')).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listUserShopAccess(assistant.token, '3')).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listUserShopAccess(undefined, '3')).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listUserShopAccess(owner.token, '0')).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listUserShopAccess(owner.token, 'abc')).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listUserShopAccess(owner.token, '999')).rejects.toMatchObject({ httpStatus: 404 });
  });
});

describe('révocation d’un accès indépendant (RLS + audit atomique)', () => {
  it('supprime l’accès résiduel, audite une seule fois et préserve rôles et autres accès', async () => {
    await expect(revokeShopAccess({ token: manager.token, userId: '3', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 403 });
    await expect(revokeShopAccess({ token: assistant.token, userId: '3', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 403 });
    await expect(revokeShopAccess({ token: undefined, userId: '3', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 401 });
    await expect(revokeShopAccess({ token: owner.token, userId: '1', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 403 });
    await expect(revokeShopAccess({ token: owner.token, userId: '4', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 409 });
    // Accès issus de rôles : refus explicites, la ligne reste en place.
    await expect(revokeShopAccess({ token: owner.token, userId: '3', shopId: shop2 }))
      .rejects.toMatchObject({ httpStatus: 409 });
    const before = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM user_shop_access');
    expect(before.rows[0]?.n).toBe(3);
    expect(await revokeShopAccess({ token: owner.token, userId: '3', shopId: shop1 }))
      .toMatchObject({ revoked: true, changed: true, shopId: shop1 });
    // Idempotence : aucune ligne, aucun faux audit au second appel.
    expect(await revokeShopAccess({ token: owner.token, userId: '3', shopId: shop1 }))
      .toMatchObject({ revoked: true, changed: false });
    const audit = await db.query<{ actor_user_id: string; shop_id: string; before: { canView: boolean }; after: { revoked: boolean } }>(
      "SELECT actor_user_id::text, shop_id::text, before, after FROM audit_log WHERE action = 'revoke_shop_access' ORDER BY id");
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({ actor_user_id: '1', shop_id: shop1,
      before: { canView: true }, after: { revoked: true } });
    expect(JSON.stringify(audit.rows)).not.toMatch(/token_hash|password_hash|secret/i);
    const remaining = await db.query<{ shop_id: string }>(
      'SELECT shop_id::text FROM user_shop_access WHERE user_id = 3 ORDER BY shop_id');
    expect(remaining.rows.map((row) => row.shop_id)).toEqual([shop2]);
    const roles = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM user_roles WHERE user_id = 3');
    expect(roles.rows[0]?.n).toBe(1);
  });
});

describe('accès boutique des comptes à rôle global', () => {
  it('autorise et révoque explicitement une boutique sans modifier le rôle global', async () => {
    const input = { token: owner.token, userId: '2', shopId: shop2 };
    const enter = () => withAuthorizedShopTransaction({ token: manager.token, shopId: shop2, permission: 'shops:read' }, async () => true);
    await expect(enter()).rejects.toMatchObject({ httpStatus: 403 });
    expect(await grantGlobalRoleShopAccess(input)).toMatchObject({ granted: true, changed: true });
    await expect(enter()).resolves.toBe(true);
    expect(await grantGlobalRoleShopAccess(input)).toMatchObject({ granted: true, changed: false });
    const listed = await listUserShopAccess(owner.token, '2');
    expect(listed.accesses.find((entry) => entry.shopId === shop2)).toMatchObject({ origin: 'global_role', canView: true });
    expect(await revokeShopAccess(input)).toMatchObject({ revoked: true, changed: true });
    await expect(enter()).rejects.toMatchObject({ httpStatus: 403 });
    expect(await revokeShopAccess(input)).toMatchObject({ revoked: true, changed: false });
    const roles = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM user_roles WHERE user_id = 2 AND role_code = 'manager' AND shop_id IS NULL");
    expect(roles.rows[0]?.n).toBe(1);
    // Vérifie seulement les deux actions de cette boutique et aucun faux audit.
    const actions = await db.query<{ action: string }>(
      "SELECT action FROM audit_log WHERE shop_id = $1 AND action IN ('grant_global_shop_access','revoke_shop_access') ORDER BY id", [shop2]);
    expect(actions.rows.map((row) => row.action)).toEqual(['grant_global_shop_access', 'revoke_shop_access']);
  });
  it('réactive une ligne désactivée sans en créer une deuxième', async () => {
    await db.query('INSERT INTO user_shop_access (user_id, shop_id, can_view) VALUES (2, $1, false)', [shop2]);
    const input = { token: owner.token, userId: '2', shopId: shop2 };
    expect(await grantGlobalRoleShopAccess(input)).toMatchObject({ changed: true });
    const access = await db.query<{ n: number; can_view: boolean }>(
      'SELECT count(*)::int AS n, bool_and(can_view) AS can_view FROM user_shop_access WHERE user_id = 2 AND shop_id = $1', [shop2]);
    expect(access.rows[0]).toMatchObject({ n: 1, can_view: true });
    const audit = await db.query<{ before: { canView: boolean }; after: { canView: boolean } }>(
      "SELECT before, after FROM audit_log WHERE action = 'grant_global_shop_access' AND shop_id = $1 ORDER BY id DESC LIMIT 1", [shop2]);
    expect(audit.rows[0]).toMatchObject({ before: { canView: false }, after: { canView: true } });
    await revokeShopAccess(input);
  });
  it('protège un accès quand un rôle boutique coexiste avec le rôle global', async () => {
    const input = { token: owner.token, userId: '2', shopId: shop1 };
    await db.query("INSERT INTO user_roles (user_id, role_code, shop_id) VALUES (2, 'assistant', $1)", [shop1]);
    try {
      await expect(revokeShopAccess(input)).rejects.toMatchObject({ httpStatus: 409 });
      const access = await db.query<{ can_view: boolean }>('SELECT can_view FROM user_shop_access WHERE user_id = 2 AND shop_id = $1', [shop1]);
      expect(access.rows[0]?.can_view).toBe(true);
    } finally { await db.query("DELETE FROM user_roles WHERE user_id = 2 AND role_code = 'assistant' AND shop_id = $1", [shop1]); }
  });
  it('annule l’accès si l’écriture d’audit échoue', async () => {
    await db.exec(`CREATE FUNCTION test_deny_access_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'audit indisponible'; END $$;
      CREATE TRIGGER test_deny_access_audit BEFORE INSERT ON audit_log
      FOR EACH ROW EXECUTE FUNCTION test_deny_access_audit();`);
    try {
      await expect(grantGlobalRoleShopAccess({ token: owner.token, userId: '2', shopId: shop2 }))
        .rejects.toThrow('audit indisponible');
      const rows = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM user_shop_access WHERE user_id = 2 AND shop_id = $1', [shop2]);
      expect(rows.rows[0]?.n).toBe(0);
    } finally {
      await db.exec('DROP TRIGGER test_deny_access_audit ON audit_log; DROP FUNCTION test_deny_access_audit();');
    }
  });
  it('refuse les comptes protégés, sans rôle global et les acteurs non autorisés', async () => {
    const input = { token: owner.token, userId: '2', shopId: shop2 };
    await expect(grantGlobalRoleShopAccess({ ...input, token: manager.token })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(grantGlobalRoleShopAccess({ ...input, token: undefined })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(grantGlobalRoleShopAccess({ ...input, userId: '1' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(grantGlobalRoleShopAccess({ ...input, userId: '5' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(revokeShopAccess({ ...input, userId: '5' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(grantGlobalRoleShopAccess({ ...input, userId: '4' })).rejects.toMatchObject({ httpStatus: 409 });
    await expect(grantGlobalRoleShopAccess({ ...input, userId: '3' })).rejects.toMatchObject({ httpStatus: 409 });
    await expect(grantGlobalRoleShopAccess({ ...input, userId: '999' })).rejects.toMatchObject({ httpStatus: 404 });
    await expect(grantGlobalRoleShopAccess({ ...input, shopId: '999' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(grantGlobalRoleShopAccess({ ...input, shopId: 'abc' })).rejects.toMatchObject({ httpStatus: 400 });
  });
});
