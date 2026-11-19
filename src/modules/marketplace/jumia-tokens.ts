/**
 * Jetons Jumia — renouvellement sûr.
 *
 * Le point le plus dangereux de l'intégration (docs/jumia-integration.md §2.4) : chaque appel
 * `POST /token` INVALIDE le refresh token utilisé et en renvoie un nouveau. Deux renouvellements
 * concurrents, et la boutique est définitivement déconnectée jusqu'à une nouvelle génération
 * manuelle dans l'interface Jumia.
 *
 * Trois protections, toutes dans ce fichier :
 *
 * 1. **Verrou consultatif PostgreSQL par application** (`pg_advisory_xact_lock`). Il est pris
 *    avant toute relecture du jeton et tenu jusqu'au COMMIT : deux processus ne peuvent pas
 *    appeler `/token` en même temps pour la même application Jumia.
 * 2. **Relecture sous verrou, et renouvellement inutile évité.** Le second processus trouve le
 *    jeton déjà rafraîchi par le premier et le réutilise : il n'appelle pas l'API.
 * 3. **Garde anti-rotation perdue.** Si l'appel HTTP réussit mais que l'écriture échoue, le
 *    jeton en base est périmé. On le rend explicite (`rotation_guard_at`) au lieu de boucler
 *    sur `invalid_grant`, et l'application exige une reconnexion manuelle.
 *
 * Ce que ce module ne fait JAMAIS : journaliser un jeton, le renvoyer au navigateur, ou le
 * stocker en clair. Les colonnes sont chiffrées (enveloppe AES-GCM, `core/crypto/envelope`),
 * et le journal `marketplace_token_refresh_log` n'enregistre que l'issue et les durées.
 */
import { withIdentityTransaction } from '@/core/db/client';
import { openSecret, parseKeyRing, resealSecret, sealSecret, type KeyRing } from '@/core/crypto/envelope';
import { hashSessionToken } from '@/core/auth/primitives';

/** Durée d'accès considérée comme « encore bonne ». Marge avant expiration, jamais en dur côté API. */
export const ACCESS_TOKEN_SAFETY_MARGIN_MS = 5 * 60_000;

export type RefreshOutcome =
  | 'refreshed' | 'reused_cached' | 'invalid_grant' | 'invalid_client'
  | 'network_error' | 'rate_limited' | 'unexpected_response';

/** Résultat d'un renouvellement : le jeton d'accès à utiliser, ou l'état à afficher. */
export type AccessTokenResult =
  | { kind: 'ok'; accessToken: string; refreshed: boolean }
  | { kind: 'reauth_required'; reason: 'invalid_grant' | 'rotation_lost' | 'no_refresh_token' }
  | { kind: 'failed'; reason: 'network_error' | 'unexpected_response' | 'rate_limited' | 'invalid_client' };

/** Ce qu'un appel vérifie sur place : injectable, donc testable sans réseau. */
export interface TokenEndpoint {
  /** `POST /token` en `application/x-www-form-urlencoded`. Ne lève jamais : renvoie l'issue. */
  refresh(input: { clientId: string; refreshToken: string }): Promise<{
    outcome: RefreshOutcome;
    accessToken?: string;
    refreshToken?: string;
    expiresInSeconds?: number;
    refreshExpiresSeconds?: number;
    httpStatus?: number;
  }>;
}

function readKeyRing(): KeyRing {
  const raw = process.env.APP_ENC_KEYS;
  if (!raw) throw new Error('APP_ENC_KEYS absent : impossible de déchiffrer un jeton Jumia.');
  return parseKeyRing(raw, Number(process.env.APP_ENC_ACTIVE));
}

/** Contexte d'enveloppe : lie le secret à CETTE application. Un jeton déplacé ne s'ouvre pas. */
function appContext(appPublicId: string, field: 'refresh' | 'access'): string {
  return `marketplace_app:${appPublicId}:${field}`;
}

interface AppRow {
  id: string;
  public_id: string;
  client_id: string;
  key_version: number;
  status: string;
  access_token_expires_at: Date | null;
  rotation_guard_at: Date | null;
  refresh_token_ciphertext: Buffer | null;
  refresh_token_iv: Buffer | null;
  refresh_token_tag: Buffer | null;
  access_token_ciphertext: Buffer | null;
  access_token_iv: Buffer | null;
  access_token_tag: Buffer | null;
}

/**
 * Renvoie un access token utilisable, en le renouvelant seulement si nécessaire.
 *
 * @param userSessionToken jeton de session du Propriétaire : le renouvellement est un acte
 *   d'administration, jamais une opération anonyme. Il pose aussi le contexte RLS.
 */
export async function getAccessToken(input: {
  appPublicId: string;
  userSessionToken: string;
  endpoint: TokenEndpoint;
  now?: Date;
}): Promise<AccessTokenResult> {
  const now = input.now ?? new Date();
  const ring = readKeyRing();

  return withIdentityTransaction(async (db) => {
    // Verrou GLOBAL par application, tenu jusqu'au COMMIT. C'est lui qui empêche deux
    // renouvellements concurrents de consommer le même refresh token.
    await db.query("SELECT pg_advisory_xact_lock(hashtext('marketplace_app:' || $1))",
      [input.appPublicId]);

    // Le contexte RLS de marketplace_apps exige l'identifiant de l'utilisateur propriétaire.
    // L'empreinte du jeton de session est calculée par le noyau d'authentification : sha256 n'a
    // pas besoin d'être étendu à la base (pgcrypto n'est pas garanti sur tous les environnements).
    const owner = await db.query<{ user_id: string }>(
      `SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.status = 'active'`,
      [hashSessionToken(input.userSessionToken)]);
    const userId = owner.rows[0]?.user_id;
    if (!userId) return { kind: 'reauth_required', reason: 'no_refresh_token' } as const;
    await db.query("SELECT set_config('app.marketplace_user_id', $1, true)", [String(userId)]);

    // Relecture SOUS le verrou : ce que voit ce processus est l'état courant, pas un cache.
    const found = await db.query<AppRow>(
      `SELECT id::text, public_id::text, client_id, key_version, status, access_token_expires_at,
              rotation_guard_at, refresh_token_ciphertext, refresh_token_iv, refresh_token_tag,
              access_token_ciphertext, access_token_iv, access_token_tag
       FROM marketplace_apps WHERE public_id = $1 FOR UPDATE`,
      [input.appPublicId]);
    const app = found.rows[0];
    if (!app) return { kind: 'reauth_required', reason: 'no_refresh_token' } as const;

    // Une rotation perdue impose une reconnexion : réessayer consommerait un jeton peut-être
    // déjà invalidé, et la boucle d'échecs serait invisible pour le propriétaire.
    if (app.rotation_guard_at) return { kind: 'reauth_required', reason: 'rotation_lost' } as const;
    if (app.status === 'reauth_required') return { kind: 'reauth_required', reason: 'invalid_grant' } as const;
    if (app.status === 'disabled') return { kind: 'failed', reason: 'unexpected_response' } as const;

    // Jeton d'accès encore valable : on le réutilise, on n'appelle pas Jumia.
    if (app.access_token_ciphertext && app.access_token_iv && app.access_token_tag
      && app.access_token_expires_at
      && app.access_token_expires_at.getTime() - now.getTime() > ACCESS_TOKEN_SAFETY_MARGIN_MS) {
      const accessToken = openSecret({
        ciphertext: app.access_token_ciphertext, iv: app.access_token_iv,
        tag: app.access_token_tag, keyVersion: app.key_version,
      }, ring, appContext(app.public_id, 'access'));
      await logRefresh(db, app.id, 'reused_cached', { actorUserId: userId });
      return { kind: 'ok', accessToken, refreshed: false } as const;
    }

    if (!app.refresh_token_ciphertext || !app.refresh_token_iv || !app.refresh_token_tag) {
      return { kind: 'reauth_required', reason: 'no_refresh_token' } as const;
    }
    const refreshToken = openSecret({
      ciphertext: app.refresh_token_ciphertext, iv: app.refresh_token_iv,
      tag: app.refresh_token_tag, keyVersion: app.key_version,
    }, ring, appContext(app.public_id, 'refresh'));

    const startedAt = Date.now();
    const response = await input.endpoint.refresh({ clientId: app.client_id, refreshToken });

    if (response.outcome !== 'refreshed' || !response.accessToken || !response.refreshToken) {
      // `invalid_grant` : le jeton a été régénéré ailleurs, ou déjà consommé. Aucune boucle de
      // retry — l'état est consigné et la reconnexion est demandée.
      if (response.outcome === 'invalid_grant') {
        await db.query(`UPDATE marketplace_apps
          SET status = 'reauth_required', last_error_at = now(), last_error_code = 'invalid_grant'
          WHERE id = $1`, [app.id]);
      }
      await logRefresh(db, app.id, response.outcome, {
        durationMs: Date.now() - startedAt, httpStatus: response.httpStatus, actorUserId: userId,
        expiresInSeconds: response.expiresInSeconds,
        refreshExpiresSeconds: response.refreshExpiresSeconds,
      });
      if (response.outcome === 'invalid_grant') return { kind: 'reauth_required', reason: 'invalid_grant' } as const;
      if (response.outcome === 'invalid_client') return { kind: 'failed', reason: 'invalid_client' } as const;
      if (response.outcome === 'network_error') return { kind: 'failed', reason: 'network_error' } as const;
      if (response.outcome === 'rate_limited') return { kind: 'failed', reason: 'rate_limited' } as const;
      return { kind: 'failed', reason: 'unexpected_response' } as const;
    }

    // Écriture du NOUVEAU jeton et du nouveau refresh token, dans la même transaction que le
    // verrou : soit les deux passent, soit aucun. Un `POST /token` réussi suivi d'un échec
    // d'écriture rendrait le jeton en base périmé — d'où la garde ci-dessous.
    const sealedAccess = sealSecret(response.accessToken, ring, appContext(app.public_id, 'access'));
    const sealedRefresh = sealSecret(response.refreshToken, ring, appContext(app.public_id, 'refresh'));
    const accessExpiresAt = new Date(now.getTime() + (response.expiresInSeconds ?? 3600) * 1000);
    // `refresh_expires_in` est configurable côté Jumia : on ne code aucune durée en dur.
    const refreshExpiresAt = response.refreshExpiresSeconds === undefined
      ? null : new Date(now.getTime() + response.refreshExpiresSeconds * 1000);

    try {
      await db.query(`UPDATE marketplace_apps
        SET access_token_ciphertext = $2, access_token_iv = $3, access_token_tag = $4,
            refresh_token_ciphertext = $5, refresh_token_iv = $6, refresh_token_tag = $7,
            key_version = $8, access_token_expires_at = $9, refresh_token_expires_at = $10,
            last_refresh_at = now(), last_error_at = NULL, last_error_code = NULL,
            rotation_guard_at = NULL, rotation_guard_outcome = NULL,
            status = CASE WHEN status = 'error' THEN 'active' ELSE status END
        WHERE id = $1`,
        [app.id, sealedAccess.ciphertext, sealedAccess.iv, sealedAccess.tag,
          sealedRefresh.ciphertext, sealedRefresh.iv, sealedRefresh.tag,
          sealedAccess.keyVersion, accessExpiresAt, refreshExpiresAt]);
    } catch (error) {
      // Le jeton a très probablement été consommé côté Jumia. On le dit explicitement, dans une
      // transaction séparée (celle-ci est avortée), plutôt que de laisser un état ambigu.
      await markRotationLost(app.public_id);
      throw error;
    }

    await logRefresh(db, app.id, 'refreshed', {
      durationMs: Date.now() - startedAt, httpStatus: response.httpStatus, actorUserId: userId,
      expiresInSeconds: response.expiresInSeconds,
      refreshExpiresSeconds: response.refreshExpiresSeconds,
    });
    return { kind: 'ok', accessToken: response.accessToken, refreshed: true } as const;
  });
}

/** Pose la garde anti-rotation hors transaction : l'appelant devra exiger une reconnexion. */
async function markRotationLost(appPublicId: string): Promise<void> {
  try {
    await withIdentityTransaction(async (db) => {
      await db.query(`UPDATE marketplace_apps
        SET rotation_guard_at = now(), rotation_guard_outcome = 'write_failed',
            status = 'reauth_required', last_error_at = now(), last_error_code = 'rotation_lost'
        WHERE public_id = $1`, [appPublicId]);
    });
  } catch {
    // Si même ce marquage échoue (base indisponible), l'erreur d'origine reste celle remontée.
    // L'état sera rattrapé par la garde `invalid_grant` au prochain appel.
  }
}

/** Journal append-only : issue, durée, statut HTTP, durées annoncées. Jamais un jeton. */
async function logRefresh(
  db: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  appId: string,
  outcome: RefreshOutcome,
  extra: {
    // `exactOptionalPropertyTypes` est actif dans ce projet : une valeur `undefined` explicite
    // n'est pas acceptée là où la propriété est optionnelle. Les types l'annoncent donc.
    durationMs?: number | undefined; httpStatus?: number | undefined; actorUserId?: string | undefined;
    expiresInSeconds?: number | undefined; refreshExpiresSeconds?: number | undefined;
  },
): Promise<void> {
  try {
    await db.query(`INSERT INTO marketplace_token_refresh_log
      (app_id, outcome, duration_ms, http_status, expires_in_seconds, refresh_expires_seconds, actor_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [appId, outcome, extra.durationMs ?? null, extra.httpStatus ?? null,
      extra.expiresInSeconds ?? null, extra.refreshExpiresSeconds ?? null,
      extra.actorUserId ?? null]);
  } catch {
    // Un journal muet ne doit pas empêcher un renouvellement réussi de servir la requête.
  }
}

/**
 * Chiffre un refresh token saisi par le propriétaire, juste après vérification auprès de Jumia.
 * Renvoie les trois colonnes à écrire — jamais la valeur en clair.
 */
export function sealRefreshToken(appPublicId: string, refreshToken: string): {
  ciphertext: Buffer; iv: Buffer; tag: Buffer; keyVersion: number;
} {
  const sealed = sealSecret(refreshToken, readKeyRing(), appContext(appPublicId, 'refresh'));
  return sealed;
}

/** Re-chiffrement paresseux quand la clé active a changé. Utilisé à la prochaine écriture. */
export function resealIfNeeded(
  appPublicId: string,
  field: 'refresh' | 'access',
  sealed: { ciphertext: Buffer; iv: Buffer; tag: Buffer; keyVersion: number },
): { ciphertext: Buffer; iv: Buffer; tag: Buffer; keyVersion: number } {
  return resealSecret(sealed, readKeyRing(), appContext(appPublicId, field));
}
