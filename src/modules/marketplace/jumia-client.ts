/**
 * Client HTTP de l'API Vendor Center Jumia.
 *
 * Portée : `POST /token` et `GET /shops` uniquement. Aucune écriture chez Jumia.
 *
 * Règles venues de la spécification officielle (`docs/reference/jumia-openapi/`) :
 * · `POST /token` en `application/x-www-form-urlencoded`, **sans `client_secret`**
 *   (application de type Self Authorization) ;
 * · erreurs OAuth dans le corps : `{ error, error_description }` — un 400 n'est donc PAS
 *   forcément une erreur de programmation : `invalid_grant` est un état métier attendu ;
 * · `expires_in` et `refresh_expires_in` sont **configurables** : aucune durée en dur ;
 * · `GET /shops` n'est pas paginé et renvoie un tableau nu (pas d'enveloppe `data`).
 *
 * Ce que ce module ne fait pas : gérer le verrou de renouvellement (c'est le rôle de
 * `jumia-tokens.ts`), ni la limitation de débit (incrément suivant). Il traduit une
 * conversation HTTP en résultat typé, sans jamais lever d'exception réseau.
 */

/** Hôtes officiels. Staging existe mais n'est pas activé par défaut. */
export const JUMIA_HOSTS = {
  production: 'https://vendor-api.jumia.com',
  staging: 'https://vendor-api-staging.jumia.com',
} as const;

export type JumiaOutcome =
  /** Réponse exploitable. */
  | 'ok'
  /** Le serveur a demandé explicitement de ralentir (429). */
  | 'rate_limited'
  /** 5xx ou panne réseau : rejouable. */
  | 'transient'
  /** `invalid_grant` / `invalid_client` : ne jamais rejouer. */
  | 'rejected'
  /** 4xx métier ou réponse inattendue : ne pas rejouer. */
  | 'fatal';

export interface JumiaTokenResponse {
  accessToken: string;
  expiresInSeconds: number;
  /** Présent uniquement pour une application Self Authorization. */
  refreshToken: string | null;
  refreshExpiresSeconds: number | null;
  scope: string | null;
  tokenType: string;
}

export interface JumiaBusinessClient {
  name: string;
  code: string;
  countryCode: string;
  status: string;
  shortCode: string;
}

export interface JumiaShop {
  /** Identifiant de boutique côté Jumia (UUID), à ne pas confondre avec notre `shops.id`. */
  id: string;
  name: string;
  email: string;
  businessClients: JumiaBusinessClient[];
}

export type JumiaResult<T> =
  | { outcome: 'ok'; data: T; httpStatus: number }
  | {
    outcome: Exclude<JumiaOutcome, 'ok'>;
    httpStatus: number | null;
    /** Code lisible : code OAuth, ou libellé interne stable. Jamais un jeton. */
    code: string;
    /** Message destiné au journal, tronqué. Jamais un jeton. */
    message: string;
    retryAfterSeconds: number | null;
  };

export interface JumiaClientOptions {
  /** Hôte de base. Par défaut la production ; jamais codé en dur ailleurs. */
  baseUrl?: string;
  /** Délai maximal d'une requête. */
  timeoutMs?: number;
  /** Injecté pour les tests : aucun réseau réel n'est alors utilisé. */
  fetchImpl?: typeof fetch;
  /** Horloge injectable, pour rendre les tests déterministes. */
  now?: () => Date;
}

const DEFAULT_TIMEOUT_MS = 20_000;
/** Longueur maximale d'un message conservé : un message d'erreur ne doit pas inonder le journal. */
const MAX_MESSAGE = 300;

function truncate(value: string): string {
  return value.length <= MAX_MESSAGE ? value : `${value.slice(0, MAX_MESSAGE)}…`;
}

/**
 * Lit `Retry-After`. Le format peut être un nombre de secondes ou une date HTTP.
 * La spécification Jumia ne documente pas cet en-tête : on accepte les deux formes et
 * on renvoie `null` plutôt que d'inventer une valeur.
 */
export function parseRetryAfter(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) ? seconds : null;
  }
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return null;
  const seconds = Math.ceil((date - Date.now()) / 1000);
  return seconds > 0 ? seconds : 0;
}

/** Corps d'erreur OAuth de Jumia : `{ error, error_description }`. */
function readOAuthError(body: string): { code: string; message: string } {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const code = typeof record.error === 'string' ? record.error : null;
      const description = typeof record.error_description === 'string' ? record.error_description : null;
      if (code) return { code, message: truncate(description ?? code) };
    }
  } catch {
    // Corps non JSON : on garde la trace brute, tronquée.
  }
  return { code: 'unexpected_response', message: truncate(body.trim() || 'Réponse vide') };
}

/** Classe une réponse HTTP en issue, sans décider du retry (rôle de l'appelant). */
function classifyError(
  httpStatus: number,
  body: string,
  headers: Headers,
): Extract<JumiaResult<never>, { outcome: Exclude<JumiaOutcome, 'ok'> }> {
  const retryAfterSeconds = parseRetryAfter(headers.get('retry-after'));

  if (httpStatus === 429) {
    return { outcome: 'rate_limited', httpStatus, code: 'rate_limited',
      message: 'Quota atteint (429).', retryAfterSeconds };
  }

  const oauth = readOAuthError(body);

  // `invalid_grant` : le refresh token a été régénéré ailleurs ou déjà consommé.
  // `invalid_client` : client_id inconnu. Dans les deux cas, rejouer est inutile et dangereux.
  if (oauth.code === 'invalid_grant' || oauth.code === 'invalid_client'
    || oauth.code === 'unauthorized_client') {
    return { outcome: 'rejected', httpStatus, code: oauth.code,
      message: oauth.message, retryAfterSeconds };
  }

  if (httpStatus >= 500) {
    return { outcome: 'transient', httpStatus, code: oauth.code,
      message: oauth.message, retryAfterSeconds };
  }

  return { outcome: 'fatal', httpStatus, code: oauth.code, message: oauth.message, retryAfterSeconds };
}

/** Valide et convertit la réponse de `POST /token`, sans faire confiance au serveur. */
function readTokenResponse(body: string): { ok: true; data: JumiaTokenResponse } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, message: 'Réponse de jeton illisible (JSON invalide).' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, message: 'Réponse de jeton vide.' };
  const r = parsed as Record<string, unknown>;

  const accessToken = typeof r.access_token === 'string' ? r.access_token : null;
  // `expires_in` est la seule durée fiable : refuser une réponse sans elle évite d'inventer
  // une durée de vie. La spec précise qu'elle est configurable et a déjà changé.
  const expiresIn = typeof r.expires_in === 'number' && Number.isFinite(r.expires_in) ? r.expires_in : null;

  if (!accessToken || expiresIn === null) {
    return { ok: false, message: 'Réponse de jeton incomplète (access_token ou expires_in absent).' };
  }

  return {
    ok: true,
    data: {
      accessToken,
      expiresInSeconds: expiresIn,
      refreshToken: typeof r.refresh_token === 'string' ? r.refresh_token : null,
      refreshExpiresSeconds: typeof r.refresh_expires_in === 'number' && Number.isFinite(r.refresh_expires_in)
        ? r.refresh_expires_in : null,
      scope: typeof r.scope === 'string' ? r.scope : null,
      tokenType: typeof r.token_type === 'string' ? r.token_type : 'Bearer',
    },
  };
}

/** Valide la réponse de `GET /shops` : tableau nu, pas d'enveloppe. */
function readShopsResponse(body: string): { ok: true; data: JumiaShop[] } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, message: 'Réponse de boutiques illisible (JSON invalide).' };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, message: 'Réponse de boutiques inattendue : un tableau était attendu.' };
  }

  const shops: JumiaShop[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue;
    const s = entry as Record<string, unknown>;
    if (typeof s.id !== 'string' || typeof s.name !== 'string') {
      // Une entrée sans identifiant ni nom n'est pas exploitable : on l'ignore plutôt que
      // de créer une boutique fantôme.
      continue;
    }
    const clients: JumiaBusinessClient[] = [];
    if (Array.isArray(s.businessClients)) {
      for (const c of s.businessClients) {
        if (!c || typeof c !== 'object') continue;
        const bc = c as Record<string, unknown>;
        if (typeof bc.code !== 'string' || typeof bc.countryCode !== 'string') continue;
        clients.push({
          name: typeof bc.name === 'string' ? bc.name : '',
          code: bc.code,
          countryCode: bc.countryCode,
          status: typeof bc.status === 'string' ? bc.status : '',
          shortCode: typeof bc.shortCode === 'string' ? bc.shortCode : '',
        });
      }
    }
    shops.push({
      id: s.id,
      name: s.name,
      email: typeof s.email === 'string' ? s.email : '',
      businessClients: clients,
    });
  }
  return { ok: true, data: shops };
}

export function createJumiaClient(options: JumiaClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? JUMIA_HOSTS.production).replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch = options.fetchImpl ?? fetch;

  /**
   * Exécute une requête et renvoie toujours un résultat typé : aucune exception réseau
   * ne remonte. Un appelant qui doit décider d'un retry a besoin d'un état, pas d'un `throw`.
   */
  async function request(
    path: string,
    init: RequestInit,
  ): Promise<{ outcome: 'ok'; body: string; httpStatus: number; headers: Headers }
    | Extract<JumiaResult<never>, { outcome: Exclude<JumiaOutcome, 'ok'> }>> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
        // Jamais de cache : un jeton périmé servi par un cache serait indétectable.
        cache: 'no-store',
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'unknown';
      return {
        outcome: 'transient',
        httpStatus: null,
        code: reason === 'TimeoutError' || reason === 'AbortError' ? 'timeout' : 'network_error',
        message: truncate(error instanceof Error ? error.message : 'Erreur réseau'),
        retryAfterSeconds: null,
      };
    }

    const body = await response.text().catch(() => '');
    if (response.ok) {
      return { outcome: 'ok', body, httpStatus: response.status, headers: response.headers };
    }
    return classifyError(response.status, body, response.headers);
  }

  return {
    /**
     * `POST /token` — Self Authorization uniquement : `grant_type=refresh_token`,
     * `client_id`, `refresh_token`, et **jamais** de `client_secret`.
     */
    async refreshToken(input: { clientId: string; refreshToken: string }): Promise<JumiaResult<JumiaTokenResponse>> {
      const form = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: input.clientId,
        refresh_token: input.refreshToken,
      });

      const result = await request('/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
      });
      if (result.outcome !== 'ok') return result;

      const token = readTokenResponse(result.body);
      if (!token.ok) {
        return { outcome: 'fatal', httpStatus: result.httpStatus, code: 'unexpected_response',
          message: token.message, retryAfterSeconds: null };
      }
      return { outcome: 'ok', data: token.data, httpStatus: result.httpStatus };
    },

    /** `GET /shops` — liste non paginée des boutiques du compte, avec leurs pays. */
    async listShops(input: { accessToken: string }): Promise<JumiaResult<JumiaShop[]>> {
      const result = await request('/shops', {
        method: 'GET',
        headers: { Authorization: `Bearer ${input.accessToken}`, Accept: 'application/json' },
      });
      if (result.outcome !== 'ok') return result;

      const shops = readShopsResponse(result.body);
      if (!shops.ok) {
        return { outcome: 'fatal', httpStatus: result.httpStatus, code: 'unexpected_response',
          message: shops.message, retryAfterSeconds: null };
      }
      return { outcome: 'ok', data: shops.data, httpStatus: result.httpStatus };
    },
  };
}

export type JumiaClient = ReturnType<typeof createJumiaClient>;
