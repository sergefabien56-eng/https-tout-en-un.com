/**
 * Migrations exécutées réellement, sur un PostgreSQL compilé en WASM (PGlite).
 * Limite assumée : PGlite n'expose pas pg_trgm/unaccent ; la migration 0001 est écrite pour
 * tolérer leur absence. L'exécution sur PostgreSQL 16 avec ces extensions se fait en CI.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

function migrationFiles(direction: 'up' | 'down'): { version: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(`.${direction}.sql`))
    .sort()
    .map((file) => ({
      version: file.replace(`.${direction}.sql`, ''),
      sql: readFileSync(join(MIGRATIONS_DIR, file), 'utf8'),
    }));
}

let db: PGlite;

async function applyAll(direction: 'up' | 'down'): Promise<void> {
  const files = migrationFiles(direction);
  const ordered = direction === 'up' ? files : [...files].reverse();
  for (const file of ordered) {
    try {
      await db.exec(file.sql);
    } catch (error) {
      throw new Error(`Migration ${file.version} (${direction}) échouée : ${(error as Error).message}`);
    }
  }
}

/** Exécute un script et renvoie les lignes du dernier SELECT. */
async function queryRows(sql: string): Promise<Record<string, unknown>[]> {
  const results = await db.exec(sql);
  for (let i = results.length - 1; i >= 0; i -= 1) {
    const result = results[i];
    if (result && Array.isArray(result.rows) && result.rows.length > 0) {
      return result.rows as Record<string, unknown>[];
    }
  }
  return [];
}

/**
 * Exécute une requête avec le rôle applicatif et un contexte boutique.
 * Le contexte est LOCAL à la transaction (set LOCAL) : c'est la règle de production, et cela
 * évite qu'un contexte survive à la transaction suivante (fuite entre requêtes).
 */
const asAppUser = (shopId: string | null, sql: string): string => `BEGIN;
SET LOCAL ROLE app_user;   -- LOCAL : le rôle est rendu au COMMIT (SET ROLE, lui, persiste)
SET LOCAL app.shop_id = ${shopId === null ? "''" : `'${shopId}'`};
${sql}
COMMIT;`;

beforeAll(async () => {
  db = await PGlite.create();
  await applyAll('up');
  // Rôle applicatif réel : ni superutilisateur ni BYPASSRLS, sinon la RLS serait ignorée.
  await db.exec(`
    CREATE ROLE app_user NOLOGIN;
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
  `);
});

afterAll(async () => {
  await db.close();
});

describe('migrations — application et structure', () => {
  it('applique les 10 migrations sans erreur', () => {
    expect(migrationFiles('up')).toHaveLength(10);
  });

  it('crée les tables du socle', async () => {
    const rows = await queryRows(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;`,
    );
    const tables = rows.map((row) => String(row['table_name']));
    expect(tables).toEqual(
      expect.arrayContaining([
        'app_settings', 'audit_log', 'marketplace_apps', 'permissions', 'rate_limits',
        'role_permissions', 'roles', 'sessions', 'shops', 'system_events',
        'user_roles', 'user_shop_access', 'users',
      ]),
    );
  });

  it('insère les 5 rôles système et le catalogue de permissions', async () => {
    const roles = await queryRows(`SELECT code FROM roles ORDER BY code;`);
    expect(roles.map((r) => r['code'])).toEqual(['accountant', 'assistant', 'manager', 'owner', 'stock_manager']);
    const perms = await queryRows(`SELECT count(*)::int AS n FROM permissions;`);
    expect(perms[0]?.['n']).toBe(31);
    const ownerPerms = await queryRows(`SELECT count(*)::int AS n FROM role_permissions WHERE role_code = 'owner';`);
    expect(ownerPerms[0]?.['n']).toBe(31);
    const managerSystem = await queryRows(
      `SELECT count(*)::int AS n FROM role_permissions
       WHERE role_code = 'manager' AND permission_code IN ('system:manage','roles:manage');`,
    );
    expect(managerSystem[0]?.['n']).toBe(0);
  });
});

describe('contraintes d’intégrité', () => {
  it('interdit deux fois la même boutique réelle (sid + business client)', async () => {
    await db.exec(`
      INSERT INTO marketplace_apps (label, client_id) VALUES ('Compte principal', 'client-abc');
      INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
      VALUES (1, 'b16aac6d-4b08-45ab-b8be-baf11615f400', 'jumia-ci', 'CI', 'XOF', 'Jumia CI — Électronique');
    `);
    await expect(
      db.exec(`INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
               VALUES (1, 'b16aac6d-4b08-45ab-b8be-baf11615f400', 'jumia-ci', 'CI', 'XOF', 'Doublon');`),
    ).rejects.toThrow(/shops_identity_uq|duplicate key/);
  });

  it('interdit un pays hors périmètre Jumia et une devise incohérente', async () => {
    await expect(
      db.exec(`INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
               VALUES (1, gen_random_uuid(), 'jumia-cm', 'CM', 'XAF', 'Cameroun');`),
    ).rejects.toThrow(/country_code/);
    await expect(
      db.exec(`INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
               VALUES (1, gen_random_uuid(), 'jumia-ng', 'NG', 'XOF', 'Devise incohérente');`),
    ).rejects.toThrow(/shops_country_currency_ck|currency/);
  });

  it('interdit un demi-secret chiffré (chiffré sans IV ni tag)', async () => {
    await expect(
      db.exec(`INSERT INTO marketplace_apps (label, client_id, refresh_token_ciphertext)
               VALUES ('Compte incomplet', 'client-xyz', '\\x00'::bytea);`),
    ).rejects.toThrow(/refresh_tuple_ck/);
  });

  it('unicité email insensible à la casse', async () => {
    await db.exec(`INSERT INTO users (email, password_hash, display_name) VALUES ('Konan@Example.com', 'hash', 'Konan');`);
    await expect(
      db.exec(`INSERT INTO users (email, password_hash, display_name) VALUES ('konan@example.com', 'hash', 'Autre');`),
    ).rejects.toThrow(/users_email_lower_uq|duplicate key/);
  });

  it('unicité des rôles par boutique, y compris quand shop_id est NULL', async () => {
    await db.exec(`
      INSERT INTO user_roles (user_id, role_code) VALUES (1, 'owner');
    `);
    await expect(db.exec(`INSERT INTO user_roles (user_id, role_code) VALUES (1, 'owner');`)).rejects.toThrow(/user_roles_unique/);
  });
});

describe('journal d’audit — ajout seul', () => {
  it('accepte une insertion et refuse toute modification', async () => {
    await db.exec(`INSERT INTO audit_log (actor_user_id, shop_id, module, action) VALUES (1, 1, 'shops', 'shops.create');`);
    await expect(db.exec(`UPDATE audit_log SET action = 'shops.delete' WHERE id = 1;`)).rejects.toThrow(/MUTATION_INTERDITE/);
    await expect(db.exec(`DELETE FROM audit_log WHERE id = 1;`)).rejects.toThrow(/MUTATION_INTERDITE/);
    const rows = await queryRows(`SELECT count(*)::int AS n FROM audit_log WHERE action = 'shops.create';`);
    expect(rows[0]?.['n']).toBe(1);
  });
});

async function expectRejected(sql: string, pattern: RegExp): Promise<void> {
  let caught: unknown;
  try {
    await db.exec(sql);
  } catch (error) {
    caught = error;
  } finally {
    await db.exec('ROLLBACK;').catch(() => undefined);
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toMatch(pattern);
}

describe('RLS — isolation entre boutiques', () => {
  afterAll(async () => {
    await db.exec('ROLLBACK;').catch(() => undefined);
    await db.exec('RESET ROLE;').catch(() => undefined);
  });

  beforeAll(async () => {
    await db.exec(`
      INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
      VALUES (1, gen_random_uuid(), 'jumia-sn', 'SN', 'XOF', 'Jumia SN — Maison');
      INSERT INTO user_shop_access (user_id, shop_id)
        SELECT 1, id FROM shops ORDER BY id;
    `);
  });

  it('ne montre que la boutique du contexte', async () => {
    const ids = await queryRows(`SELECT id::int AS id, display_name FROM shops ORDER BY id;`);
    expect(ids).toHaveLength(2);
    const [first, second] = ids;

    const shop1 = await queryRows(asAppUser(String(first?.['id']), 'SELECT display_name FROM shops;'));
    expect(shop1.map((r) => r['display_name'])).toEqual([first?.['display_name']]);

    const shop2 = await queryRows(asAppUser(String(second?.['id']), 'SELECT display_name FROM shops;'));
    expect(shop2.map((r) => r['display_name'])).toEqual([second?.['display_name']]);
  });

  it('ne montre rien sans contexte boutique (aucune fuite par défaut)', async () => {
    const rows = await queryRows(asAppUser(null, 'SELECT count(*)::int AS n FROM shops;'));
    expect(Number(rows[0]?.['n'] ?? -1)).toBe(0);
  });

  it('refuse d’écrire dans une autre boutique que celle du contexte', async () => {
    const ids = await queryRows(`SELECT id::int AS id FROM shops ORDER BY id;`);
    await expectRejected(
      asAppUser(
        String(ids[0]?.['id']),
        `INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
         VALUES (1, gen_random_uuid(), 'jumia-gh', 'GH', 'GHS', 'Jumia GH');`,
      ),
      /row-level security/,
    );
  });

  it('ne révèle pas les événements globaux sans contexte (défaut fermé)', async () => {
    await db.exec(`INSERT INTO system_events (severity, category, code, message)
      VALUES ('info', 'system', 'TEST', 'Test');`);
    const rows = await queryRows(asAppUser(null, 'SELECT count(*)::int AS n FROM system_events;'));
    expect(Number(rows[0]?.['n'] ?? -1)).toBe(0);
  });

  it('isole aussi la table d’accès aux boutiques', async () => {
    const ids = await queryRows(`SELECT id::int AS id FROM shops ORDER BY id;`);
    const rows = await queryRows(
      asAppUser(String(ids[0]?.['id']), 'SELECT count(*)::int AS n FROM user_shop_access;'),
    );
    expect(Number(rows[0]?.['n'] ?? -1)).toBe(1);
  });
});

describe('migrations réversibles', () => {
  it('applique les down dans l’ordre inverse sans erreur', async () => {
    await db.exec('RESET ROLE;');
    await db.exec('DROP OWNED BY app_user; DROP ROLE IF EXISTS app_user;');
    await expect(applyAll('down')).resolves.toBeUndefined();
    const rows = await queryRows(
      `SELECT count(*)::int AS n FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE';`,
    );
    expect(Number(rows[0]?.['n'] ?? -1)).toBe(0);
  });
});
