/** Fixtures fictives après les autres E2E, uniquement sur PostgreSQL CI jetable. */
import { randomBytes, createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import pg from 'pg';
if (process.env.CI !== 'true' || process.env.APP_ENV !== 'staging' || !process.env.DATABASE_URL_ADMIN || !process.env.E2E_DELEGATION_FILE)
  throw new Error('Fixture de délégation : CI staging jetable obligatoire.');
const url = new URL(process.env.DATABASE_URL_ADMIN);
if (url.hostname !== 'localhost' || url.pathname !== '/tout_en_un_test' || !process.env.E2E_DELEGATION_FILE.startsWith('/tmp/'))
  throw new Error('Base et fichier temporaires CI obligatoires.');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL_ADMIN });
await db.connect();
try {
  await db.query('BEGIN');
  await db.query("INSERT INTO role_permissions (role_code,permission_code) VALUES ('manager','roles:manage') ON CONFLICT DO NOTHING");
  await db.query("INSERT INTO role_permissions (role_code,permission_code) VALUES ('stock_manager','system:manage') ON CONFLICT DO NOTHING");
  const app = await db.query("INSERT INTO marketplace_apps (label,client_id) VALUES ('Fixture délégation','ci-delegation') RETURNING id");
  const result = {};
  const owners = await db.query("SELECT id FROM users WHERE email='proprietaire@ci.invalid' AND status='active'");
  if (owners.rows.length !== 1) throw new Error('Propriétaire CI fictif introuvable.');
  const owner = owners.rows[0].id;
  await db.query(`INSERT INTO audit_log (actor_user_id,module,action,before,after)
    VALUES ($1,'fixture_global','fixture_global_audit','{"fixture":"SECRET_BEFORE_FIXTURE"}','{"fixture":"SECRET_AFTER_FIXTURE"}')`, [owner]);
  for (const project of ['bureau','mobile-375']) {
    const shops = await db.query(`INSERT INTO shops (app_id,jumia_shop_sid,business_client_code,country_code,currency,display_name)
      VALUES ($1,gen_random_uuid(),$2,'CI','XOF',$3),($1,gen_random_uuid(),$4,'SN','XOF',$5) RETURNING id`,
    [app.rows[0].id, `ci-del-${project}`, `Boutique déléguée ${project}`, `ci-private-${project}`, `Boutique privée ${project}`]);
    const users = await db.query(`INSERT INTO users (email,password_hash,display_name)
      VALUES ($1,'not-a-real-password',$2),($3,'not-a-real-password',$4),($5,'not-a-real-password',$6) RETURNING id`,
    [`delegate-${project}@ci.invalid`,`Délégué ${project}`,`member-${project}@ci.invalid`,`Membre ${project}`,
      `secret-${project}@ci.invalid`,`Membre privé ${project}`]);
    const [shop, otherShop] = shops.rows.map((r) => String(r.id));
    const [actor, member, other] = users.rows.map((r) => String(r.id));
    const token = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(token).digest();
    await db.query("INSERT INTO user_roles (user_id,role_code,shop_id) VALUES ($1,'manager',$2),($3,'assistant',$4)", [actor,shop,other,otherShop]);
    await db.query('INSERT INTO user_shop_access (user_id,shop_id,can_view) VALUES ($1,$2,true),($3,$2,true),($4,$5,true)', [actor,shop,member,other,otherShop]);
    await db.query("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')",[actor,hash]);
    const ownerToken = randomBytes(32).toString('base64url');
    await db.query("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')",
      [owner, createHash('sha256').update(ownerToken).digest()]);
    await db.query("INSERT INTO audit_log (actor_user_id,shop_id,module,action) VALUES ($1,$2,'fixture_shop','SECRET_SHOP_EVENT')", [actor,shop]);
    result[project] = { token, ownerToken, shop, otherShop, actor, member, other };
  }
  await db.query('COMMIT');
  writeFileSync(process.env.E2E_DELEGATION_FILE, JSON.stringify(result), { mode: 0o600 });
  console.log('Fixtures fictives de délégation créées.');
} catch (error) { await db.query('ROLLBACK'); throw error; }
finally { await db.end(); }
