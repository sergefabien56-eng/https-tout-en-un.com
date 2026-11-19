/**
 * Concurrence du renouvellement de jeton Jumia — PostgreSQL réel, plusieurs connexions.
 *
 * PGlite ne peut pas prouver ceci : il n'a qu'une seule connexion, donc aucune concurrence
 * réelle. Or c'est LA panne qui casse une intégration Jumia : chaque `POST /token` invalide le
 * refresh token utilisé, et deux renouvellements simultanés déconnectent définitivement la
 * boutique (docs/jumia-integration.md §2.4).
 *
 * Ce script lance deux renouvellements en parallèle sur la MÊME application, avec un faux point
 * d'accès qui compte les appels, et vérifie qu'il n'y en a qu'UN.
 *
 * Exécution (CI, PostgreSQL 16 réel) :
 *   CI=true APP_ENV=staging \
 *   DATABASE_URL_ADMIN=postgres://postgres:postgres@localhost:5432/tout_en_un_test \
 *   DATABASE_URL=postgres://toutenun_app:ci-app-password@localhost:5432/tout_en_un_test \
 *   npx tsx scripts/test-jumia-token-race.ts
 */
import assert from 'node:assert/strict';
import pg from 'pg';
import { createSessionToken, hashSessionToken } from '../src/core/auth/primitives';
import { parseKeyRing, sealSecret } from '../src/core/crypto/envelope';
import { getAccessToken } from '../src/modules/marketplace/jumia-tokens';

async function main(): Promise<void> {
  if (process.env.CI !== 'true' || process.env.APP_ENV !== 'staging'
    || !process.env.DATABASE_URL_ADMIN || !process.env.DATABASE_URL) {
    throw new Error('Test PostgreSQL autorisé uniquement en CI staging jetable.');
  }
  const adminUrl = new URL(process.env.DATABASE_URL_ADMIN);
  const appUrl = new URL(process.env.DATABASE_URL);
  if (adminUrl.hostname !== 'localhost' || appUrl.hostname !== 'localhost'
    || appUrl.pathname !== adminUrl.pathname || appUrl.username !== 'toutenun_app') {
    throw new Error('Base PostgreSQL de test CI obligatoire.');
  }

  // La clé de chiffrement est fabriquée pour ce test jetable : aucun secret réel n'est utilisé.
  process.env.APP_ENC_KEYS = '1:Q0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0M=';
  process.env.APP_ENC_ACTIVE = '1';
  const ring = parseKeyRing(process.env.APP_ENC_KEYS, 1);

  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL_ADMIN });
  await admin.connect();

  const role = await admin.query("SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname='toutenun_app'");
  assert.deepEqual(role.rows[0], { rolbypassrls: false, rolsuper: false });

  // Propriétaire réel avec sa permission, pour que la porte RLS de marketplace_apps s'ouvre.
  const owner = createSessionToken();
  const run = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const user = await admin.query(
    `INSERT INTO users (email, password_hash, display_name) VALUES ($1,'x','Propriétaire')
     RETURNING id`, [`jumia-race-${run}@pg.invalid`]);
  const userId = String(user.rows[0].id);
  await admin.query(
    "INSERT INTO role_permissions (role_code, permission_code) VALUES ('owner','shops:write') ON CONFLICT DO NOTHING");
  await admin.query(
    "INSERT INTO user_roles (user_id, role_code, shop_id) VALUES ($1,'owner',NULL) ON CONFLICT DO NOTHING",
    [userId]);
  await admin.query(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '1 hour')",
    [userId, hashSessionToken(owner.token)]);

  // Application Jumia sans access token : le premier appel devra donc renouveler.
  // Identifiant public unique par exécution : le script doit pouvoir être relancé.
  const publicId = (await admin.query<{ id: string }>('SELECT gen_random_uuid()::text AS id')).rows[0]!.id;
  const sealedRefresh = sealSecret('refresh-initial', ring, `marketplace_app:${publicId}:refresh`);
  const inserted = await admin.query(
    `INSERT INTO marketplace_apps
       (public_id, label, client_id, refresh_token_ciphertext, refresh_token_iv, refresh_token_tag, key_version)
     VALUES ($1,'Course Jumia',$6,$2,$3,$4,$5) RETURNING id`,
    [publicId, sealedRefresh.ciphertext, sealedRefresh.iv, sealedRefresh.tag, sealedRefresh.keyVersion,
      `client-race-${run}`]);
  const appId = String(inserted.rows[0].id);

  let calls = 0;
  const seenTokens: string[] = [];
  const endpoint = {
    async refresh(input: { clientId: string; refreshToken: string }) {
      calls += 1;
      seenTokens.push(input.refreshToken);
      // Lenteur délibérée : c'est la fenêtre pendant laquelle un second processus, s'il n'était
      // pas bloqué par le verrou, consommerait le même refresh token.
      await new Promise((resolve) => setTimeout(resolve, 400));
      return { outcome: 'refreshed' as const, accessToken: `access-${calls}`,
        refreshToken: `refresh-${calls}`, expiresInSeconds: 3600, refreshExpiresSeconds: 86400,
        httpStatus: 200 };
    },
  };

  // DEUX renouvellements en parallèle, sur la même application, via deux connexions distinctes.
  const [first, second] = await Promise.all([
    getAccessToken({ appPublicId: publicId, userSessionToken: owner.token, endpoint }),
    getAccessToken({ appPublicId: publicId, userSessionToken: owner.token, endpoint }),
  ]);

  // Le cœur de la preuve : un seul appel à Jumia, donc un seul refresh token consommé.
  assert.equal(calls, 1, `un seul renouvellement attendu, ${calls} observé(s)`);
  assert.deepEqual(seenTokens, ['refresh-initial'], 'le refresh token ne doit être présenté qu’une fois');
  assert.equal(first.kind, 'ok');
  assert.equal(second.kind, 'ok');
  assert.equal((first as { accessToken: string }).accessToken, 'access-1');
  assert.equal((second as { accessToken: string }).accessToken, 'access-1',
    'le second appel doit réutiliser le jeton obtenu par le premier');

  // Le journal doit contenir UNE rotation réelle et UNE réutilisation, jamais deux rotations.
  const log = await admin.query<{ outcome: string }>(
    'SELECT outcome FROM marketplace_token_refresh_log WHERE app_id = $1 ORDER BY id', [appId]);
  const outcomes = log.rows.map((row) => row.outcome);
  assert.deepEqual(outcomes.sort(), ['refreshed', 'reused_cached'],
    `journal attendu [refreshed, reused_cached], obtenu [${outcomes.join(', ')}]`);

  // Le nouveau refresh token est bien celui du serveur, et il est chiffré.
  const stored = await admin.query<{ refresh_token_ciphertext: Buffer }>(
    'SELECT refresh_token_ciphertext FROM marketplace_apps WHERE id = $1', [appId]);
  assert.ok(!stored.rows[0]!.refresh_token_ciphertext.toString('utf8').includes('refresh-1'),
    'le refresh token ne doit jamais être stocké en clair');

  // Un renouvellement ultérieur, une fois le jeton d'accès obtenu, ne rappelle pas Jumia.
  const third = await getAccessToken({ appPublicId: publicId, userSessionToken: owner.token, endpoint });
  assert.equal((third as { refreshed: boolean }).refreshed, false);
  assert.equal(calls, 1);

  process.stdout.write(
    `PostgreSQL réel : un seul renouvellement pour deux appels concurrents (${calls} appel API) OK\n`);
  await admin.end();
  process.exit(0);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
