/** Rôles globaux : Propriétaire seul, audit atomique shop_id NULL, refus — PostgreSQL WASM. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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
      await db.exec('COMMIT;');
      return result;
    } catch (error) {
      await db.exec('ROLLBACK;');
      throw error;
    }
  },
}));

const { manageGlobalRole } = await import('@/modules/identity/manage-global-role');
const owner = createSessionToken();
const manager = createSessionToken();
const assistant = createSessionToken();

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  await db.exec(`
    INSERT INTO marketplace_apps (label, client_id) VALUES ('test seulement', 'test-client');
    INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
    VALUES (1, gen_random_uuid(), 'global-a', 'CI', 'XOF', 'Boutique A'),
           (1, gen_random_uuid(), 'global-b', 'SN', 'XOF', 'Boutique B');
    INSERT INTO users (email, password_hash, display_name) VALUES
      ('owner@test.invalid', 'hash', 'Propriétaire'),
      ('manager@test.invalid', 'hash', 'Gestionnaire'),
      ('assistant@test.invalid', 'hash', 'Assistant'),
      ('invite@test.invalid', 'hash', 'Invité'),
      ('owner2@test.invalid', 'hash', 'Second Propriétaire');
    INSERT INTO user_roles (user_id, role_code) VALUES (1, 'owner'), (2, 'manager'), (5, 'owner');
    UPDATE users SET status = 'invited' WHERE id = 4;
  `);
  const ids = await db.query<{ id: string }>('SELECT id::text FROM shops ORDER BY id');
  await db.query('INSERT INTO user_roles (user_id, role_code, shop_id) VALUES (3, $1, $2)',
    ['assistant', ids.rows[1]!.id]);
  await db.query('INSERT INTO user_shop_access (user_id, shop_id) VALUES (2, $1), (3, $2)',
    [ids.rows[0]!.id, ids.rows[1]!.id]);
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

describe('attribution/retrait d’un rôle global (Propriétaire global seul)', () => {
  it('attribue puis retire avec audit atomique shop_id NULL, idempotence sans faux audit', async () => {
    const input = { token: owner.token, userId: '3', roleCode: 'accountant', grant: true };
    expect(await manageGlobalRole(input)).toMatchObject({ granted: true, changed: true, roleCode: 'accountant' });
    const rows = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM user_roles WHERE user_id = 3 AND role_code = 'accountant' AND shop_id IS NULL");
    expect(rows.rows[0]?.n).toBe(1);
    // Aucun accès boutique créé implicitement.
    const access = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM user_shop_access');
    expect(access.rows[0]?.n).toBe(2);
    expect(await manageGlobalRole(input)).toMatchObject({ granted: true, changed: false });
    expect(await manageGlobalRole({ ...input, grant: false })).toMatchObject({ granted: false, changed: true });
    expect(await manageGlobalRole({ ...input, grant: false })).toMatchObject({ granted: false, changed: false });
    const remaining = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM user_roles WHERE user_id = 3 AND role_code = 'accountant'");
    expect(remaining.rows[0]?.n).toBe(0);
    // Le rôle boutique préexistant et les lignes d’accès sont conservés.
    const scoped = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM user_roles WHERE user_id = 3 AND shop_id IS NOT NULL");
    expect(scoped.rows[0]?.n).toBe(1);
    const accessAfter = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM user_shop_access');
    expect(accessAfter.rows[0]?.n).toBe(2);
    const audit = await db.query<{ shop_id: string | null; before: { granted: boolean }; after: { granted: boolean } }>(
      "SELECT shop_id, before, after FROM audit_log WHERE action = 'manage_global_role' ORDER BY id");
    expect(audit.rows).toMatchObject([
      { shop_id: null, before: { granted: false }, after: { granted: true } },
      { shop_id: null, before: { granted: true }, after: { granted: false } },
    ]);
    expect(JSON.stringify(audit.rows)).not.toMatch(/token_hash|password_hash|secret/i);
  });
  it('refuse rôle owner, entrées invalides, non-Propriétaire, soi-même, Propriétaire cible et invitation', async () => {
    const input = { token: owner.token, userId: '3', roleCode: 'accountant', grant: true };
    await expect(manageGlobalRole({ ...input, roleCode: 'owner' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(manageGlobalRole({ ...input, roleCode: 'MANAGER' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(manageGlobalRole({ ...input, grant: 'oui' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(manageGlobalRole({ ...input, userId: '0' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(manageGlobalRole({ ...input, token: manager.token })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(manageGlobalRole({ ...input, token: assistant.token })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(manageGlobalRole({ ...input, token: undefined })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(manageGlobalRole({ ...input, userId: '1' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(manageGlobalRole({ ...input, userId: '5' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(manageGlobalRole({ ...input, userId: '4' })).rejects.toMatchObject({ httpStatus: 409 });
    await expect(manageGlobalRole({ ...input, userId: '999' })).rejects.toMatchObject({ httpStatus: 404 });
    const audit = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM audit_log WHERE action = 'manage_global_role'");
    expect(audit.rows[0]?.n).toBe(2); // Aucun faux audit produit par les refus.
  });

  it('annule le rôle si l’écriture d’audit échoue', async () => {
    await db.exec(`CREATE FUNCTION test_deny_global_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'audit indisponible'; END $$;
      CREATE TRIGGER test_deny_global_audit BEFORE INSERT ON audit_log
      FOR EACH ROW EXECUTE FUNCTION test_deny_global_audit();`);
    try {
      await expect(manageGlobalRole({ token: owner.token, userId: '3', roleCode: 'manager', grant: true }))
        .rejects.toThrow('audit indisponible');
      const role = await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM user_roles WHERE user_id = 3 AND role_code = 'manager' AND shop_id IS NULL");
      expect(role.rows[0]?.n).toBe(0);
    } finally {
      await db.exec('DROP TRIGGER test_deny_global_audit ON audit_log; DROP FUNCTION test_deny_global_audit();');
    }
  });

  it('la policy autorise uniquement cet audit et ne permet pas sa lecture sans boutique', async () => {
    await db.exec('BEGIN; SET LOCAL ROLE app_user;');
    try {
      const sql = `INSERT INTO audit_log (actor_user_id, module, action, entity_type)
        VALUES ($1, $2, $3, $4)`;
      await db.exec('SAVEPOINT denied;');
      await expect(db.query(sql, ['1', 'users', 'manage_global_role', 'user_role'])).rejects.toThrow(/row-level security/);
      await db.exec('ROLLBACK TO SAVEPOINT denied;');
      await db.query("SELECT set_config('app.audit_actor_id', $1, true)", ['1']);
      for (const values of [
        ['2', 'users', 'manage_global_role', 'user_role'],
        ['1', 'users', 'other', 'user_role'],
        ['1', 'other', 'manage_global_role', 'user_role'],
        ['1', 'users', 'manage_global_role', 'other'],
      ]) {
        await db.exec('SAVEPOINT denied;');
        await expect(db.query(sql, values)).rejects.toThrow(/row-level security/);
        await db.exec('ROLLBACK TO SAVEPOINT denied;');
      }
      await db.query(sql, ['1', 'users', 'manage_global_role', 'user_role']);
      const rows = await db.query('SELECT id FROM audit_log');
      expect(rows.rows).toEqual([]);
    } finally { await db.exec('ROLLBACK;'); }
  });
});
