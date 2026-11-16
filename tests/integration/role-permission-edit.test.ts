/** Mutation de matrice avec vrai rôle non BYPASSRLS (PostgreSQL WASM). */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';
let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN; SET LOCAL ROLE app_user;');
    try { const result = await task(db as unknown as PoolClient); await db.exec('COMMIT;'); return result; }
    catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));
const { updateRolePermission } = await import('@/modules/identity/update-role-permission');
const { getRoleMatrixForPage } = await import('@/modules/identity/role-matrix');
const { withAuthorizedGlobalTransaction } = await import('@/core/auth/authorize-global');
const owner = createSessionToken(), delegated = createSessionToken();
beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort())
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  await db.exec(`INSERT INTO users (email, password_hash, display_name) VALUES
    ('owner@test.invalid', 'hash', 'Propriétaire'), ('delegue@test.invalid', 'hash', 'Délégué');
    INSERT INTO user_roles (user_id, role_code) VALUES (1, 'owner'), (2, 'manager');
    INSERT INTO role_permissions (role_code, permission_code) VALUES ('manager', 'roles:manage');
    CREATE ROLE app_user NOLOGIN;
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
  for (const [id, session] of [[1, owner], [2, delegated]] as const)
    await db.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,now() + interval '1 hour')", [id, session.hash]);
});
afterAll(async () => { await db.close(); });
const input = { roleCode: 'assistant', permissionCode: 'system:manage', expected: false, granted: true };
describe('édition de la matrice', () => {
  it('seul le propriétaire peut éditer même si la permission est déléguée', async () => {
    expect((await getRoleMatrixForPage(owner.token)).canEdit).toBe(true);
    expect((await getRoleMatrixForPage(delegated.token)).canEdit).toBe(false);
    await expect(updateRolePermission({ ...input, token: delegated.token })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(updateRolePermission({ ...input, token: undefined })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(updateRolePermission({ ...input, roleCode: 'owner', token: owner.token })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(updateRolePermission({ ...input, roleCode: 'autre', token: owner.token })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(updateRolePermission({ ...input, permissionCode: 'unknown:read', token: owner.token })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(updateRolePermission({ ...input, granted: 'true', token: owner.token })).rejects.toMatchObject({ httpStatus: 400 });
  });
  it('ajoute et retire avec audit atomique, idempotence et conflit de vue périmée', async () => {
    expect(await updateRolePermission({ ...input, token: owner.token })).toMatchObject({ changed: true, granted: true });
    await expect(updateRolePermission({ ...input, token: owner.token })).rejects.toMatchObject({ httpStatus: 409 });
    expect(await updateRolePermission({ ...input, expected: true, token: owner.token })).toMatchObject({ changed: false });
    expect(await updateRolePermission({ ...input, expected: true, granted: false, token: owner.token })).toMatchObject({ changed: true });
    const audit = await db.query<{ before: unknown; after: unknown; shop_id: string | null }>(
      "SELECT before, after, shop_id FROM audit_log WHERE action='update_role_permission' ORDER BY id");
    expect(audit.rows).toMatchObject([
      { shop_id: null, before: { roleCode: 'assistant', permissionCode: 'system:manage', granted: false }, after: { roleCode: 'assistant', permissionCode: 'system:manage', granted: true } },
      { shop_id: null, before: { roleCode: 'assistant', permissionCode: 'system:manage', granted: true }, after: { roleCode: 'assistant', permissionCode: 'system:manage', granted: false } },
    ]);
    expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM user_shop_access')).rows[0]?.n).toBe(0);
  });
  it('la délégation et le retrait de Système prennent effet sur une session existante', async () => {
    const check = () => withAuthorizedGlobalTransaction({ token: delegated.token, permission: 'system:manage' }, async () => true);
    await expect(check()).rejects.toMatchObject({ httpStatus: 403 });
    const grant = { token: owner.token, roleCode: 'manager', permissionCode: 'system:manage', expected: false, granted: true };
    await updateRolePermission(grant);
    expect(await check()).toBe(true);
    await updateRolePermission({ ...grant, expected: true, granted: false });
    await expect(check()).rejects.toMatchObject({ httpStatus: 403 });
    // La protection du propriétaire subsiste indépendamment de ce rôle.
    expect(await withAuthorizedGlobalTransaction({ token: owner.token, permission: 'system:manage' }, async () => true)).toBe(true);
  });
  it('annule la mutation si l’audit échoue', async () => {
    await db.exec(`CREATE FUNCTION test_deny_matrix_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit indisponible'; END $$;
      CREATE TRIGGER test_deny_matrix_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION test_deny_matrix_audit();`);
    try {
      await expect(updateRolePermission({ ...input, token: owner.token })).rejects.toThrow('audit indisponible');
      expect((await db.query<{ n: number }>("SELECT count(*)::int n FROM role_permissions WHERE role_code='assistant' AND permission_code='system:manage'")).rows[0]?.n).toBe(0);
    } finally { await db.exec('DROP TRIGGER test_deny_matrix_audit ON audit_log; DROP FUNCTION test_deny_matrix_audit();'); }
  });
  it('la policy ne permet pas un autre acteur ni la lecture globale du journal', async () => {
    await db.exec('BEGIN; SET LOCAL ROLE app_user;');
    try {
      await db.query("SELECT set_config('app.audit_actor_id', '1', true)");
      await db.exec('SAVEPOINT denied;');
      await expect(db.query("INSERT INTO audit_log (actor_user_id,module,action,entity_type) VALUES (2,'roles','update_role_permission','role_permission')")).rejects.toThrow(/row-level security/);
      await db.exec('ROLLBACK TO SAVEPOINT denied;');
      expect((await db.query('SELECT id FROM audit_log')).rows).toEqual([]);
    } finally { await db.exec('ROLLBACK;'); }
  });
});
