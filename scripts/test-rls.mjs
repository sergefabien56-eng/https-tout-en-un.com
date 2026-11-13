/** Vérification PostgreSQL 16 réelle du rôle applicatif et de l'isolation RLS.
 * Jeu de données fictif inséré dans UNE transaction admin, puis ROLLBACK systématique.
 * Ne jamais écrire d'identifiant, d'URL ou de secret en sortie.
 */
import assert from 'node:assert/strict';
import pg from 'pg';

if (process.env.CI !== 'true') throw new Error('Ce test RLS est réservé à la CI jetable.');
const url = process.env.DATABASE_URL_ADMIN;
if (!url) throw new Error('DATABASE_URL_ADMIN est obligatoire.');
const db = new pg.Client({ connectionString: url });
await db.connect();
let begun = false;
try {
  await db.query('BEGIN'); begun = true;
  const admin = await db.query('SELECT current_user AS name');
  if (admin.rows[0]?.name === 'toutenun_app') throw new Error('Le test requiert un rôle de préparation séparé.');
  const app = await db.query(`INSERT INTO marketplace_apps (label, client_id)
    VALUES ('Fixture RLS CI', 'fixture-rls-ci') RETURNING id`);
  const appId = app.rows[0]?.id;
  const shops = await db.query(`INSERT INTO shops
    (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
    VALUES ($1, gen_random_uuid(), 'fixture-rls-a', 'CI', 'XOF', 'Boutique A'),
           ($1, gen_random_uuid(), 'fixture-rls-b', 'CI', 'XOF', 'Boutique B')
    RETURNING id::text`, [appId]);
  const [a, b] = shops.rows.map((row) => row.id);
  assert.ok(a && b);
  const fixtureUser = await db.query(`INSERT INTO users (email, password_hash, display_name)
    VALUES ('fixture-rls@ci.invalid', 'fixture-only-no-login', 'Fixture CI') RETURNING id`);
  const userId = fixtureUser.rows[0]?.id;
  const limitedUser = await db.query(`INSERT INTO users (email, password_hash, display_name)
    VALUES ('fixture-limited@ci.invalid', 'fixture-only-no-login', 'Fixture limitée') RETURNING id`);
  const limitedId = limitedUser.rows[0]?.id;
  await db.query(`INSERT INTO user_roles (user_id, role_code, shop_id) VALUES
    ($1, 'owner', NULL), ($2, 'manager', $3)`, [userId, limitedId, a]);
  await db.query('INSERT INTO user_shop_access (user_id, shop_id) VALUES ($1, $2)', [limitedId, a]);
  await db.query(`INSERT INTO user_notifications (user_id,kind,title,message) VALUES
    ($1,'security_login','Fixture','Compte A'), ($2,'security_login','Fixture','Compte B')`, [userId, limitedId]);
  await db.query(`INSERT INTO audit_log (shop_id, module, action) VALUES
    ($1, 'ci', 'rls-a'), ($2, 'ci', 'rls-b'), (NULL, 'ci', 'rls-global')`, [a, b]);
  const bypass = await db.query("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'toutenun_app'");
  assert.deepEqual(bypass.rows[0], { rolsuper: false, rolbypassrls: false });
  // Même transaction : les données créées par admin sont visibles sous le rôle applicatif,
  // tandis que FORCE ROW LEVEL SECURITY doit encore leur appliquer les policies.
  await db.query('SET LOCAL ROLE toutenun_app');
  assert.equal((await db.query('SELECT current_user AS name')).rows[0]?.name, 'toutenun_app');
  const read = () => db.query('SELECT id::text FROM shops WHERE id = ANY($1::bigint[]) ORDER BY id', [[a, b]]);
  assert.deepEqual((await read()).rows, [], 'Aucune boutique visible sans contexte RLS');
  const readAudit = () => db.query("SELECT action FROM audit_log WHERE module = 'ci' ORDER BY action");
  assert.deepEqual((await readAudit()).rows, [], 'Aucun audit sans contexte RLS');
  // La policy 0011 autorise uniquement l'audit rôle global avec acteur local,
  // sans ouvrir la lecture et sans ouvrir les autres formes d'audit.
  const globalAudit = (actor, module, action, entity) => db.query(`INSERT INTO audit_log
    (actor_user_id, module, action, entity_type) VALUES ($1, $2, $3, $4)`, [actor, module, action, entity]);
  const expectGlobalDenied = async (actor, module, action, entity) => {
    await db.query('SAVEPOINT denied_global_audit');
    let denied = false;
    try { await globalAudit(actor, module, action, entity); }
    catch (error) { denied = error?.code === '42501'; }
    finally { await db.query('ROLLBACK TO SAVEPOINT denied_global_audit'); }
    assert.equal(denied, true, 'INSERT audit global hors périmètre refusé');
  };
  await expectGlobalDenied(userId, 'users', 'manage_global_role', 'user_role');
  await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [String(userId)]);
  await expectGlobalDenied(limitedId, 'users', 'manage_global_role', 'user_role');
  await expectGlobalDenied(userId, 'users', 'other', 'user_role');
  await expectGlobalDenied(userId, 'other', 'manage_global_role', 'user_role');
  await expectGlobalDenied(userId, 'users', 'manage_global_role', 'other');
  await globalAudit(userId, 'users', 'manage_global_role', 'user_role');
  assert.deepEqual((await db.query('SELECT id FROM audit_log')).rows, [], 'Écriture globale ne donne pas accès en lecture');
  await db.query("SELECT set_config('app.audit_actor_id', '', true)");
  await expectGlobalDenied(userId, 'users', 'manage_global_role', 'user_role');
  const readNotices = () => db.query('SELECT message FROM user_notifications ORDER BY id');
  assert.deepEqual((await readNotices()).rows, [], 'Aucune notification sans contexte utilisateur');
  await db.query("SELECT set_config('app.notification_user_id', $1, true)", [String(userId)]);
  assert.deepEqual((await readNotices()).rows.map((r) => r.message), ['Compte A']);
  await db.query(`INSERT INTO user_notifications (user_id,kind,title,message)
    VALUES ($1,'security_login','Sécurité','Connexion CI')`, [userId]);
  await db.query('SAVEPOINT denied_notification');
  let noticeDenied = false;
  try {
    await db.query(`INSERT INTO user_notifications (user_id,kind,title,message)
      VALUES ($1,'security_login','Sécurité','Interdit')`, [limitedId]);
  } catch (error) { noticeDenied = error?.code === '42501'; }
  finally { await db.query('ROLLBACK TO SAVEPOINT denied_notification'); }
  assert.equal(noticeDenied, true, 'Écriture de notification vers autrui refusée par RLS');
  await db.query("SELECT set_config('app.notification_user_id', $1, true)", [String(limitedId)]);
  assert.deepEqual((await readNotices()).rows.map((r) => r.message), ['Compte B']);
  await db.query("SELECT set_config('app.notification_user_id', '', true)");
  assert.deepEqual((await readNotices()).rows, [], 'Contexte effacé : aucune notification');
  // Le nouveau contexte de catalogue n'ouvre QUE shops/access et ne révèle pas audit_log.
  await db.query("SELECT set_config('app.list_user_id', $1, true)", [String(userId)]);
  assert.deepEqual((await read()).rows.map((row) => row.id), [a, b], 'Catalogue propriétaire limité par rôle réel');
  assert.deepEqual((await readAudit()).rows, [], 'Catalogue sans shop_id ne donne pas accès audit');
  await db.query("SELECT set_config('app.list_user_id', $1, true)", [String(limitedId)]);
  assert.deepEqual((await read()).rows.map((row) => row.id), [a], 'Catalogue rôle boutique et accès limité');
  await db.query("SELECT set_config('app.list_user_id', '', true)");
  assert.deepEqual((await read()).rows, [], 'Catalogue effacé : aucune boutique visible');
  await db.query("SELECT set_config('app.shop_id', $1, true)", [a]);
  assert.deepEqual((await read()).rows.map((row) => row.id), [a], 'Boutique B invisible sous contexte A');
  assert.deepEqual((await readAudit()).rows.map((row) => row.action), ['rls-a', 'rls-global']);
  const other = await db.query('SELECT id FROM shops WHERE id = $1', [b]);
  assert.equal(other.rowCount, 0);
  const updated = await db.query('UPDATE shops SET display_name = $1 WHERE id = $2', ['Injection', b]);
  assert.equal(updated.rowCount, 0, 'Une écriture inter-boutiques ne doit modifier aucune ligne');
  // La même policy doit également refuser les INSERT vers une autre boutique.
  const ownAccess = await db.query('INSERT INTO user_shop_access (user_id, shop_id) VALUES ($1, $2)', [userId, a]);
  assert.equal(ownAccess.rowCount, 1);
  await db.query('SAVEPOINT denied_write');
  let denied = false;
  try {
    await db.query('INSERT INTO user_shop_access (user_id, shop_id) VALUES ($1, $2)', [userId, b]);
  } catch (error) {
    denied = error?.code === '42501';
  } finally { await db.query('ROLLBACK TO SAVEPOINT denied_write'); }
  assert.equal(denied, true, 'RLS WITH CHECK doit refuser l’écriture pour boutique B');
  await db.query("SELECT set_config('app.shop_id', $1, true)", [b]);
  assert.deepEqual((await read()).rows.map((row) => row.id), [b], 'Changement de contexte isolé');
  assert.deepEqual((await readAudit()).rows.map((row) => row.action), ['rls-b', 'rls-global']);
  await db.query("SELECT set_config('app.shop_id', '', true)");
  assert.deepEqual((await read()).rows, [], 'Contexte effacé : aucune boutique visible');
  assert.deepEqual((await readAudit()).rows, [], 'Contexte effacé : aucun audit visible');
  console.log('RLS PostgreSQL : rôle non privilégié ; sans contexte, inter-boutiques et reset refusés.');
} finally {
  if (begun) await db.query('ROLLBACK');
  await db.end();
}
