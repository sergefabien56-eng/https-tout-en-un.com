/** Matrice attendue indépendante de l'INSERT de migration : 31 permissions × 5 rôles. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let db: PGlite;
let actual: Map<string, Set<string>>;
let all: string[];

const stock = [
  'dashboard:read', 'shops:read', 'products:read', 'products:write',
  'inventory:read', 'inventory:write', 'inventory:count', 'orders:read',
  'returns:read', 'returns:write', 'purchasing:read', 'purchasing:write',
  'reports:read', 'sync:read',
];
const accountant = [
  'dashboard:read', 'shops:read', 'orders:read', 'finance:read',
  'finance:write', 'finance:reconcile', 'purchasing:read', 'returns:read',
  'reports:read', 'reports:export', 'audit:read', 'sync:read',
];
const assistant = [
  'dashboard:read', 'shops:read', 'products:read', 'orders:read',
  'orders:write', 'inventory:read', 'returns:read', 'reports:read', 'sync:read',
];

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, f), 'utf8'));
  }
  all = (await db.query<{ code: string }>('SELECT code FROM permissions ORDER BY code')).rows.map((r) => r.code);
  const rows = (await db.query<{ role_code: string; permission_code: string }>(
    'SELECT role_code, permission_code FROM role_permissions',
  )).rows;
  actual = new Map();
  for (const row of rows) {
    const set = actual.get(row.role_code) ?? new Set<string>();
    set.add(row.permission_code);
    actual.set(row.role_code, set);
  }
});
afterAll(async () => { await db.close(); });

describe('matrice exhaustive des cinq rôles', () => {
  const expectations: Record<string, (perms: string[]) => string[]> = {
    owner: (p) => p,
    manager: (p) => p.filter((x) => x !== 'system:manage' && x !== 'roles:manage'),
    stock_manager: () => stock,
    accountant: () => accountant,
    assistant: () => assistant,
  };
  for (const [role, allowed] of Object.entries(expectations)) {
    it(`rôle ${role} : chaque permission acceptée/refusée comme prévu`, () => {
      expect(all).toHaveLength(31);
      const expected = new Set(allowed(all));
      for (const permission of all) {
        expect(actual.get(role)?.has(permission) ?? false, `${role} × ${permission}`).toBe(expected.has(permission));
      }
      expect(actual.get(role)?.size).toBe(expected.size);
    });
  }
});
