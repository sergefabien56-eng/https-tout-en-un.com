/** Recette L10 — entrées hostiles sur TOUS les exports : 4xx explicite, jamais 5xx. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { NextRequest } from 'next/server';
import { createSessionToken } from '@/core/auth/primitives';

let db: PGlite;
vi.mock('@/core/db/client', () => {
  const run = async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN; SET LOCAL ROLE hostile_test_app');
    try { const result = await task(db as unknown as PoolClient); await db.exec('COMMIT'); return result; }
    catch (error) { await db.exec('ROLLBACK'); throw error; }
  };
  return {
    withIdentityTransaction: run,
    withShopTransaction: async <T>(_shopId: string, task: (client: PoolClient) => Promise<T>) => run(task),
  };
});

type RouteModule = { GET: (request: NextRequest, context?: never) => Promise<Response> };
const owner = createSessionToken();

const load = async (path: string) => (await import(path)) as unknown as RouteModule;

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort())
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  await db.exec(`CREATE ROLE hostile_test_app NOLOGIN NOBYPASSRLS; GRANT USAGE ON SCHEMA public TO hostile_test_app;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO hostile_test_app;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO hostile_test_app;
    INSERT INTO marketplace_apps (label,client_id) VALUES ('fixture','hostile-exports');
    INSERT INTO shops (app_id,jumia_shop_sid,business_client_code,country_code,currency,display_name) VALUES
      (1,gen_random_uuid(),'hostile-a','CI','XOF','Boutique hostile');
    INSERT INTO users (email,password_hash,display_name) VALUES ('owner@fixture.invalid','SECRET_HASH','Owner');
    INSERT INTO user_roles (user_id,role_code,shop_id) VALUES (1,'owner',NULL);
    -- Le runner de migration crée schema_migrations ; le test PGlite applique les fichiers.
    CREATE TABLE schema_migrations (version text PRIMARY KEY);
    GRANT SELECT ON schema_migrations TO hostile_test_app;
    INSERT INTO schema_migrations VALUES ('0001');
    GRANT SELECT ON audit_log TO hostile_test_app;
    INSERT INTO user_shop_access (user_id,shop_id,can_view) VALUES (1,1,true);
    INSERT INTO audit_log (occurred_at,actor_user_id,shop_id,module,action,result) VALUES
      ('2026-01-01T12:00:00Z',1,NULL,'roles','update_role_permission','success'),
      ('2026-01-02T12:00:00Z',1,1,'shops','<script>alert(1)</script>','failure');`);
  await db.query("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES (1,$1,now()+interval '1 hour')",
    [owner.hash]);
});
afterAll(async () => { await db.close(); });

/** Chaque cas hostile : la requête doit finir en 4xx explicite (jamais 5xx, jamais 200 trompeur). */
const hostileCases: { label: string; query: string; allowed?: number[] }[] = [
  { label: 'recherche de 5 000 caractères', query: `?q=${'a'.repeat(5000)}` },
  { label: 'caractère de contrôle (NUL)', query: '?q=a%00b' },
  { label: 'retour chariot dans la recherche', query: '?q=a%0D%0ASet-Cookie:%20x=1' },
  { label: 'statut hors énumération', query: '?status=../../etc/passwd' },
  { label: 'tri hors énumération', query: '?sort=;DROP%20TABLE%20users' },
  { label: 'rôle hors énumération', query: "?role=owner'%20OR%201=1--" },
  { label: 'date impossible', query: '?from=2026-02-30' },
  { label: 'date inexistante en ISO', query: '?from=0000-00-00' },
  { label: 'mois 13', query: '?to=2026-13-01' },
  { label: 'période inversée', query: '?from=2026-05-01&to=2026-04-01' },
  { label: 'module avec injection', query: '?module=roles;DELETE%20FROM%20audit_log' },
  { label: 'acteur négatif', query: '?actorId=-1' },
  { label: 'acteur non numérique', query: '?actorId=1e5' },
  { label: 'acteur au-delà de bigint', query: '?actorId=999999999999999999999' },
  { label: 'résultat hors énumération', query: '?result=maybe' },
];

/** Chaque export réel : CSV, XLSX et PDF (le journal global expose csv/xlsx/pdf). */
const exportRoutes: { module: string; suffix: string }[] = [
  { module: '@/app/api/admin/audit/global/export/csv/route', suffix: 'audit/global/export/csv' },
  { module: '@/app/api/admin/audit/global/export/xlsx/route', suffix: 'audit/global/export/xlsx' },
  { module: '@/app/api/admin/audit/global/export/pdf/route', suffix: 'audit/global/export/pdf' },
  { module: '@/app/api/admin/users/export/route', suffix: 'users/export' },
  { module: '@/app/api/admin/users/export/xlsx/route', suffix: 'users/export/xlsx' },
  { module: '@/app/api/admin/users/export/pdf/route', suffix: 'users/export/pdf' },
  { module: '@/app/api/admin/roles/export/route', suffix: 'roles/export' },
  { module: '@/app/api/admin/roles/export/xlsx/route', suffix: 'roles/export/xlsx' },
  { module: '@/app/api/admin/roles/export/pdf/route', suffix: 'roles/export/pdf' },
  { module: '@/app/api/admin/settings/export/route', suffix: 'settings/export' },
  { module: '@/app/api/admin/settings/export/xlsx/route', suffix: 'settings/export/xlsx' },
  { module: '@/app/api/admin/settings/export/pdf/route', suffix: 'settings/export/pdf' },
  { module: '@/app/api/admin/system/export/route', suffix: 'system/export' },
  { module: '@/app/api/admin/system/export/xlsx/route', suffix: 'system/export/xlsx' },
  { module: '@/app/api/admin/system/export/pdf/route', suffix: 'system/export/pdf' },
  { module: '@/app/api/shops/export/route', suffix: 'shops/export' },
  { module: '@/app/api/shops/export/xlsx/route', suffix: 'shops/export/xlsx' },
  { module: '@/app/api/shops/export/pdf/route', suffix: 'shops/export/pdf' },
  { module: '@/app/api/shops/[shopId]/audit/export/route', suffix: 'shops/1/audit/export' },
  { module: '@/app/api/shops/[shopId]/audit/export/xlsx/route', suffix: 'shops/1/audit/export/xlsx' },
  { module: '@/app/api/shops/[shopId]/audit/export/pdf/route', suffix: 'shops/1/audit/export/pdf' },
];

describe('exports — entrées hostiles', () => {
  it('tous les exports refusent proprement les entrées hostiles (4xx, aucun 5xx)', async () => {
    const failures: string[] = [];
    for (const route of exportRoutes) {
      const module = await load(route.module);
      const shopId = route.suffix.startsWith('shops/1') ? '1' : undefined;
      for (const testCase of hostileCases) {
        const response = await module.GET(new NextRequest(
          `https://app.example/api/${route.suffix}${testCase.query}`,
          { headers: { cookie: `toutenun_session=${owner.token}` } }),
        ...(shopId ? [{ params: Promise.resolve({ shopId }) } as never] : []));
        if (response.status >= 500) failures.push(`${route.suffix} ${testCase.label} → ${response.status}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('un filtre hostile connu produit un 400 explicite, pas une erreur serveur', async () => {
    const users = await load('@/app/api/admin/users/export/route');
    const response = await users.GET(new NextRequest(
      'https://app.example/api/admin/users/export?status=../../etc/passwd',
      { headers: { cookie: `toutenun_session=${owner.token}` } }));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBeTruthy();
    // Aucune trace interne ne doit fuiter dans le corps d'erreur.
    expect(JSON.stringify(body)).not.toMatch(/SELECT|postgres|at Object|\.ts:\d+/i);
  });

  it('identifiant de boutique hostile dans le chemin : 4xx, jamais 5xx', async () => {
    const route = await load('@/app/api/shops/[shopId]/audit/export/route');
    for (const shopId of ['abc', '-1', '1%27%20OR%201=1', '999999999999999999999', '1;DROP']) {
      const response = await route.GET(new NextRequest(
        `https://app.example/api/shops/${shopId}/audit/export`,
        { headers: { cookie: `toutenun_session=${owner.token}` } }), { params: Promise.resolve({ shopId }) } as never);
      expect(response.status, `shopId ${shopId}`).toBeLessThan(500);
      expect(response.status, `shopId ${shopId}`).toBeGreaterThanOrEqual(400);
    }
  });

  it('sans session ni cookie pirate : 401 sur tous les exports', async () => {
    for (const route of exportRoutes) {
      const module = await load(route.module);
      const shopId = route.suffix.startsWith('shops/1') ? '1' : undefined;
      for (const cookie of ['', 'toutenun_session=forged', `toutenun_session=${'A'.repeat(43)}`]) {
        const response = await module.GET(new NextRequest(`https://app.example/api/${route.suffix}`,
          { headers: cookie ? { cookie } : {} }),
        ...(shopId ? [{ params: Promise.resolve({ shopId }) } as never] : []));
        expect([401, 403], `${route.suffix} ${cookie.slice(0, 20)}`).toContain(response.status);
      }
    }
  });

  it('des caractères actifs dans les données exportées restent neutralisés', async () => {
    const csvRoute = await load('@/app/api/admin/audit/global/export/csv/route');
    const response = await csvRoute.GET(new NextRequest(
      'https://app.example/api/admin/audit/global/export/csv?q=%3Dcmd%7Ccalc',
      { headers: { cookie: `toutenun_session=${owner.token}` } }));
    expect(response.status).toBe(200);
    // Le BOM doit être réellement transmis : on lit les octets, pas la chaîne décodée
    // (Response.text() retire le BOM, ce qui masquerait une régression côté serveur).
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = new TextDecoder().decode(bytes);
    expect(csv).toContain('Journal global du propriétaire');
    expect(csv).not.toContain('SECRET_HASH');
    // Le terme de recherche est restitué, mais neutralisé (apostrophe) : jamais exécutable.
    expect(csv).toContain(`"'=cmd|calc"`);
    // Le journal global ne contient jamais l'événement de boutique, même hostile.
    expect(csv).not.toContain('Boutique hostile');
    // Aucune cellule ne commence par un préfixe de formule non neutralisé.
    expect(csv).not.toMatch(/"[=+@-]|\r\n"[=+@-]/);
  });
});
