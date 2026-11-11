/** Une boutique CI fictive, uniquement dans PostgreSQL éphémère. Aucune donnée Jumia. */
import pg from 'pg';
if (process.env.CI !== 'true' || !process.env.DATABASE_URL_ADMIN || process.env.APP_ENV !== 'staging')
  throw new Error('Fixture E2E : environnement CI jetable requis.');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ADMIN });
await db.connect();
try {
  await db.query('BEGIN');
  const app = await db.query(`INSERT INTO marketplace_apps (label, client_id)
    VALUES ('Application CI fictive', 'ci-e2e-fixture') RETURNING id`);
  const shop = await db.query(`INSERT INTO shops
    (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
    VALUES ($1, gen_random_uuid(), 'ci-e2e-fictif', 'CI', 'XOF', 'Boutique CI fictive') RETURNING id`,
  [app.rows[0].id]);
  await db.query(`INSERT INTO audit_log (shop_id, module, action, entity_type) VALUES
    ($1, 'ci', 'fixture.created', 'shop'), ($1, 'ci', '=cmd', '@hostile')`, [shop.rows[0].id]);
  await db.query('COMMIT');
  console.log('Fixture E2E boutique fictive créée dans la base CI jetable.');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally { await db.end(); }
