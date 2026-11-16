import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';
let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>) => {
    await db.exec('BEGIN; SET LOCAL ROLE app_user;');
    try { const result = await task(db as unknown as PoolClient); await db.exec('COMMIT;'); return result; }
    catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));
const { manageDirectoryAccess, readDirectoryAccess } = await import('@/modules/identity/directory-access');
const { listAuthorizedUsers, getAuthorizedUser } = await import('@/modules/identity/user-list');
const { exportAuthorizedUsers, loadAuthorizedUsersExport } = await import('@/modules/identity/export-users');
const { withAuthorizedGlobalTransaction } = await import('@/core/auth/authorize-global');
const { getNavigationPermissions } = await import('@/ui/navigation-permissions');
const owner = createSessionToken(), manager = createSessionToken(), other = createSessionToken();
beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) await db.exec(readFileSync(join(dir, file), 'utf8'));
  await db.exec(`INSERT INTO users (email,password_hash,display_name) VALUES
    ('owner@test.invalid','hash','Propriétaire'), ('manager@test.invalid','hash','Gestionnaire'),
    ('other@test.invalid','hash','Autre gestionnaire'), ('invite@test.invalid','hash','Invité'),
    ('owner2@test.invalid','hash','Autre propriétaire');
    UPDATE users SET status='invited' WHERE id=4;
    INSERT INTO user_roles (user_id,role_code) VALUES (1,'owner'),(2,'manager'),(3,'manager'),(5,'owner');
    INSERT INTO role_permissions (role_code,permission_code) VALUES ('manager','roles:manage');
    CREATE ROLE app_user NOLOGIN; GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;`);
  for (const [id, session] of [[1,owner],[2,manager],[3,other]] as const)
    await db.query("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')", [id,session.hash]);
});
afterAll(async () => { await db.close(); });
describe('autorisation individuelle annuaire', () => {
  const input = { id: '2', expected: false, granted: true };
  it('le propriétaire seulement attribue, même si roles:manage est délégué', async () => {
    await expect(manageDirectoryAccess({ ...input, token: manager.token })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(manageDirectoryAccess({ ...input, token: undefined })).rejects.toMatchObject({ httpStatus: 401 });
    await expect(manageDirectoryAccess({ ...input, token: owner.token, id: '1' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(manageDirectoryAccess({ ...input, token: owner.token, id: '5' })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(manageDirectoryAccess({ ...input, token: owner.token, id: '4' })).rejects.toMatchObject({ httpStatus: 409 });
    await expect(manageDirectoryAccess({ ...input, token: owner.token, id: '999' })).rejects.toMatchObject({ httpStatus: 404 });
    await expect(manageDirectoryAccess({ ...input, token: owner.token, granted: 'true' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(readDirectoryAccess(manager.token, '2')).rejects.toMatchObject({ httpStatus: 403 });
  });
  it('la décision est individuelle, exige le droit global et ne délègue pas la gestion globale', async () => {
    await expect(listAuthorizedUsers(manager.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(getAuthorizedUser(manager.token, '3')).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportAuthorizedUsers(manager.token)).rejects.toMatchObject({ httpStatus: 403 });
    expect((await getNavigationPermissions('2')).globalPermissions.has('users:read')).toBe(false);
    expect(await readDirectoryAccess(owner.token, '2')).toBe(false);
    expect(await manageDirectoryAccess({ ...input, token: owner.token })).toMatchObject({ granted: true, changed: true });
    expect(await readDirectoryAccess(owner.token, '2')).toBe(true);
    expect((await listAuthorizedUsers(manager.token)).users).toHaveLength(5);
    expect((await getAuthorizedUser(manager.token, '3'))?.id).toBe('3');
    await expect(loadAuthorizedUsersExport(manager.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportAuthorizedUsers(manager.token)).rejects.toMatchObject({ httpStatus: 403 });
    expect((await getNavigationPermissions('2')).globalPermissions.has('users:read')).toBe(true);
    await expect(listAuthorizedUsers(other.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(withAuthorizedGlobalTransaction({ token: manager.token, permission: 'users:write' }, async () => true)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(manageDirectoryAccess({ ...input, token: owner.token })).rejects.toMatchObject({ httpStatus: 409 });
    expect(await manageDirectoryAccess({ ...input, expected: true, token: owner.token })).toMatchObject({ changed: false });
    await db.exec("DELETE FROM role_permissions WHERE role_code='manager' AND permission_code='users:read'");
    try { await expect(listAuthorizedUsers(manager.token)).rejects.toMatchObject({ httpStatus: 403 }); }
    finally { await db.exec("INSERT INTO role_permissions (role_code,permission_code) VALUES ('manager','users:read')"); }
    expect(await manageDirectoryAccess({ ...input, expected: true, granted: false, token: owner.token })).toMatchObject({ changed: true });
    await expect(listAuthorizedUsers(manager.token)).rejects.toMatchObject({ httpStatus: 403 });
    const audit = await db.query<{ before: { granted: boolean }; after: { granted: boolean } }>(
      "SELECT before,after FROM audit_log WHERE action='manage_directory_access' ORDER BY id");
    expect(audit.rows).toMatchObject([{ before: { granted: false }, after: { granted: true } }, { before: { granted: true }, after: { granted: false } }]);
    expect((await db.query<{ n: number }>('SELECT count(*)::int n FROM user_shop_access')).rows[0]?.n).toBe(0);
  });
  it('la policy d’audit ne donne pas accès au journal global ni à un acteur étranger', async () => {
    await db.exec('BEGIN; SET LOCAL ROLE app_user;');
    try {
      await db.query("SELECT set_config('app.audit_actor_id', '1', true)");
      for (const fields of [[2, 'users', 'manage_directory_access', 'directory_access'],
        [1, 'other', 'manage_directory_access', 'directory_access'],
        [1, 'users', 'other', 'directory_access'], [1, 'users', 'manage_directory_access', 'other']]) {
        await db.exec('SAVEPOINT deny;');
        await expect(db.query('INSERT INTO audit_log (actor_user_id,module,action,entity_type) VALUES ($1,$2,$3,$4)', fields))
          .rejects.toThrow(/row-level security/);
        await db.exec('ROLLBACK TO SAVEPOINT deny;');
      }
      expect((await db.query('SELECT id FROM audit_log')).rows).toEqual([]);
    } finally { await db.exec('ROLLBACK;'); }
  });
  it('si l’audit échoue, l’autorisation est annulée', async () => {
    await db.exec("CREATE FUNCTION deny_access_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit indisponible'; END $$; CREATE TRIGGER deny_access_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION deny_access_audit()");
    try {
      await expect(manageDirectoryAccess({ ...input, token: owner.token })).rejects.toThrow('audit indisponible');
      expect(await readDirectoryAccess(owner.token, '2')).toBe(false);
    } finally { await db.exec('DROP TRIGGER deny_access_audit ON audit_log; DROP FUNCTION deny_access_audit();'); }
  });
});
