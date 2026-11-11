/** CI uniquement : pg_dump -> autre base -> pg_restore -> intégrité.
 * NE PAS utiliser sur une base de production : dump local temporaire non chiffré.
 */
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const raw = process.env.DATABASE_URL;
if (process.env.CI !== 'true' || process.env.APP_ENV !== 'staging' || !raw)
  throw new Error('Restauration CI : environnement jetable obligatoire.');
const url = new URL(raw);
if (url.pathname !== '/tout_en_un_test' || url.hostname !== 'localhost' || url.username !== 'postgres')
  throw new Error('Restauration CI refusée : base de test PostgreSQL attendue.');
const source = new pg.Client({ connectionString: raw });
const adminUrl = new URL(raw); adminUrl.pathname = '/postgres';
const admin = new pg.Client({ connectionString: adminUrl.toString() });
const restoredUrl = new URL(raw); restoredUrl.pathname = '/toutenun_restore_ci';
const restored = new pg.Client({ connectionString: restoredUrl.toString() });
const dir = await mkdtemp(join(tmpdir(), 'toutenun-restore-'));
const dump = join(dir, 'fixture.dump');
const toolEnv = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
const common = ['--host', url.hostname, '--port', url.port || '5432', '--username', decodeURIComponent(url.username)];
// La version des CLI DOIT correspondre au serveur (PostgreSQL 16). Le runner GitHub
// peut installer une CLI plus récente qui émet SET transaction_timeout, invalide en 16.
const pgTool = (binary, args) => {
  try {
    return execFileSync('docker', ['run', '--rm', '--network', 'host', '--user',
      `${process.getuid()}:${process.getgid()}`, '--volume', `${dir}:${dir}`,
      '--env', 'PGPASSWORD', '--entrypoint', binary, 'postgres:16', ...args],
    { env: toolEnv, stdio: 'pipe' });
  } catch (error) {
    // Ne jamais publier le dump ou les commandes SQL du restore dans un log CI.
    throw new Error(`${binary} PostgreSQL 16 échoué (code ${error?.status ?? 'inconnu'}).`);
  }
};
let adminConnected = false;
let restoredConnected = false;
try {
  await source.connect();
  // Données fictives ; si ce test échoue, la base CI est détruite par le job.
  await source.query('BEGIN');
  try {
    const app = await source.query("INSERT INTO marketplace_apps (label, client_id) VALUES ('Sauvegarde CI fictive','backup-ci') RETURNING id");
    const shop = await source.query(`INSERT INTO shops
      (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
      VALUES ($1, gen_random_uuid(), 'backup-ci', 'CI', 'XOF', 'Boutique sauvegarde CI') RETURNING id`, [app.rows[0].id]);
    await source.query("INSERT INTO audit_log (shop_id,module,action) VALUES ($1,'ci','backup.fixture')", [shop.rows[0].id]);
    await source.query('COMMIT');
  } catch (error) { await source.query('ROLLBACK'); throw error; }
  const statsSql = `SELECT
    (SELECT count(*)::int FROM schema_migrations) AS migrations,
    (SELECT count(*)::int FROM shops WHERE display_name = 'Boutique sauvegarde CI') AS shops,
    (SELECT count(*)::int FROM audit_log WHERE action = 'backup.fixture') AS audit,
    (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public') AS policies,
    (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.shops'::regclass) AS force_rls`;
  const before = (await source.query(statsSql)).rows[0];
  assert.equal(before.migrations, 9); assert.equal(before.shops, 1);
  assert.equal(before.audit, 1); assert.equal(before.force_rls, true);
  pgTool('pg_dump', [...common, '--format=custom', '--file', dump, '--dbname', url.pathname.slice(1)]);
  const archive = await readFile(dump);
  assert.equal(archive.subarray(0, 5).toString(), 'PGDMP', 'Archive pg_dump custom attendu.');
  const digest = createHash('sha256').update(archive).digest('hex');
  pgTool('pg_restore', ['--list', dump]);
  await admin.connect(); adminConnected = true;
  await admin.query('CREATE DATABASE toutenun_restore_ci');
  pgTool('pg_restore', [...common, '--exit-on-error', '--no-owner', '--no-acl', '--dbname',
    restoredUrl.pathname.slice(1), dump]);
  assert.equal(createHash('sha256').update(await readFile(dump)).digest('hex'), digest,
    'Archive inchangée pendant la restauration.');
  await restored.connect(); restoredConnected = true;
  const after = (await restored.query(statsSql)).rows[0];
  assert.deepEqual(after, before, 'Les migrations, lignes fictives, policies et FORCE RLS doivent être identiques.');
  console.log('Restauration CI PostgreSQL : seconde base indépendante, données et RLS identiques.');
} finally {
  await source.end().catch(() => undefined);
  if (restoredConnected) await restored.end();
  if (adminConnected) {
    await admin.query('DROP DATABASE IF EXISTS toutenun_restore_ci WITH (FORCE)').catch(() => undefined);
    await admin.end();
  }
  await rm(dir, { recursive: true, force: true });
}
