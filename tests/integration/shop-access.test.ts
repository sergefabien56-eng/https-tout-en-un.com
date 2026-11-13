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

const { listUserShopAccess, revokeIndependentShopAccess } = await import('@/modules/identity/shop-access');
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
      ('invite@test.invalid', 'hash', 'Invité');
    INSERT INTO user_roles (user_id, role_code) VALUES (1, 'owner'), (2, 'manager');
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
    await expect(revokeIndependentShopAccess({ token: manager.token, userId: '3', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 403 });
    await expect(revokeIndependentShopAccess({ token: assistant.token, userId: '3', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 403 });
    await expect(revokeIndependentShopAccess({ token: undefined, userId: '3', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 401 });
    await expect(revokeIndependentShopAccess({ token: owner.token, userId: '1', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 403 });
    await expect(revokeIndependentShopAccess({ token: owner.token, userId: '4', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 409 });
    // Accès issus de rôles : refus explicites, la ligne reste en place.
    await expect(revokeIndependentShopAccess({ token: owner.token, userId: '3', shopId: shop2 }))
      .rejects.toMatchObject({ httpStatus: 409 });
    await expect(revokeIndependentShopAccess({ token: owner.token, userId: '2', shopId: shop1 }))
      .rejects.toMatchObject({ httpStatus: 409 });
    const before = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM user_shop_access');
    expect(before.rows[0]?.n).toBe(3);
    expect(await revokeIndependentShopAccess({ token: owner.token, userId: '3', shopId: shop1 }))
      .toMatchObject({ revoked: true, changed: true, shopId: shop1 });
    // Idempotence : aucune ligne, aucun faux audit au second appel.
    expect(await revokeIndependentShopAccess({ token: owner.token, userId: '3', shopId: shop1 }))
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
