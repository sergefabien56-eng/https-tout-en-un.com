/** Permissions globales, non confondues avec un rôle limité à une boutique. */
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
    try { const result = await task(db as unknown as PoolClient); await db.exec('COMMIT;'); return result; }
    catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));
const { listAuthorizedUsers, getAuthorizedUser } = await import('@/modules/identity/user-list');
const { getNavigationPermissions } = await import('@/ui/navigation-permissions');
const { getRoleMatrix } = await import('@/modules/identity/role-matrix');
const { getDeepHealth } = await import('@/modules/monitoring/deep-health');
const { listOwnSessions } = await import('@/modules/identity/active-sessions');
const { refreshSession } = await import('@/core/auth/refresh-session');
const owner = createSessionToken(); const scoped = createSessionToken(); const globalManager = createSessionToken();

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  await db.exec(`
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
  it('pagination des résultats garde la combinaison recherche et statut côté serveur', async () => {
    await db.exec(`INSERT INTO users (email, password_hash, display_name, status)
      SELECT 'page-filter-' || n || '@fixture.invalid', 'hash', 'Pagination filtre', 'invited'
      FROM generate_series(1, 21) AS n`);
    try {
      const first = await listAuthorizedUsers(owner.token, 1, 'Pagination filtre', 'invited');
      const second = await listAuthorizedUsers(owner.token, 2, 'Pagination filtre', 'invited');
      expect(first.users).toHaveLength(20);
      expect(first.nextPage).toBe(2);
      expect(second.users).toHaveLength(1);
      expect(second.nextPage).toBeNull();
      expect((await listAuthorizedUsers(owner.token, 2, 'Pagination filtre', 'active')).users).toEqual([]);
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
  it('manager global : lecture autorisée, action système refusée', async () => {
    expect((await listAuthorizedUsers(globalManager.token)).users).toHaveLength(3);
    const grants = await getNavigationPermissions('3');
    expect(grants.globalPermissions.has('users:read')).toBe(true);
    expect(grants.globalPermissions.has('system:manage')).toBe(false);
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
  it('santé profonde : propriétaire uniquement, nombre réel de migrations', async () => {
    // Le runner crée schema_migrations, le test PGlite applique directement les fichiers.
    await db.exec('CREATE TABLE schema_migrations (version text PRIMARY KEY);');
    await db.exec("INSERT INTO schema_migrations VALUES ('0001'), ('0002');");
    const health = await getDeepHealth(owner.token);
    expect(health).toMatchObject({ database: 'ok', migrationsApplied: 2, queue: 'indisponible' });
    await expect(getDeepHealth(globalManager.token)).rejects.toMatchObject({ httpStatus: 403 });
    await expect(getDeepHealth(undefined)).rejects.toMatchObject({ httpStatus: 401 });
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
});
