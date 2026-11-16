import assert from 'node:assert/strict';
import pg from 'pg';
import { createSessionToken } from '../src/core/auth/primitives';
import { manageShopRole } from '../src/modules/identity/manage-shop-role';
async function main() {
if (process.env.CI !== 'true' || process.env.APP_ENV !== 'staging' || !process.env.DATABASE_URL_ADMIN || !process.env.DATABASE_URL)
  throw new Error('Test PostgreSQL autorisé uniquement en CI staging jetable.');
const adminUrl = new URL(process.env.DATABASE_URL_ADMIN);
const appUrl = new URL(process.env.DATABASE_URL);
if (adminUrl.hostname !== 'localhost' || appUrl.hostname !== 'localhost' || adminUrl.pathname !== '/tout_en_un_test' || appUrl.pathname !== adminUrl.pathname || appUrl.username !== 'toutenun_app')
  throw new Error('Base PostgreSQL de test CI obligatoire.');
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL_ADMIN });
await admin.connect();
const role = await admin.query("SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname='toutenun_app'");
assert.deepEqual(role.rows[0], { rolbypassrls: false, rolsuper: false });
const token = createSessionToken();
const app = await admin.query("INSERT INTO marketplace_apps (label,client_id) VALUES ('fixture','real-pg-test') RETURNING id");
const shop = await admin.query("INSERT INTO shops (app_id,jumia_shop_sid,business_client_code,country_code,currency,display_name) VALUES ($1,gen_random_uuid(),'real-pg','CI','XOF','Fixture') RETURNING id",[app.rows[0].id]);
const a = await admin.query("INSERT INTO users (email,password_hash,display_name) VALUES ('delegate@pg.invalid','x','Délégué'),('target@pg.invalid','x','Cible') RETURNING id");
const [actor, target] = a.rows.map(r => String(r.id)); const shopId=String(shop.rows[0].id);
await admin.query("INSERT INTO role_permissions (role_code,permission_code) VALUES ('manager','roles:manage')");
await admin.query("INSERT INTO user_roles (user_id,role_code,shop_id) VALUES ($1,'manager',$2)",[actor,shopId]);
await admin.query("INSERT INTO user_shop_access (user_id,shop_id,can_view) VALUES ($1,$3,true),($2,$3,true)",[actor,target,shopId]);
await admin.query("INSERT INTO sessions (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')",[actor,token.hash]);
const input={ token:token.token, userId:target, shopId, roleCode:'accountant',grant:true };
assert.equal((await manageShopRole(input)).changed,true);
assert.equal((await manageShopRole({...input,grant:false})).changed,true);
process.stdout.write('PostgreSQL réel : attribution/retrait non-BYPASSRLS OK\n');
async function blockedCase(label: string, lock: string, update: string, cleanup: string) {
  await admin.query('BEGIN');
  await admin.query(lock, lock.includes('$2') ? [actor,shopId] : [actor]);
  await admin.query(update, [actor,shopId]);
  const pending = manageShopRole(input).then(()=>'allowed', (e: {httpStatus?:number})=>e.httpStatus);
  let waiting=false;
  for (let i=0;i<100;i++) {
    const q=await admin.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND usename='toutenun_app' AND wait_event_type='Lock'");
    if (q.rows[0].n) {waiting=true; break;} await new Promise(r=>setTimeout(r,50));
  }
  assert.equal(waiting,true, `${label} : la transaction doit attendre le verrou`);
  await admin.query('COMMIT');
  assert.equal(await pending,403, `${label} : retrait concurrent doit être respecté`);
  await admin.query(cleanup,[actor,shopId]);
  process.stdout.write('Concurrence PostgreSQL : '+label+' OK\n');
}
await blockedCase('révocation du rôle', "SELECT id FROM users WHERE id=$1 FOR UPDATE", "DELETE FROM user_roles WHERE user_id=$1 AND shop_id=$2 AND role_code='manager'", "INSERT INTO user_roles (user_id,shop_id,role_code) VALUES ($1,$2,'manager')");
await blockedCase('accès retiré', "SELECT 1 FROM user_shop_access WHERE user_id=$1 AND shop_id=$2 FOR UPDATE", "UPDATE user_shop_access SET can_view=false WHERE user_id=$1 AND shop_id=$2", "UPDATE user_shop_access SET can_view=true WHERE user_id=$1 AND shop_id=$2");
await admin.query('BEGIN');
await admin.query("SELECT code FROM roles WHERE code='accountant' FOR UPDATE");
await admin.query("INSERT INTO role_permissions (role_code,permission_code) VALUES ('accountant','system:manage')");
const pending=manageShopRole(input).then(()=>'allowed',(e:{httpStatus?:number})=>e.httpStatus);
let waiting=false;
for (let i=0;i<100;i++) { const q=await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND usename='toutenun_app' AND wait_event_type='Lock'"); if(q.rows[0].n){waiting=true;break;} await new Promise(r=>setTimeout(r,50)); }
assert.equal(waiting,true); await admin.query('COMMIT'); assert.equal(await pending,403);
await admin.query("DELETE FROM role_permissions WHERE role_code='accountant' AND permission_code='system:manage'");
process.stdout.write('Concurrence PostgreSQL : élargissement de la matrice OK\n');
await admin.query('BEGIN');
await admin.query('SELECT id FROM sessions WHERE user_id=$1 FOR UPDATE',[actor]);
await admin.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[actor]);
const p2=manageShopRole(input).then(()=>'allowed',(e:{httpStatus?:number})=>e.httpStatus);
waiting=false;
for (let i=0;i<100;i++) {const q=await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND usename='toutenun_app' AND wait_event_type='Lock'"); if(q.rows[0].n){waiting=true;break;} await new Promise(r=>setTimeout(r,50));}
assert.equal(waiting,true); await admin.query('COMMIT'); assert.equal(await p2,401);
process.stdout.write('Concurrence PostgreSQL : révocation de session OK\n');
await admin.end(); process.exit(0);

}
main().catch((err) => { console.error(err); process.exit(1); });
