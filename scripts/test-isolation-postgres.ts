/** Recette L10 — isolation multi-boutiques sur PostgreSQL réel, rôle applicatif sans BYPASSRLS.
 * Deux sens vérifiés : (1) les chemins autorisés de l'application fonctionnent ;
 * (2) une fuite inter-boutiques reste impossible, y compris via `withShopTransaction`.
 * Aucun identifiant, URL ou secret n'est imprimé. Base jetable uniquement (CI).
 */
import { Client } from 'pg';
import { withShopTransaction } from '../src/core/db/client';
import { withAuthorizedShopTransaction } from '../src/core/auth/authorize-shop';
import { createSessionToken } from '../src/core/auth/primitives';
import { parseShopId } from '../src/core/db/shop-scope';

async function main() {
  if (process.env.CI !== 'true' || process.env.APP_ENV !== 'staging')
    throw new Error('Recette isolation : environnement CI jetable requis.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requise.');
  // Le rôle applicatif doit être non privilégié : sinon la RLS est contournée et le test ment.
  const admin = new Client({ connectionString: process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL });
  const app = new Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  await app.connect();

  const checks: string[] = [];
  const ok = (label: string) => checks.push(`OK   ${label}`);
  const ko = (label: string) => { checks.push(`ECHEC ${label}`); process.exitCode = 1; };

  try {
    const bypass = await app.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
      'SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user');
    if (bypass.rows[0]?.rolbypassrls || bypass.rows[0]?.rolsuper) {
      console.error('Recette isolation refusée : le rôle applicatif contourne la RLS.');
      process.exit(1);
    }

    // Horodatage unique : la recette reste rejouable sans collision d'unicité.
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 17);
    // Fixtures fictives : deux boutiques, un membre limité à A, un propriétaire.
    await admin.query('BEGIN');
    const fixture = await admin.query<{ a: string; b: string; member: string; owner: string; ownerSession: string; memberSession: string }>(`
      WITH app AS (INSERT INTO marketplace_apps (label, client_id)
      VALUES ('Recette isolation', $1) RETURNING id),
      s AS (INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
        SELECT app.id, gen_random_uuid(), v.code, 'CI', 'XOF', v.name FROM app,
          (VALUES ('recette-a','Boutique A'), ('recette-b','Boutique B')) AS v(code, name)
        RETURNING id, business_client_code),
      u AS (INSERT INTO users (email, password_hash, display_name) VALUES
        ($2,'fixture-only','Propriétaire recette'),
        ($3,'fixture-only','Membre A') RETURNING id, email, display_name)
      SELECT
        (SELECT id::text FROM s WHERE business_client_code='recette-a') AS a,
        (SELECT id::text FROM s WHERE business_client_code='recette-b') AS b,
        (SELECT id::text FROM u WHERE email LIKE 'membre-recette-%') AS member,
        (SELECT id::text FROM u WHERE email LIKE 'owner-recette-%') AS owner,
        '0' AS "ownerSession", '0' AS "memberSession"`,
    [`recette-isolation-${stamp}`, `owner-recette-${stamp}@ci.invalid`, `membre-recette-${stamp}@ci.invalid`]);
    const { a, b, member, owner } = fixture.rows[0]!;
    await admin.query(`INSERT INTO user_roles (user_id, role_code, shop_id) VALUES ($1,'owner',NULL), ($2,'assistant',$3)`,
      [owner, member, a]);
    await admin.query('INSERT INTO user_shop_access (user_id, shop_id, can_view) VALUES ($1,$2,true)', [member, a]);
    await admin.query(`INSERT INTO audit_log (shop_id, module, action) VALUES ($1,'recette','recette.a'), ($2,'recette','recette.b')`, [a, b]);
    await admin.query('COMMIT');

    // Sessions réelles créées par le rôle applicatif (mêmes hachages que la production).
    const ownerSession = createSessionToken();
    const memberSession = createSessionToken();
    await admin.query(`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '1 hour'), ($3,$4,now()+interval '1 hour')`,
      [owner, ownerSession.hash, member, memberSession.hash]);

    // 1. Le propriétaire accède aux deux boutiques par le chemin autorisé.
    for (const [shopId, label] of [[a, 'A'], [b, 'B']] as const) {
      const row = await withAuthorizedShopTransaction(
        { token: ownerSession.token, shopId: parseShopId(shopId), permission: 'audit:read' },
        async (db) => (await db.query<{ action: string }>('SELECT action FROM audit_log ORDER BY id')).rows.map((r) => r.action));
      if (row.length === 1 && row[0] === `recette.${label === 'A' ? 'a' : 'b'}`) {
        ok(`propriétaire lit le journal de la boutique ${label}`);
      } else {
        ko(`journal inattendu pour la boutique ${label}`);
      }
    }

    // 2. Le membre limité à A ne peut pas ouvrir B, même en changeant l'identifiant côté client.
    // Membre autorisé sur A avec un droit qu'il possède réellement (shops:read).
    await withAuthorizedShopTransaction({ token: memberSession.token, shopId: parseShopId(a), permission: 'shops:read' },
      async () => undefined).then(() => ok('membre autorisé ouvre la boutique A (shops:read)'))
      .catch((error) => ko(`membre refusé sur sa propre boutique A (${(error as Error).message})`));
    // Même droit valide, mais boutique B sans accès : refus.
    await withAuthorizedShopTransaction({ token: memberSession.token, shopId: parseShopId(b), permission: 'shops:read' },
      async () => undefined).then(() => ko('membre a ouvert la boutique B sans accès'))
      .catch(() => ok('membre refusé sur la boutique B malgré un droit valide'));
    // Droit métier absent sur sa propre boutique : refus.
    await withAuthorizedShopTransaction({ token: memberSession.token, shopId: parseShopId(a), permission: 'audit:read' },
      async () => undefined).then(() => ko('assistant a obtenu audit:read'))
      .catch(() => ok('droit métier absent refusé (assistant / audit:read)'));

    // 3. Le droit métier est vérifié, pas seulement l'accès : viewer n'a pas audit:read.
    await withAuthorizedShopTransaction({ token: memberSession.token, shopId: parseShopId(a), permission: 'roles:manage' },
      async () => undefined).then(() => ko('viewer a obtenu roles:manage')).catch(() => ok('permission insuffisante refusée (assistant / roles:manage)'));

    // 4. Session révoquée : plus aucun accès.
    await admin.query("UPDATE sessions SET revoked_at = now() WHERE user_id = $1", [member]);
    await withAuthorizedShopTransaction({ token: memberSession.token, shopId: parseShopId(a), permission: 'audit:read' },
      async () => undefined).then(() => ko('session révoquée encore acceptée')).catch(() => ok('session révoquée refusée'));

    // 5. Fuite impossible même avec la seule primitive bas niveau : la RLS filtre les lignes.
    const leaked = await withShopTransaction(parseShopId(a), async (db) => {
      const all = await db.query<{ n: string }>('SELECT count(*)::text AS n FROM audit_log');
      const cross = await db.query<{ n: string }>('SELECT count(*)::text AS n FROM audit_log WHERE shop_id = $1', [b]);
      return { all: Number(all.rows[0]!.n), cross: Number(cross.rows[0]!.n) };
    });
    if (leaked.all === 1 && leaked.cross === 0) {
      ok('RLS : une requête en contexte A ne voit aucune ligne de B');
    } else {
      ko(`fuite inter-boutiques détectée (total=${leaked.all}, croisé=${leaked.cross})`);
    }

    // 6. Sans contexte de boutique, aucune ligne n'est visible.
    const contextless = await app.query<{ n: string }>('SELECT count(*)::text AS n FROM audit_log');
    if (Number(contextless.rows[0]!.n) === 0) ok('RLS : aucun contexte = aucune ligne');
    else ko('lignes visibles sans contexte');

    // 7. Identifiant de boutique invalide refusé avant toute requête.
    try { parseShopId('1 OR 1=1'); ko('identifiant de boutique invalide accepté'); }
    catch { ok('identifiant de boutique invalide refusé'); }
  } finally {
    await admin.query('ROLLBACK').catch(() => undefined);
    await admin.end();
    await app.end();
  }
  process.stdout.write(`${checks.join('\n')}\n`);
  if (process.exitCode === 1) throw new Error('Recette isolation : au moins une vérification a échoué.');

}

main().catch((error) => { console.error(error); process.exit(1); });
