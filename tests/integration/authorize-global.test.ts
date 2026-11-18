/** Permissions globales, non confondues avec un rôle limité à une boutique. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import ExcelJS from 'exceljs';
import { PDFPage } from 'pdf-lib';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';

let db: PGlite;
let useRestrictedRole = false;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN;');
    try {
      if (useRestrictedRole) await db.exec('SET LOCAL ROLE settings_test_app;');
      const result = await task(db as unknown as PoolClient); await db.exec('COMMIT;'); return result;
    }
    catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));
const { listAuthorizedUsers, getAuthorizedUser } = await import('@/modules/identity/user-list');
const { exportAuthorizedUsers } = await import('@/modules/identity/export-users');
const { exportAuthorizedUsersXlsx } = await import('@/modules/identity/export-users-xlsx');
const { exportAuthorizedUsersPdf } = await import('@/modules/identity/export-users-pdf');
const { getNavigationPermissions } = await import('@/ui/navigation-permissions');
const { getRoleMatrix } = await import('@/modules/identity/role-matrix');
const { exportRoleMatrix } = await import('@/modules/identity/export-role-matrix');
const { exportRoleMatrixXlsx } = await import('@/modules/identity/export-role-matrix-xlsx');
const { exportRoleMatrixPdf } = await import('@/modules/identity/export-role-matrix-pdf');
const { exportOrganizationSettingsCsv } = await import('@/modules/identity/export-organization-settings');
const { exportOrganizationSettingsXlsx } = await import('@/modules/identity/export-organization-settings-xlsx');
const { exportOrganizationSettingsPdf } = await import('@/modules/identity/export-organization-settings-pdf');
const { getDeepHealth } = await import('@/modules/monitoring/deep-health');
const { exportSystemCsv, exportSystemXlsx, canExportSystem } = await import('@/modules/monitoring/export-system');
const { exportSystemPdf } = await import('@/modules/monitoring/export-system-pdf');
const { readOrganizationSettings, updateOrganizationTimezone } = await import('@/modules/identity/organization-settings');
const { readOrganizationName, updateOrganizationName } = await import('@/modules/identity/organization-name');
const { readOrganizationCurrency, updateOrganizationCurrency } = await import('@/modules/identity/organization-currency');
const { changeUserStatus } = await import('@/modules/identity/change-user-status');
const { listOwnSessions } = await import('@/modules/identity/active-sessions');
const { revokeOtherSession } = await import('@/modules/identity/revoke-other-session');
const { revokeAllOtherSessions } = await import('@/modules/identity/revoke-all-other-sessions');
const { refreshSession } = await import('@/core/auth/refresh-session');
const owner = createSessionToken(); const scoped = createSessionToken(); const globalManager = createSessionToken();

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  await db.exec(`
    CREATE ROLE settings_test_app NOLOGIN NOBYPASSRLS;
    GRANT USAGE ON SCHEMA public TO settings_test_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO settings_test_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO settings_test_app;
    INSERT INTO marketplace_apps (label, client_id) VALUES ('test', 'test');
    INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
      VALUES (1, gen_random_uuid(), 'test-ci', 'CI', 'XOF', 'Boutique test');
    INSERT INTO users (email, password_hash, display_name) VALUES
      ('owner@test.invalid','hash','Propriétaire'),
      ('scoped@test.invalid','hash','Gestionnaire limité'),
      ('global@test.invalid','hash','Gestionnaire global');
    INSERT INTO user_roles (user_id, role_code, shop_id) VALUES
      (1, 'owner', NULL), (2, 'manager', 1), (3, 'manager', NULL);
  `);
  for (const [id, session] of [[1, owner], [2, scoped], [3, globalManager]] as const) {
    await db.query(`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '1 hour')`,
      [id, session.hash]);
  }
});
afterAll(async () => { await db.close(); });

describe('administration globale : utilisateurs réels uniquement', () => {
  it('propriétaire global : accès à la liste et champs sûrs, sans password_hash', async () => {
    const result = await listAuthorizedUsers(owner.token);
    expect(result.users).toHaveLength(3);
    expect(result.users[0]?.displayName).toBe('Gestionnaire global');
    expect(JSON.stringify(result)).not.toMatch(/password_hash|totp_secret|token_hash/);
    expect(result.nextPage).toBeNull();
  });
  it('export CSV utilisateurs : filtres identiques, neutralisation et autorisation globale', async () => {
    const fixture = await db.query<{ id: string }>(`INSERT INTO users (email,password_hash,display_name,status)
      VALUES ('export-fixture@fixture.invalid','SECRET_FIXTURE_HASH','=cmd','invited') RETURNING id`);
    try {
      await db.query("INSERT INTO user_roles (user_id, role_code, shop_id) VALUES ($1, 'manager', NULL)",
        [fixture.rows[0]!.id]);
      const csv = await exportAuthorizedUsers(owner.token, 'export-fixture', 'invited', 'manager');
      expect(csv).toContain('"Organisation — droits globaux"');
      expect(csv).toContain('"export-fixture"');
      expect(csv).toContain('"\'=cmd"');
      expect(csv).toContain('"export-fixture@fixture.invalid"');
      expect(csv).not.toContain('owner@test.invalid');
      expect(csv).not.toMatch(/SECRET_FIXTURE_HASH|password_hash|totp_secret|token_hash/);
      expect((await exportAuthorizedUsers(owner.token, 'export-fixture', 'active', 'manager')))
        .not.toContain('export-fixture@fixture.invalid');
      const bytes = await exportAuthorizedUsersXlsx(owner.token, 'export-fixture', 'invited', 'manager');
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes.buffer);
      const sheet = workbook.getWorksheet('Utilisateurs')!;
      expect(sheet.getCell('B8').value).toBe("'=cmd");
      expect(sheet.getCell('C8').value).toBe('export-fixture@fixture.invalid');
      expect(sheet.getCell('D8').value).toBe('invited');
      expect(sheet.getColumn(3).values).not.toContain('owner@test.invalid');
      expect(JSON.stringify(sheet.getSheetValues())).not.toMatch(/SECRET_FIXTURE_HASH|password_hash|totp_secret|token_hash/);
      const other = await exportAuthorizedUsersXlsx(owner.token, 'export-fixture', 'active', 'manager');
      const otherBook = new ExcelJS.Workbook(); await otherBook.xlsx.load(other.buffer);
      expect(otherBook.getWorksheet('Utilisateurs')!.getCell('C8').value).toBeNull();
      await expect(exportAuthorizedUsersXlsx(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
      await expect(exportAuthorizedUsersXlsx(undefined)).rejects.toMatchObject({ httpStatus: 401 });
      await expect(exportAuthorizedUsersXlsx(owner.token, '', 'OWNER')).rejects.toMatchObject({ httpStatus: 400 });
      try {
        useRestrictedRole = true;
        const pdf = await exportAuthorizedUsersPdf(owner.token, 'export-fixture', 'invited', 'manager');
        expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe('%PDF-');
      } finally { useRestrictedRole = false; }
      await expect(exportAuthorizedUsersPdf(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
      await expect(exportAuthorizedUsersPdf(undefined)).rejects.toMatchObject({ httpStatus: 401 });
      await expect(exportAuthorizedUsersPdf(owner.token, '', 'OWNER')).rejects.toMatchObject({ httpStatus: 400 });
      await db.exec("DELETE FROM role_permissions WHERE role_code='owner' AND permission_code='reports:export'");
      try {
        await expect(exportAuthorizedUsersXlsx(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
        await expect(exportAuthorizedUsersPdf(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
      } finally { await db.exec("INSERT INTO role_permissions (role_code,permission_code) VALUES ('owner','reports:export')"); }
      await expect(exportAuthorizedUsers(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
      await expect(exportAuthorizedUsers(undefined)).rejects.toMatchObject({ httpStatus: 401 });
      await expect(exportAuthorizedUsers(owner.token, '', 'OWNER')).rejects.toMatchObject({ httpStatus: 400 });
      await expect(exportAuthorizedUsers(owner.token, 'a\n')).rejects.toMatchObject({ httpStatus: 400 });
    } finally {
      await db.query('DELETE FROM users WHERE id = $1', [fixture.rows[0]!.id]);
    }
  });
  it('recherche de comptes par nom/e-mail : serveur global, filtres validés et zéro secret', async () => {
    const name = await listAuthorizedUsers(owner.token, 1, 'GESTIONNAIRE');
    expect(name.users.map((u) => u.email)).toEqual(['global@test.invalid', 'scoped@test.invalid']);
    expect((await listAuthorizedUsers(owner.token, 1, 'owner@test.invalid')).users.map((u) => u.displayName))
      .toEqual(['Propriétaire']);
    expect((await listAuthorizedUsers(owner.token, 1, 'introuvable')).users).toEqual([]);
    expect((await listAuthorizedUsers(owner.token, 2, 'gestionnaire')).users).toEqual([]);
    expect(JSON.stringify(name)).not.toMatch(/password_hash|totp_secret|token_hash/);
    await expect(listAuthorizedUsers(scoped.token, 1, 'owner')).rejects.toMatchObject({ httpStatus: 403 });
    await expect(listAuthorizedUsers(undefined, 1, 'owner')).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listAuthorizedUsers(owner.token, 1, 'a'.repeat(81))).rejects.toMatchObject({ httpStatus: 400 });
    await expect(listAuthorizedUsers(owner.token, 1, 'a\n')).rejects.toMatchObject({ httpStatus: 400 });
  });
  it('filtre de statut combiné à la recherche, sans accès inter-périmètre', async () => {
    await db.exec(`INSERT INTO users (email, password_hash, display_name, status) VALUES
      ('status-active@fixture.invalid','hash','Compte test','active'),
      ('status-invited@fixture.invalid','hash','Compte test','invited'),
      ('status-suspended@fixture.invalid','hash','Compte test','suspended');`);
    try {
      for (const status of ['active', 'invited', 'suspended']) {
        const result = await listAuthorizedUsers(owner.token, 1, 'COMPTE TEST', status);
        expect(result.users.map((user) => user.email)).toEqual([`status-${status}@fixture.invalid`]);
        expect(result.users[0]?.status).toBe(status);
        expect(result.nextPage).toBeNull();
        expect(JSON.stringify(result)).not.toMatch(/password_hash|totp_secret|token_hash/);
      }
      expect((await listAuthorizedUsers(owner.token, 1, 'introuvable', 'invited')).users).toEqual([]);
      expect((await listAuthorizedUsers(owner.token, 1, 'Compte test', 'all')).users).toHaveLength(3);
      await expect(listAuthorizedUsers(owner.token, 1, '', 'ACTIVE')).rejects.toMatchObject({ httpStatus: 400 });
      await expect(listAuthorizedUsers(owner.token, 1, '', 'active OR 1=1')).rejects.toMatchObject({ httpStatus: 400 });
      await expect(listAuthorizedUsers(scoped.token, 1, '', 'invited')).rejects.toMatchObject({ httpStatus: 403 });
      await expect(listAuthorizedUsers(undefined, 1, '', 'invited')).rejects.toMatchObject({ httpStatus: 401 });
    } finally {
      await db.exec("DELETE FROM users WHERE email LIKE 'status-%@fixture.invalid'");
    }
  });
  it('filtre rôle : attributions globales et boutique, combinaison avec statut, droits conservés', async () => {
    expect((await listAuthorizedUsers(owner.token, 1, '', 'all', 'owner')).users.map((u) => u.email))
      .toEqual(['owner@test.invalid']);
    expect((await listAuthorizedUsers(owner.token, 1, 'GESTIONNAIRE', 'active', 'manager')).users
      .map((u) => u.email)).toEqual(['global@test.invalid', 'scoped@test.invalid']);
    expect((await listAuthorizedUsers(owner.token, 1, '', 'all', 'assistant')).users).toEqual([]);
    const fixture = await db.query<{ id: string }>(`INSERT INTO users (email,password_hash,display_name,status)
      VALUES ('role-invited@fixture.invalid','hash','Rôle invité','invited') RETURNING id`);
    try {
      const id = fixture.rows[0]!.id;
      // Plusieurs attributions d'un même rôle ne dupliquent jamais l'utilisateur dans la liste.
      await db.query("INSERT INTO user_roles (user_id, role_code, shop_id) VALUES ($1, 'manager', NULL), ($1, 'manager', 1)", [id]);
      const filtered = await listAuthorizedUsers(owner.token, 1, 'Rôle invité', 'invited', 'manager');
      expect(filtered.users.map((u) => u.email)).toEqual(['role-invited@fixture.invalid']);
      expect(filtered.nextPage).toBeNull();
      expect(JSON.stringify(filtered)).not.toMatch(/password_hash|totp_secret|token_hash/);
      expect((await listAuthorizedUsers(owner.token, 1, '', 'invited', 'owner')).users).toEqual([]);
      await expect(listAuthorizedUsers(owner.token, 1, '', 'all', 'OWNER')).rejects.toMatchObject({ httpStatus: 400 });
      await expect(listAuthorizedUsers(owner.token, 1, '', 'all', 'manager OR true')).rejects.toMatchObject({ httpStatus: 400 });
      await expect(listAuthorizedUsers(scoped.token, 1, '', 'all', 'owner')).rejects.toMatchObject({ httpStatus: 403 });
      await expect(listAuthorizedUsers(undefined, 1, '', 'all', 'owner')).rejects.toMatchObject({ httpStatus: 401 });
    } finally {
      await db.query('DELETE FROM users WHERE id = $1', [fixture.rows[0]!.id]);
    }
  });
  it('pagination des résultats garde la combinaison recherche et statut côté serveur', async () => {
    await db.exec(`INSERT INTO users (email, password_hash, display_name, status)
      SELECT 'page-filter-' || n || '@fixture.invalid', 'hash', 'Pagination filtre', 'invited'
      FROM generate_series(1, 21) AS n`);
    try {
      await db.exec(`INSERT INTO user_roles (user_id, role_code, shop_id)
        SELECT id, 'manager', 1 FROM users WHERE email LIKE 'page-filter-%@fixture.invalid'`);
      const first = await listAuthorizedUsers(owner.token, 1, 'Pagination filtre', 'invited', 'manager');
      const second = await listAuthorizedUsers(owner.token, 2, 'Pagination filtre', 'invited', 'manager');
      expect(first.users).toHaveLength(20);
      expect(first.nextPage).toBe(2);
      expect(second.users).toHaveLength(1);
      expect(second.nextPage).toBeNull();
      expect((await listAuthorizedUsers(owner.token, 2, 'Pagination filtre', 'active', 'manager')).users).toEqual([]);
      expect((await listAuthorizedUsers(owner.token, 1, 'Pagination filtre', 'invited', 'owner')).users).toEqual([]);
    } finally {
      await db.exec("DELETE FROM users WHERE email LIKE 'page-filter-%@fixture.invalid'");
    }
  });
  it('manager limité à une boutique : refus global, même avec users:read', async () => {
    await expect(listAuthorizedUsers(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
    const grants = await getNavigationPermissions('2');
    expect(grants.permissions.has('users:read')).toBe(true);
    expect(grants.globalPermissions.has('users:read')).toBe(false);
  });
  it('manager global : accord individuel nécessaire, accès immédiatement révoqué', async () => {
    await expect(listAuthorizedUsers(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
    expect((await getNavigationPermissions('3')).globalPermissions.has('users:read')).toBe(false);
    await db.exec('INSERT INTO user_directory_access (user_id, granted_by) VALUES (3, 1)');
    try {
      expect((await listAuthorizedUsers(globalManager.token)).users).toHaveLength(3);
      const grants = await getNavigationPermissions('3');
      expect(grants.globalPermissions.has('users:read')).toBe(true);
      expect(grants.globalPermissions.has('users:write')).toBe(false);
      expect(grants.globalPermissions.has('system:manage')).toBe(false);
      await expect(changeUserStatus(globalManager.token, '2', 'suspended')).rejects.toMatchObject({ httpStatus: 403 });
    } finally { await db.exec('DELETE FROM user_directory_access WHERE user_id=3'); }
    await expect(listAuthorizedUsers(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
  });
  it('absence de session ou jeton inventé : refus 401 avant requête utilisateur', async () => {
    await expect(listAuthorizedUsers(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listAuthorizedUsers(createSessionToken().token)).rejects.toMatchObject({ httpStatus: 401 });
  });
  it('matrice 5 rôles × 31 permissions visible par owner, refusée au manager', async () => {
    const matrix = await getRoleMatrix(owner.token);
    expect(matrix.roles.map((r) => r.code)).toEqual(['accountant','assistant','manager','owner','stock_manager']);
    expect(matrix.permissions).toHaveLength(31);
    expect(matrix.grants['owner']).toHaveLength(31);
    expect(matrix.grants['manager']).toHaveLength(29);
    expect(matrix.grants['manager']).not.toContain('system:manage');
    await expect(getRoleMatrix(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(getRoleMatrix(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
  });
  it('export des rôles : même matrice, droit global additionnel et refus sans session', async () => {
    const csv = await exportRoleMatrix(owner.token);
    expect(csv).toContain('"Organisation — droits globaux"');
    expect(csv).toContain('"shops","shops:read"');
    expect(csv).toContain('"Rôle : Propriétaire (owner)"');
    expect(csv).not.toMatch(/password_hash|totp_secret|token_hash/);
    await expect(exportRoleMatrix(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportRoleMatrix(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportRoleMatrix(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    expect(Array.from((await exportRoleMatrixXlsx(owner.token)).slice(0, 2))).toEqual([0x50, 0x4b]);
    await expect(exportRoleMatrixXlsx(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportRoleMatrixXlsx(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportRoleMatrixXlsx(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    try {
      useRestrictedRole = true;
      expect(Buffer.from((await exportRoleMatrixPdf(owner.token)).subarray(0, 5)).toString()).toBe('%PDF-');
    } finally { useRestrictedRole = false; }
    await expect(exportRoleMatrixPdf(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportRoleMatrixPdf(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(exportRoleMatrixPdf(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    await db.query("DELETE FROM role_permissions WHERE role_code = 'owner' AND permission_code = 'reports:export'");
    try {
      await expect(exportRoleMatrix(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
      await expect(exportRoleMatrixXlsx(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
      await expect(exportRoleMatrixPdf(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
      expect((await getRoleMatrix(owner.token)).roles).toHaveLength(5);
    } finally {
      await db.query("INSERT INTO role_permissions (role_code, permission_code) VALUES ('owner', 'reports:export')");
    }
  });
  it('santé profonde : propriétaire uniquement, nombre réel de migrations', async () => {
    // Le runner crée schema_migrations, le test PGlite applique directement les fichiers.
    await db.exec('CREATE TABLE schema_migrations (version text PRIMARY KEY); GRANT SELECT ON schema_migrations TO settings_test_app;');
    await db.exec("INSERT INTO schema_migrations VALUES ('0001'), ('0002');");
    expect(await getDeepHealth(owner.token)).toMatchObject({ globalEventsRecorded: 0, globalCriticalOpen: 0,
      globalWarningsOpen: 0,
      // La file de limitation est lue réellement : sur une base fraîche, quatre zéros mesurés.
      // Aucune empreinte ne sort, et surtout aucun `null` déguisé en zéro.
      queue: { activeBuckets: 0, attemptsInWindow: 0, bucketsAtLimit: 0, attemptsLimit: 10,
        windowMinutes: 15, keyKind: 'empreinte' } });
    await db.exec(`INSERT INTO system_events (severity, category, code, message, shop_id) VALUES
      ('critical', 'test', 'health-global-critical', 'PRIVATE_SENTINEL', NULL),
      ('warning', 'test', 'health-global-warning', 'PRIVATE_SENTINEL', NULL),
      ('info', 'test', 'health-global-info', 'PRIVATE_SENTINEL', NULL),
      ('critical', 'test', 'health-shop-secret', 'PRIVATE_SENTINEL', 1);`);
    try {
      const visibleAdmin = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM system_events WHERE shop_id IS NULL");
      expect(visibleAdmin.rows[0]?.n).toBe(3);
      await db.exec('BEGIN; SET LOCAL ROLE settings_test_app;');
      try {
        const masked = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM system_events WHERE shop_id IS NULL");
        expect(masked.rows[0]?.n).toBe(0); // RLS masque les lignes : 0 n’est pas une mesure fiable.
      } finally { await db.exec('ROLLBACK'); }
      const health = await getDeepHealth(owner.token);
      expect(health).toMatchObject({ database: 'ok', migrationsApplied: 2, version: '0.1.0',
        // Les trois incidents globaux insérés ci-dessus sont désormais réellement lus.
        globalEventsRecorded: 3, globalCriticalOpen: 1, globalWarningsOpen: 1,
        // Mesure réelle sur la base de test : zéro seau, donc zéro tentative. Ce zéro est
        // une preuve de lecture, pas un `null` déguisé — la distinction est le cœur du lot.
        queue: { activeBuckets: 0, attemptsInWindow: 0, bucketsAtLimit: 0, attemptsLimit: 10,
          windowMinutes: 15, keyKind: 'empreinte' } });
      // Une empreinte de seau ne doit jamais sortir, même sous forme de clé.
      expect(Object.keys(health.queue!).sort()).toEqual(['activeBuckets', 'attemptsInWindow', 'attemptsLimit',
        'bucketsAtLimit', 'keyKind', 'limits', 'windowMinutes', 'windowStart']);
      expect(['development', 'staging', 'production']).toContain(health.environment);
      expect(health.databaseQueryMs).toEqual(expect.any(Number));
      expect(health.databaseQueryMs).toBeGreaterThanOrEqual(0);
      expect(Object.keys(health).sort()).toEqual(['checkedAt', 'database', 'databaseQueryMs', 'environment',
        'globalCriticalOpen', 'globalEventsRecorded', 'globalWarningsOpen', 'migrationsApplied', 'queue', 'version']);
      expect(JSON.stringify(health)).not.toMatch(/PRIVATE_SENTINEL|health-shop-secret|DATABASE_URL|postgres:\/\/|password|secret|token/i);
      try {
        useRestrictedRole = true;
        const csv = await exportSystemCsv(owner.token);
        expect(csv).toContain('"Instance — accès Propriétaire"');
        // Les trois incidents globaux sont maintenant lus réellement : l'export les compte.
        expect(csv).toContain('"Incidents globaux enregistrés","3"');
        expect(csv).toContain('"Critiques non acquittés","1"');
        expect(csv).toContain('"File de tâches","Indisponible — worker non livré"');
        expect(csv).not.toMatch(/PRIVATE_SENTINEL|health-shop-secret|DATABASE_URL|postgres:\/\/|password|secret|token/i);
        const book = new ExcelJS.Workbook(); await book.xlsx.load((await exportSystemXlsx(owner.token)).buffer);
        const cells = JSON.stringify(book.getWorksheet('Système')!.getSheetValues());
        expect(cells).toContain('Indisponible — worker non livré');
        expect(cells).not.toContain('PRIVATE_SENTINEL');
        const draw = vi.spyOn(PDFPage.prototype, 'drawText');
        try {
          const pdf = await exportSystemPdf(owner.token);
          expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe('%PDF-');
          const text = draw.mock.calls.map(([value]) => value).join(' ');
          expect(text).toContain('Indisponible — worker non livré');
          expect(text).not.toContain('PRIVATE_SENTINEL');
        } finally { draw.mockRestore(); }
        expect(await canExportSystem(owner.token)).toBe(true);
      } finally { useRestrictedRole = false; }
      const exporters = [exportSystemCsv, exportSystemXlsx, exportSystemPdf];
      for (const run of exporters) {
        await expect(run(undefined)).rejects.toMatchObject({ httpStatus: 401 });
        await expect(run(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
        await expect(run(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
      }
      // Même après ajout des deux permissions, un non-propriétaire reste exclu.
      await db.exec("INSERT INTO role_permissions(role_code,permission_code) VALUES ('manager','system:manage')");
      try {
        expect(await canExportSystem(globalManager.token)).toBe(false);
        for (const run of exporters) await expect(run(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
      } finally { await db.exec("DELETE FROM role_permissions WHERE role_code='manager' AND permission_code='system:manage'"); }
      for (const permission of ['system:manage', 'reports:export']) {
        await db.query("DELETE FROM role_permissions WHERE role_code='owner' AND permission_code=$1", [permission]);
        try {
          expect(await canExportSystem(owner.token)).toBe(false);
          for (const run of exporters) await expect(run(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
        } finally { await db.query("INSERT INTO role_permissions(role_code,permission_code) VALUES ('owner',$1)", [permission]); }
      }
      await expect(getDeepHealth(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
      await expect(getDeepHealth(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    } finally { await db.exec("DELETE FROM system_events WHERE category = 'test'"); }
  });
  it('paramètres : autorisation globale, validation, écriture auditée et idempotence', async () => {
    expect(await readOrganizationSettings(owner.token)).toEqual({ timezone: null });
    await expect(readOrganizationSettings(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(updateOrganizationTimezone(scoped.token, 'UTC')).rejects.toMatchObject({ httpStatus: 403 });
    await expect(updateOrganizationTimezone(undefined, 'UTC')).rejects.toMatchObject({ httpStatus: 401 });
    await expect(updateOrganizationTimezone(owner.token, '=cmd')).rejects.toMatchObject({ httpStatus: 400 });
    await expect(updateOrganizationTimezone(owner.token, { key: 'secret' })).rejects.toMatchObject({ httpStatus: 400 });
    expect(await readOrganizationSettings(globalManager.token)).toEqual({ timezone: null });
    expect(await updateOrganizationTimezone(owner.token, 'Africa/Abidjan')).toEqual({ timezone: 'Africa/Abidjan' });
    expect(await readOrganizationSettings(globalManager.token)).toEqual({ timezone: 'Africa/Abidjan' });
    expect(await updateOrganizationTimezone(owner.token, 'Africa/Abidjan')).toEqual({ timezone: 'Africa/Abidjan' });
    expect(await updateOrganizationTimezone(globalManager.token, 'UTC')).toEqual({ timezone: 'UTC' });
    const events = await db.query<{ actor_user_id: string; before: { timezone: string | null }; after: { timezone: string } }>(
      "SELECT actor_user_id::text, before, after FROM audit_log WHERE action = 'update_timezone' ORDER BY id");
    expect(events.rows).toEqual([
      { actor_user_id: '1', before: { timezone: null }, after: { timezone: 'Africa/Abidjan' } },
      { actor_user_id: '3', before: { timezone: 'Africa/Abidjan' }, after: { timezone: 'UTC' } },
    ]);
    expect((await db.query('SELECT key, value FROM app_settings')).rows).toEqual([
      { key: 'organization.timezone', value: 'UTC' },
    ]);
  });
  it('nom de l’organisation : droits globaux, normalisation, audit et idempotence', async () => {
    expect(await readOrganizationName(owner.token)).toEqual({ name: null });
    await expect(readOrganizationName(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(updateOrganizationName(scoped.token, 'Boutique')).rejects.toMatchObject({ httpStatus: 403 });
    await expect(updateOrganizationName(undefined, 'Boutique')).rejects.toMatchObject({ httpStatus: 401 });
    await expect(updateOrganizationName(owner.token, 'Nom\ninterdit')).rejects.toMatchObject({ httpStatus: 400 });
    expect(await updateOrganizationName(owner.token, '  Société Démo  ')).toEqual({ name: 'Société Démo' });
    expect(await readOrganizationName(globalManager.token)).toEqual({ name: 'Société Démo' });
    await updateOrganizationName(owner.token, 'Société Démo');
    await updateOrganizationName(globalManager.token, 'Autre organisation');
    const events = await db.query<{ actor_user_id: string; before: unknown; after: unknown }>(
      "SELECT actor_user_id::text, before, after FROM audit_log WHERE action = 'update_organization_name' ORDER BY id");
    expect(events.rows).toEqual([
      { actor_user_id: '1', before: { name: null }, after: { name: 'Société Démo' } },
      { actor_user_id: '3', before: { name: 'Société Démo' }, after: { name: 'Autre organisation' } },
    ]);
  });
  it('paramètres : les deux mutations et leur audit fonctionnent sous un rôle sans BYPASSRLS', async () => {
    try {
      useRestrictedRole = true;
      expect(await updateOrganizationTimezone(owner.token, 'Europe/Paris')).toEqual({ timezone: 'Europe/Paris' });
      expect(await updateOrganizationName(owner.token, 'Organisation rôle limité')).toEqual({ name: 'Organisation rôle limité' });
      await expect(updateOrganizationName(scoped.token, 'Interdit')).rejects.toMatchObject({ httpStatus: 403 });
    } finally { useRestrictedRole = false; }
    const events = await db.query<{ action: string; after: unknown }>(
      "SELECT action, after FROM audit_log WHERE action IN ('update_timezone', 'update_organization_name') ORDER BY id DESC LIMIT 2");
    expect(events.rows).toEqual([
      { action: 'update_organization_name', after: { name: 'Organisation rôle limité' } },
      { action: 'update_timezone', after: { timezone: 'Europe/Paris' } },
    ]);
  });
  it('nom de l’organisation : une erreur d’audit annule aussi la modification', async () => {
    await db.exec(`CREATE FUNCTION test_fail_name_audit() RETURNS trigger AS $$ BEGIN
      IF NEW.action = 'update_organization_name' THEN RAISE EXCEPTION 'forced'; END IF;
      RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER test_fail_name_audit BEFORE INSERT ON audit_log
      FOR EACH ROW EXECUTE FUNCTION test_fail_name_audit();`);
    try {
      useRestrictedRole = true;
      await expect(updateOrganizationName(owner.token, 'Changement annulé')).rejects.toThrow();
      expect(await readOrganizationName(owner.token)).toEqual({ name: 'Organisation rôle limité' });
    } finally {
      useRestrictedRole = false;
      await db.exec('DROP TRIGGER test_fail_name_audit ON audit_log; DROP FUNCTION test_fail_name_audit();');
    }
  });
  it('policy audit paramètres : refuse acteur absent ou différent et actions hors périmètre, sans ouvrir la lecture', async () => {
    const attempt = async (actorContext: string, actor: string, module: string, action: string, entity: string, shop: string | null) => {
      await db.exec('BEGIN; SET LOCAL ROLE settings_test_app;');
      try {
        await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [actorContext]);
        await db.query('INSERT INTO audit_log (actor_user_id, module, action, entity_type, shop_id) VALUES ($1,$2,$3,$4,$5)',
          [actor, module, action, entity, shop]);
      } finally { await db.exec('ROLLBACK;'); }
    };
    for (const args of [
      ['', '1', 'settings', 'update_organization_name', 'app_setting', null],
      ['', '1', 'settings', 'update_reference_currency', 'app_setting', null],
      ['1', '2', 'settings', 'update_reference_currency', 'app_setting', null],
      ['1', '1', 'settings', 'update_reference_currency', 'app_setting', '1'],
      ['1', '2', 'settings', 'update_organization_name', 'app_setting', null],
      ['1', '1', 'settings', 'delete_everything', 'app_setting', null],
      ['1', '1', 'other', 'update_timezone', 'app_setting', null],
      ['1', '1', 'settings', 'update_timezone', 'other', null],
      ['1', '1', 'settings', 'update_timezone', 'app_setting', '1'],
    ] as const) await expect(attempt(args[0], args[1], args[2], args[3], args[4], args[5]))
      .rejects.toMatchObject({ code: '42501' });
    await db.exec('BEGIN; SET LOCAL ROLE settings_test_app;');
    try {
      await db.query("SELECT set_config('app.audit_actor_id', $1, true)", ['1']);
      expect((await db.query('SELECT id FROM audit_log')).rows).toEqual([]);
    } finally { await db.exec('ROLLBACK;'); }
  });
  it('devise XOF : absence explicite, droits globaux, audit atomique et idempotence sous RLS', async () => {
    expect(await readOrganizationCurrency(owner.token)).toEqual({ currency: null });
    await expect(readOrganizationCurrency(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(updateOrganizationCurrency(scoped.token, 'XOF')).rejects.toMatchObject({ httpStatus: 403 });
    await expect(updateOrganizationCurrency(undefined, 'XOF')).rejects.toMatchObject({ httpStatus: 401 });
    for (const invalid of ['USD', 'xof', '=cmd', '', null, {}])
      await expect(updateOrganizationCurrency(owner.token, invalid)).rejects.toMatchObject({ httpStatus: 400 });
    try {
      useRestrictedRole = true;
      expect(await updateOrganizationCurrency(owner.token, 'XOF')).toEqual({ currency: 'XOF' });
      expect(await updateOrganizationCurrency(owner.token, 'XOF')).toEqual({ currency: 'XOF' });
      expect(await readOrganizationCurrency(globalManager.token)).toEqual({ currency: 'XOF' });
    } finally { useRestrictedRole = false; }
    const events = await db.query<{ actor_user_id: string; before: unknown; after: unknown }>(
      "SELECT actor_user_id::text, before, after FROM audit_log WHERE action='update_reference_currency' ORDER BY id");
    expect(events.rows).toEqual([{ actor_user_id: '1', before: { currency: null }, after: { currency: 'XOF' } }]);
    await db.exec("UPDATE app_settings SET value='\"USD\"'::jsonb WHERE key='organization.reference_currency'");
    try {
      await expect(readOrganizationCurrency(owner.token)).rejects.toMatchObject({ httpStatus: 400 });
      await expect(updateOrganizationCurrency(owner.token, 'XOF')).rejects.toMatchObject({ httpStatus: 400 });
    } finally { await db.exec("UPDATE app_settings SET value='\"XOF\"'::jsonb WHERE key='organization.reference_currency'"); }
  });
  it('devise : une erreur d’audit annule la première écriture', async () => {
    await db.exec(`DELETE FROM app_settings WHERE key='organization.reference_currency';
      CREATE FUNCTION test_fail_currency_audit() RETURNS trigger AS $$ BEGIN
      IF NEW.action = 'update_reference_currency' THEN RAISE EXCEPTION 'forced'; END IF;
      RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER test_fail_currency_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION test_fail_currency_audit();`);
    try {
      useRestrictedRole = true;
      await expect(updateOrganizationCurrency(owner.token, 'XOF')).rejects.toThrow();
      expect(await readOrganizationCurrency(owner.token)).toEqual({ currency: null });
    } finally {
      useRestrictedRole = false;
      await db.exec('DROP TRIGGER test_fail_currency_audit ON audit_log; DROP FUNCTION test_fail_currency_audit();');
    }
    await updateOrganizationCurrency(owner.token, 'XOF');
  });
  it('statut utilisateur : droits globaux, protections owner/soi, sessions révoquées et audit atomique', async () => {
    const fixture = await db.query<{ id: string }>(`INSERT INTO users (email,password_hash,display_name)
      VALUES ('statut-mutation@fixture.invalid','SECRET_HASH','Compte modifiable') RETURNING id::text`);
    const id = fixture.rows[0]!.id;
    const device = createSessionToken();
    try {
      await db.query("INSERT INTO user_roles (user_id,role_code,shop_id) VALUES ($1,'manager',NULL)", [id]);
      await db.query("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')", [id, device.hash]);
      await expect(changeUserStatus(scoped.token, id, 'suspended')).rejects.toMatchObject({ httpStatus: 403 });
      await expect(changeUserStatus(undefined, id, 'suspended')).rejects.toMatchObject({ httpStatus: 401 });
      await expect(changeUserStatus(owner.token, '1', 'suspended')).rejects.toMatchObject({ httpStatus: 403 });
      await expect(changeUserStatus(device.token, id, 'suspended')).rejects.toMatchObject({ httpStatus: 403 });
      await expect(changeUserStatus(owner.token, id, 'invited')).rejects.toMatchObject({ httpStatus: 400 });
      await db.query("UPDATE users SET status='invited' WHERE id=$1", [id]);
      await expect(changeUserStatus(owner.token, id, 'active')).rejects.toMatchObject({ httpStatus: 409 });
      await db.query("UPDATE users SET status='active' WHERE id=$1", [id]);
      expect(await changeUserStatus(owner.token, id, 'suspended')).toEqual({ id, status: 'suspended', changed: true });
      expect((await db.query<{ revoked_at: Date | null }>('SELECT revoked_at FROM sessions WHERE user_id = $1', [id])).rows[0]?.revoked_at).not.toBeNull();
      expect(await changeUserStatus(owner.token, id, 'suspended')).toEqual({ id, status: 'suspended', changed: false });
      expect(await changeUserStatus(owner.token, id, 'active')).toEqual({ id, status: 'active', changed: true });
      expect((await db.query<{ revoked_at: Date | null }>('SELECT revoked_at FROM sessions WHERE user_id = $1', [id])).rows[0]?.revoked_at).not.toBeNull();
      const events = await db.query<{ before: { status: string }; after: { status: string } }>(
        "SELECT before, after FROM audit_log WHERE action='change_status' AND before->>'userId'=$1 ORDER BY id", [id]);
      expect(events.rows).toMatchObject([
        { before: { status: 'active' }, after: { status: 'suspended' } },
        { before: { status: 'suspended' }, after: { status: 'active' } },
      ]);
      expect(JSON.stringify(events.rows)).not.toMatch(/SECRET_HASH|token_hash|password_hash/);
      await db.query("INSERT INTO user_roles (user_id,role_code,shop_id) VALUES ($1,'owner',NULL)", [id]);
      await expect(changeUserStatus(owner.token, id, 'suspended')).rejects.toMatchObject({ httpStatus: 403 });
    } finally { await db.query('DELETE FROM users WHERE id = $1', [id]); }
  });
  it('fiche utilisateur : rôles réels global/boutique, pas de secrets', async () => {
    const scopedUser = await getAuthorizedUser(owner.token, '2');
    expect(scopedUser).toMatchObject({ email: 'scoped@test.invalid',
      roles: [{ code: 'manager', label: 'Gestionnaire', shopId: '1' }] });
    expect((await getAuthorizedUser(owner.token, '1'))?.roles[0]?.shopId).toBeNull();
    expect(JSON.stringify(scopedUser)).not.toMatch(/password_hash|totp_secret|token_hash/);
    expect(await getAuthorizedUser(owner.token, '999999')).toBeNull();
    await expect(getAuthorizedUser(scoped.token, '2')).rejects.toMatchObject({ httpStatus: 403 });
    await expect(getAuthorizedUser(undefined, '2')).rejects.toMatchObject({ httpStatus: 401 });
  });
  it('sessions : uniquement celles du compte, sans empreinte ni user-agent brut', async () => {
    const more = createSessionToken();
    await db.query("INSERT INTO sessions (user_id, token_hash, expires_at, user_agent) VALUES ($1,$2,now()+interval '1 hour',$3)",
      [1, more.hash, 'Hostile-UA: <script>alert(1)</script>']);
    const ownerSessions = await listOwnSessions(owner.token);
    expect(ownerSessions).toHaveLength(2);
    expect(ownerSessions.filter((session) => session.current)).toHaveLength(1);
    expect(ownerSessions.find((session) => !session.current)?.device).toBe('Navigateur');
    expect((await listOwnSessions(scoped.token))).toHaveLength(1);
    expect(JSON.stringify(ownerSessions)).not.toMatch(/token_hash|Hostile-UA|script|user_agent|ip_hash/);
    await expect(listOwnSessions(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(listOwnSessions(createSessionToken().token)).rejects.toMatchObject({ httpStatus: 401 });
  });
  it('révocation ciblée : autre session du compte uniquement, audit atomique, courant préservé', async () => {
    const other = createSessionToken(); const stranger = createSessionToken();
    const target = await db.query<{ id: string }>(`INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (1,$1,now()+interval '1 hour') RETURNING id::text`, [other.hash]);
    const foreign = await db.query<{ id: string }>(`INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (2,$1,now()+interval '1 hour') RETURNING id::text`, [stranger.hash]);
    const ownId = (await listOwnSessions(owner.token)).find((s) => s.current)!.id;
    const before = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM audit_log WHERE action = 'revoke_other_session'");
    await expect(revokeOtherSession(owner.token, ownId)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(revokeOtherSession(owner.token, foreign.rows[0]!.id)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(revokeOtherSession(scoped.token, target.rows[0]!.id)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(revokeOtherSession(owner.token, '1 OR 1=1')).rejects.toMatchObject({ httpStatus: 400 });
    await expect(revokeOtherSession(owner.token, '9223372036854775808')).rejects.toMatchObject({ httpStatus: 400 });
    await expect(revokeOtherSession(undefined, target.rows[0]!.id)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(revokeOtherSession(createSessionToken().token, target.rows[0]!.id)).rejects.toMatchObject({ httpStatus: 401 });
    await revokeOtherSession(owner.token, target.rows[0]!.id);
    await expect(refreshSession(other.token)).rejects.toMatchObject({ httpStatus: 401 });
    expect((await listOwnSessions(owner.token)).some((s) => s.id === target.rows[0]!.id)).toBe(false);
    expect((await listOwnSessions(owner.token)).some((s) => s.current)).toBe(true);
    expect((await listOwnSessions(scoped.token)).some((s) => s.id === foreign.rows[0]!.id)).toBe(true);
    await expect(revokeOtherSession(owner.token, target.rows[0]!.id)).rejects.toMatchObject({ httpStatus: 404 });
    const audit = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM audit_log WHERE action = 'revoke_other_session' AND actor_user_id = 1");
    expect(audit.rows[0]!.n).toBe(before.rows[0]!.n + 1);
  });
  it('révocation groupée : toutes les autres du même compte, jamais la courante ni un autre compte', async () => {
    const otherA = createSessionToken(); const otherB = createSessionToken();
    for (const other of [otherA, otherB]) await db.query(
      "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (1,$1,now()+interval '1 hour')", [other.hash]);
    const foreign = createSessionToken();
    await db.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (2,$1,now()+interval '1 hour')", [foreign.hash]);
    const before = await listOwnSessions(owner.token);
    const count = before.filter((s) => !s.current).length;
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(revokeAllOtherSessions(undefined)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(revokeAllOtherSessions(createSessionToken().token)).rejects.toMatchObject({ httpStatus: 401 });
    const auditBefore = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM audit_log WHERE action='revoke_all_other_sessions'");
    expect(await revokeAllOtherSessions(owner.token)).toEqual({ revokedCount: count });
    expect((await listOwnSessions(owner.token)).map((s) => s.current)).toEqual([true]);
    await expect(refreshSession(otherA.token)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(refreshSession(otherB.token)).rejects.toMatchObject({ httpStatus: 401 });
    expect((await listOwnSessions(scoped.token)).some((s) => s.current)).toBe(true);
    await expect(refreshSession(foreign.token)).resolves.toBeInstanceOf(Date);
    expect(await revokeAllOtherSessions(owner.token)).toEqual({ revokedCount: 0 });
    const audit = await db.query<{ before: { activeOtherSessions: number }; after: { activeOtherSessions: number } }>(
      "SELECT before, after FROM audit_log WHERE action='revoke_all_other_sessions' ORDER BY id");
    expect(audit.rows).toHaveLength(auditBefore.rows[0]!.n + 1);
    expect(audit.rows.at(-1)?.before.activeOtherSessions).toBe(count);
    expect(audit.rows.at(-1)?.after.activeOtherSessions).toBe(0);
  });
  it('expiration glissante : prolonge active, refuse expirée et révoquée', async () => {
    await db.exec("UPDATE sessions SET last_seen_at = now() - interval '15 minutes' WHERE user_id = 1;");
    const before = await db.query<{ expires_at: Date }>('SELECT expires_at FROM sessions WHERE token_hash = $1', [owner.hash]);
    const expires = await refreshSession(owner.token);
    expect(expires.getTime()).toBeGreaterThan(new Date(before.rows[0]!.expires_at).getTime());
    const current = await db.query<{ last_seen_at: Date }>('SELECT last_seen_at FROM sessions WHERE token_hash = $1', [owner.hash]);
    const again = await refreshSession(owner.token);
    expect(again.getTime()).toBe(expires.getTime());
    expect(current.rows).toHaveLength(1);
    const expired = createSessionToken(); const revoked = createSessionToken();
    await db.query("INSERT INTO sessions (user_id, token_hash, created_at, expires_at) VALUES (1, $1, now() - interval '1 day', now() - interval '1 minute')", [expired.hash]);
    await db.query("INSERT INTO sessions (user_id, token_hash, expires_at, revoked_at) VALUES (1, $1, now() + interval '1 hour', now())", [revoked.hash]);
    await expect(refreshSession(expired.token)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(refreshSession(revoked.token)).rejects.toMatchObject({ httpStatus: 401 });
    await expect(refreshSession(undefined)).rejects.toMatchObject({ httpStatus: 401 });
  });
  it('pagination contrôlée et aucun accès à une page malformée', async () => {
    expect((await listAuthorizedUsers(owner.token, 2)).users).toEqual([]);
    await expect(listAuthorizedUsers(owner.token, 0)).rejects.toThrow(/Page invalide/);
    await expect(listAuthorizedUsers(owner.token, 10_001)).rejects.toThrow(/Page invalide/);
  });
  it('exports paramètres : sélection limitée, double autorisation globale et RLS', async () => {
    await db.exec(`INSERT INTO app_settings (key, value) VALUES
      ('organization.name', '"=cmd"'::jsonb), ('organization.timezone', '"UTC"'::jsonb),
      ('fixture.sensitive', '"SECRET_FIXTURE_EXCLU"'::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`);
    try {
      useRestrictedRole = true;
      const csv = await exportOrganizationSettingsCsv(owner.token);
      expect(csv).toContain('"\'=cmd"'); expect(csv).toContain('"UTC"');
      expect(csv).toContain('"Devise de référence","XOF"');
      expect(csv).not.toContain('SECRET_FIXTURE_EXCLU');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load((await exportOrganizationSettingsXlsx(owner.token)).buffer);
      const sheet = workbook.getWorksheet('Paramètres')!;
      expect(sheet.getCell('B5').value).toBe("'=cmd"); expect(sheet.getCell('B6').value).toBe('UTC');
      expect(sheet.getCell('B7').value).toBe('XOF');
      expect(JSON.stringify(sheet.getSheetValues())).not.toContain('SECRET_FIXTURE_EXCLU');
      const draw = vi.spyOn(PDFPage.prototype, 'drawText');
      try {
        const pdf = await exportOrganizationSettingsPdf(owner.token);
        expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe('%PDF-');
        const lines = draw.mock.calls.map(([text]) => text);
        expect(lines).toContain("'=cmd"); expect(lines).toContain('UTC'); expect(lines).toContain('XOF');
        expect(lines.join(' ')).not.toContain('SECRET_FIXTURE_EXCLU');
      } finally { draw.mockRestore(); }
      for (const run of [exportOrganizationSettingsCsv, exportOrganizationSettingsXlsx, exportOrganizationSettingsPdf]) {
        await expect(run(scoped.token)).rejects.toMatchObject({ httpStatus: 403 });
        await expect(run(undefined)).rejects.toMatchObject({ httpStatus: 401 });
        await expect(run(createSessionToken().token)).rejects.toMatchObject({ httpStatus: 401 });
      }
      useRestrictedRole = false;
      for (const permission of ['reports:export', 'settings:read']) {
        await db.query("DELETE FROM role_permissions WHERE role_code='owner' AND permission_code=$1", [permission]);
        try {
          await expect(exportOrganizationSettingsCsv(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
          await expect(exportOrganizationSettingsXlsx(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
          await expect(exportOrganizationSettingsPdf(owner.token)).rejects.toMatchObject({ httpStatus: 403 });
        } finally {
          await db.query("INSERT INTO role_permissions(role_code,permission_code) VALUES ('owner',$1)", [permission]);
        }
      }
    } finally {
      useRestrictedRole = false;
      await db.exec("DELETE FROM app_settings WHERE key='fixture.sensitive'");
    }
  });
});
