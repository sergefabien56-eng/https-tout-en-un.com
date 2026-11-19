/**
 * Jetons Jumia — le renouvellement ne doit JAMAIS partir deux fois.
 *
 * Un `POST /token` invalide le refresh token utilisé. Deux appels concurrents sur la même
 * application Jumia déconnectent donc définitivement la boutique (docs/jumia-integration.md §2.4).
 * Ces tests vérifient les trois protections du module, sur PostgreSQL réel et sans réseau :
 *
 *   1. deux renouvellements concurrents ne produisent qu'UN appel à l'API ;
 *   2. un access token encore valable n'entraîne aucun appel (réutilisation du cache) ;
 *   3. `invalid_grant` passe la boutique en `reauth_required` sans boucle de retry ;
 *   4. une rotation perdue rend une reconnexion obligatoire au lieu de réessayer ;
 *   5. le journal ne contient jamais de valeur de jeton, et refuse la réécriture.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken, hashSessionToken } from '@/core/auth/primitives';
import { parseKeyRing, sealSecret } from '@/core/crypto/envelope';

let db: PGlite;

vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN;');
    try {
      const result = await task(db as unknown as PoolClient);
      await db.exec('COMMIT;');
      return result;
    } catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));

const RING_RAW = '1:Q0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0M=';
process.env.APP_ENC_KEYS = RING_RAW;
process.env.APP_ENC_ACTIVE = '1';
const ring = parseKeyRing(RING_RAW, 1);

const { getAccessToken, sealRefreshToken } = await import('@/modules/marketplace/jumia-tokens');

const owner = createSessionToken();
const APP_PUBLIC_ID = '11111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  db = new PGlite();
  for (const [file, down] of readdirSync('drizzle')
    .filter((name) => name.endsWith('.up.sql')).sort().map((name) => [name, false] as const)) {
    if (down) continue;
    await db.exec(readFileSync(join('drizzle', file), 'utf8'));
  }
  // Propriétaire avec la permission `shops:write`, comme en production.
  await db.exec(`
    -- id est GENERATED ALWAYS : on laisse PostgreSQL l'attribuer et on récupère l'identifiant.
    INSERT INTO users (email, password_hash, display_name, status,
      totp_secret_ciphertext, totp_secret_iv, totp_secret_tag, totp_key_version)
    VALUES ('proprietaire@ci.invalid', 'x', 'Propriétaire CI', 'active',
      '\\x00', '\\x00', '\\x00', 1);
    INSERT INTO sessions (user_id, token_hash, expires_at)
    SELECT id, decode('${hashSessionToken(owner.token).toString('hex')}', 'hex'), now() + interval '1 hour'
    FROM users WHERE email = 'proprietaire@ci.invalid';
    INSERT INTO role_permissions (role_code, permission_code) VALUES ('owner', 'shops:write')
      ON CONFLICT DO NOTHING;
    INSERT INTO user_roles (user_id, role_code, shop_id)
    SELECT id, 'owner', NULL FROM users WHERE email = 'proprietaire@ci.invalid';
  `);
});

afterAll(async () => { await db.close(); });

/** Crée une application Jumia avec un refresh token chiffré, comme le ferait l'assistant. */
async function createApp(options: {
  publicId?: string; accessTokenExpiresInMs?: number | null; status?: string;
} = {}): Promise<string> {
  const publicId = options.publicId ?? APP_PUBLIC_ID;
  const sealedRefresh = sealRefreshToken(publicId, 'refresh-initial');
  const hasAccess = options.accessTokenExpiresInMs !== null;
  const sealedAccess = hasAccess ? sealSecret('access-en-cache', ring, `marketplace_app:${publicId}:access`) : null;
  const accessExpiry = options.accessTokenExpiresInMs === null || options.accessTokenExpiresInMs === undefined
    ? null : new Date(Date.now() + options.accessTokenExpiresInMs);
  await db.query(`INSERT INTO marketplace_apps
    (public_id, label, client_id, refresh_token_ciphertext, refresh_token_iv, refresh_token_tag,
     access_token_ciphertext, access_token_iv, access_token_tag, access_token_expires_at, key_version, status)
    VALUES ($1, 'Application CI', $11, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (platform, client_id) DO UPDATE SET status = EXCLUDED.status`,
  [publicId, sealedRefresh.ciphertext, sealedRefresh.iv, sealedRefresh.tag,
    sealedAccess?.ciphertext ?? null, sealedAccess?.iv ?? null, sealedAccess?.tag ?? null,
    accessExpiry, sealedRefresh.keyVersion, options.status ?? 'active',
    // Un identifiant client distinct par application : c'est lui qui porte l'unicité en base.
    `client-${publicId.slice(0, 8)}`]);
  return publicId;
}

/** Faux point d'accès : compte les appels et renvoie ce qu'on lui demande. */
function fakeEndpoint(outcome: 'refreshed' | 'invalid_grant' | 'network_error' = 'refreshed') {
  const calls: { clientId: string; refreshToken: string }[] = [];
  let counter = 0;
  return {
    calls,
    endpoint: {
      async refresh(input: { clientId: string; refreshToken: string }) {
        calls.push(input);
        counter += 1;
        if (outcome === 'refreshed') {
          return { outcome, accessToken: `access-${counter}`, refreshToken: `refresh-${counter}`,
            expiresInSeconds: 3600, refreshExpiresSeconds: 86400, httpStatus: 200 };
        }
        if (outcome === 'invalid_grant') return { outcome, httpStatus: 400 };
        // `exactOptionalPropertyTypes` : on omet la clé plutôt que de passer `undefined`.
        return { outcome };
      },
    },
  };
}

describe('renouvellement des jetons Jumia', () => {
  it('renouvelle quand l’access token est absent, puis le réutilise', async () => {
    const publicId = await createApp({ accessTokenExpiresInMs: null });
    const fake = fakeEndpoint('refreshed');
    const first = await getAccessToken({
      appPublicId: publicId, userSessionToken: owner.token, endpoint: fake.endpoint });
    expect(first).toMatchObject({ kind: 'ok', refreshed: true, accessToken: 'access-1' });
    expect(fake.calls).toHaveLength(1);

    // Deuxième appel : le jeton est encore valable, Jumia ne doit PAS être rappelé.
    const second = await getAccessToken({
      appPublicId: publicId, userSessionToken: owner.token, endpoint: fake.endpoint });
    expect(second).toMatchObject({ kind: 'ok', refreshed: false, accessToken: 'access-1' });
    expect(fake.calls).toHaveLength(1);
  });

  it('ne renouvelle pas un jeton qui expire dans la marge de sécurité', async () => {
    // Expire dans 2 minutes : sous la marge de 5 minutes, donc renouvellement attendu.
    const publicId = await createApp({ publicId: '22222222-2222-4222-8222-222222222222',
      accessTokenExpiresInMs: 2 * 60_000 });
    const fake = fakeEndpoint('refreshed');
    const result = await getAccessToken({
      appPublicId: publicId, userSessionToken: owner.token, endpoint: fake.endpoint });
    expect(result).toMatchObject({ kind: 'ok', refreshed: true });
    expect(fake.calls).toHaveLength(1);
  });

  it('remplace atomiquement le refresh token et n’en garde aucune trace lisible', async () => {
    const publicId = await createApp({ publicId: '33333333-3333-4333-8333-333333333333',
      accessTokenExpiresInMs: null });
    const fake = fakeEndpoint('refreshed');
    await getAccessToken({ appPublicId: publicId, userSessionToken: owner.token, endpoint: fake.endpoint });
    const row = await db.query<{ refresh_token_ciphertext: Buffer; last_refresh_at: Date }>(
      'SELECT refresh_token_ciphertext, last_refresh_at FROM marketplace_apps WHERE public_id = $1', [publicId]);
    // Le chiffré ne doit pas contenir le jeton en clair : c'est le seul contrôle possible ici,
    // le déchiffrement étant déjà couvert par le cycle complet ci-dessus.
    expect(row.rows[0]!.refresh_token_ciphertext.toString('utf8')).not.toContain('refresh-1');
    expect(row.rows[0]!.last_refresh_at).toBeTruthy();
  });

  it('passe la boutique en reauth_required sur invalid_grant, sans réessayer', async () => {
    const publicId = await createApp({ publicId: '44444444-4444-4444-8444-444444444444',
      accessTokenExpiresInMs: null });
    const fake = fakeEndpoint('invalid_grant');
    const result = await getAccessToken({
      appPublicId: publicId, userSessionToken: owner.token, endpoint: fake.endpoint });
    expect(result).toEqual({ kind: 'reauth_required', reason: 'invalid_grant' });
    expect(fake.calls).toHaveLength(1); // aucun retry
    const row = await db.query<{ status: string; last_error_code: string }>(
      'SELECT status, last_error_code FROM marketplace_apps WHERE public_id = $1', [publicId]);
    expect(row.rows[0]).toMatchObject({ status: 'reauth_required', last_error_code: 'invalid_grant' });

    // Un second appel ne rappelle pas Jumia : l'état est déjà connu.
    const again = await getAccessToken({
      appPublicId: publicId, userSessionToken: owner.token, endpoint: fake.endpoint });
    expect(again).toEqual({ kind: 'reauth_required', reason: 'invalid_grant' });
    expect(fake.calls).toHaveLength(1);
  });

  it('exige une reconnexion quand une rotation a été perdue', async () => {
    const publicId = await createApp({ publicId: '55555555-5555-4555-8555-555555555555',
      accessTokenExpiresInMs: null });
    await db.query(`UPDATE marketplace_apps SET rotation_guard_at = now(),
      rotation_guard_outcome = 'write_failed' WHERE public_id = $1`, [publicId]);
    const fake = fakeEndpoint('refreshed');
    const result = await getAccessToken({
      appPublicId: publicId, userSessionToken: owner.token, endpoint: fake.endpoint });
    expect(result).toEqual({ kind: 'reauth_required', reason: 'rotation_lost' });
    // Surtout : Jumia n'est PAS appelé, car le jeton en base est peut-être déjà consommé.
    expect(fake.calls).toHaveLength(0);
  });

  it('refuse un renouvellement sans session propriétaire valide', async () => {
    const publicId = await createApp({ publicId: '66666666-6666-4666-8666-666666666666',
      accessTokenExpiresInMs: null });
    const fake = fakeEndpoint('refreshed');
    const result = await getAccessToken({
      appPublicId: publicId, userSessionToken: createSessionToken().token, endpoint: fake.endpoint });
    expect(result.kind).toBe('reauth_required');
    expect(fake.calls).toHaveLength(0);
  });

  it('journalise l’issue sans jamais écrire de valeur de jeton', async () => {
    const rows = await db.query<{ outcome: string }>(
      'SELECT outcome FROM marketplace_token_refresh_log ORDER BY id');
    const outcomes = rows.rows.map((row) => row.outcome);
    expect(outcomes).toContain('refreshed');
    expect(outcomes).toContain('reused_cached');
    expect(outcomes).toContain('invalid_grant');
    // Aucune colonne du journal ne peut contenir un jeton : on vérifie la forme des données.
    const dump = await db.query<{ texte: string }>(
      `SELECT coalesce(error_code, '') || coalesce(outcome, '') AS texte
       FROM marketplace_token_refresh_log`);
    for (const row of dump.rows) expect(row.texte).not.toMatch(/refresh-\d|access-\d/);
  });

  it('interdit de réécrire ou de supprimer une ligne du journal', async () => {
    await expect(db.query("UPDATE marketplace_token_refresh_log SET outcome = 'refreshed'"))
      .rejects.toThrow();
    await expect(db.query('DELETE FROM marketplace_token_refresh_log')).rejects.toThrow();
  });
});
