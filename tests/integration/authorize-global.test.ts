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
const { listAuthorizedUsers } = await import('@/modules/identity/user-list');
const { getNavigationPermissions } = await import('@/ui/navigation-permissions');
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
  it('pagination contrôlée et aucun accès à une page malformée', async () => {
    expect((await listAuthorizedUsers(owner.token, 2)).users).toEqual([]);
    await expect(listAuthorizedUsers(owner.token, 0)).rejects.toThrow(/Page invalide/);
    await expect(listAuthorizedUsers(owner.token, 10_001)).rejects.toThrow(/Page invalide/);
  });
});
