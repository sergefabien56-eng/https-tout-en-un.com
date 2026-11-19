/**
 * Client HTTP Vendor Center — contre un serveur HTTP RÉEL (localhost), pas un simulacre.
 *
 * Un `fetch` remplacé par une fonction ne prouve rien du comportement réseau : encodage du
 * corps, en-têtes, lecture de `Retry-After`, expiration du délai. On démarre donc un vrai
 * serveur HTTP éphémère et on lui fait jouer Jumia.
 *
 * Aucune requête ne sort vers `vendor-api.jumia.com` : l'hôte est injecté.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createJumiaClient, parseRetryAfter, JUMIA_HOSTS } from '@/modules/marketplace/jumia-client';

type Handler = (req: IncomingMessage, res: ServerResponse, body: string) => void;
let server: Server;
let baseUrl: string;
let handler: Handler;
/** Journal des requêtes reçues : permet de vérifier ce qui part réellement sur le réseau. */
let received: { method: string; url: string; headers: IncomingMessage['headers']; body: string }[];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += String(chunk); });
    req.on('end', () => {
      received.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body });
      handler(req, res, body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });

function json(res: ServerResponse, status: number, payload: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(payload));
}

function client(timeoutMs = 5_000) {
  return createJumiaClient({ baseUrl, timeoutMs });
}

describe('parseRetryAfter', () => {
  it('lit un nombre de secondes', () => {
    expect(parseRetryAfter('120')).toBe(120);
    expect(parseRetryAfter('0')).toBe(0);
  });
  it('lit une date HTTP', () => {
    const future = new Date(Date.now() + 60_000).toUTCString();
    const value = parseRetryAfter(future);
    expect(value).toBeGreaterThan(50);
    expect(value).toBeLessThanOrEqual(61);
  });
  it('renvoie null plutôt que d’inventer une valeur', () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('bientôt')).toBeNull();
    expect(parseRetryAfter('')).toBeNull();
  });
});

describe('POST /token', () => {
  it('envoie le corps attendu, sans client_secret', async () => {
    received = [];
    handler = (_req, res) => json(res, 200, {
      access_token: 'jeton-abc', token_type: 'Bearer', expires_in: 3600,
      refresh_token: 'refresh-neuf', refresh_expires_in: 86400, scope: 'offline_access openid',
    });

    const result = await client().refreshToken({ clientId: 'client-ci', refreshToken: 'refresh-ancien' });

    expect(result.outcome).toBe('ok');
    expect(received).toHaveLength(1);
    const req = received[0]!;
    expect(req.method).toBe('POST');
    expect(req.url).toBe('/token');
    expect(req.headers['content-type']).toBe('application/x-www-form-urlencoded');

    // Ce qui part réellement sur le réseau, octet pour octet.
    const form = new URLSearchParams(req.body);
    expect(form.get('grant_type')).toBe('refresh_token');
    expect(form.get('client_id')).toBe('client-ci');
    expect(form.get('refresh_token')).toBe('refresh-ancien');
    // Une application Self Authorization ne doit JAMAIS envoyer de secret.
    expect(form.get('client_secret')).toBeNull();
    expect(req.body).not.toContain('client_secret');

    if (result.outcome !== 'ok') throw new Error('résultat attendu ok');
    expect(result.data.accessToken).toBe('jeton-abc');
    expect(result.data.refreshToken).toBe('refresh-neuf');
    expect(result.data.expiresInSeconds).toBe(3600);
    expect(result.data.refreshExpiresSeconds).toBe(86400);
  });

  it('n’invente aucune durée quand le serveur l’omet', async () => {
    handler = (_req, res) => json(res, 200, {
      access_token: 'jeton-sans-durees', token_type: 'Bearer', expires_in: 900,
    });
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'r' });
    if (result.outcome !== 'ok') throw new Error('résultat attendu ok');
    // `refresh_token` absent = pas de rotation annoncée. On le signale, on ne le fabrique pas.
    expect(result.data.refreshToken).toBeNull();
    expect(result.data.refreshExpiresSeconds).toBeNull();
    expect(result.data.expiresInSeconds).toBe(900);
  });

  it('refuse une réponse sans expires_in au lieu de supposer une durée', async () => {
    handler = (_req, res) => json(res, 200, { access_token: 'jeton', token_type: 'Bearer' });
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'r' });
    expect(result.outcome).toBe('fatal');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.code).toBe('unexpected_response');
  });

  it('classe invalid_grant comme non rejouable, avec son message', async () => {
    handler = (_req, res) => json(res, 400, {
      error: 'invalid_grant', error_description: 'Invalid refresh token',
    });
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'périmé' });
    expect(result.outcome).toBe('rejected');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.code).toBe('invalid_grant');
    expect(result.message).toContain('Invalid refresh token');
    expect(result.httpStatus).toBe(400);
  });

  it('classe invalid_client comme non rejouable', async () => {
    handler = (_req, res) => json(res, 401, { error: 'invalid_client', error_description: 'Unknown client' });
    const result = await client().refreshToken({ clientId: 'inconnu', refreshToken: 'r' });
    expect(result.outcome).toBe('rejected');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.code).toBe('invalid_client');
  });

  it('lit Retry-After sur un 429', async () => {
    handler = (_req, res) => json(res, 429, { error: 'too_many_requests' }, { 'Retry-After': '42' });
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'r' });
    expect(result.outcome).toBe('rate_limited');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.retryAfterSeconds).toBe(42);
  });

  it('signale un 429 sans Retry-After sans inventer de délai', async () => {
    handler = (_req, res) => json(res, 429, { error: 'too_many_requests' });
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'r' });
    expect(result.outcome).toBe('rate_limited');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.retryAfterSeconds).toBeNull();
  });

  it('classe un 500 comme rejouable', async () => {
    handler = (_req, res) => json(res, 500, { error: 'internal' });
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'r' });
    expect(result.outcome).toBe('transient');
  });

  it('classe un 400 sans code OAuth comme fatal, sans retry', async () => {
    handler = (_req, res) => json(res, 400, { message: 'champ requis manquant' });
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'r' });
    expect(result.outcome).toBe('fatal');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.message).toContain('champ requis');
  });

  it('classe un corps non JSON comme fatal et le tronque', async () => {
    handler = (_req, res) => {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end('<html>' + 'x'.repeat(1000) + '</html>');
    };
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'r' });
    expect(result.outcome).toBe('transient');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.message.length).toBeLessThanOrEqual(301);
  });

  it('abandonne au-delà du délai imparti, sans lever d’exception', async () => {
    handler = () => { /* ne répond jamais */ };
    const result = await client(150).refreshToken({ clientId: 'c', refreshToken: 'r' });
    expect(result.outcome).toBe('transient');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.code).toBe('timeout');
    expect(result.httpStatus).toBeNull();
  }, 10_000);
});

describe('GET /shops', () => {
  it('envoie le jeton en Bearer et lit un tableau nu', async () => {
    received = [];
    handler = (_req, res) => json(res, 200, [
      {
        id: 'b16aac6d-4b08-45ab-b8be-baf11615f400',
        name: 'Boutique Abidjan',
        email: 'boutique@exemple.invalid',
        businessClients: [
          { name: 'Jumia', code: 'jumia-ci', countryCode: 'CI', status: 'ACTIVE', shortCode: 'CI100S9' },
        ],
      },
    ]);

    const result = await client().listShops({ accessToken: 'jeton-abc' });
    expect(result.outcome).toBe('ok');
    expect(received[0]!.headers.authorization).toBe('Bearer jeton-abc');
    if (result.outcome !== 'ok') throw new Error('résultat attendu ok');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe('b16aac6d-4b08-45ab-b8be-baf11615f400');
    expect(result.data[0]!.businessClients[0]!.countryCode).toBe('CI');
  });

  it('ignore une entrée inexploitable plutôt que de créer une boutique fantôme', async () => {
    handler = (_req, res) => json(res, 200, [
      { id: 'ok-1', name: 'Valide', email: '', businessClients: [] },
      { name: 'Sans identifiant' },
      null,
      'texte',
    ]);
    const result = await client().listShops({ accessToken: 'j' });
    if (result.outcome !== 'ok') throw new Error('résultat attendu ok');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.name).toBe('Valide');
  });

  it('refuse une enveloppe inattendue', async () => {
    handler = (_req, res) => json(res, 200, { data: [] });
    const result = await client().listShops({ accessToken: 'j' });
    expect(result.outcome).toBe('fatal');
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.message).toContain('tableau');
  });

  it('propage invalid_grant sur un 401, sans retry', async () => {
    handler = (_req, res) => json(res, 401, { error: 'invalid_grant', error_description: 'expiré' });
    const result = await client().listShops({ accessToken: 'périmé' });
    expect(result.outcome).toBe('rejected');
  });
});

describe('configuration', () => {
  it('vise la production par défaut et connaît le staging', () => {
    expect(JUMIA_HOSTS.production).toBe('https://vendor-api.jumia.com');
    expect(JUMIA_HOSTS.staging).toBe('https://vendor-api-staging.jumia.com');
  });

  it('ne laisse aucun jeton dans les messages d’erreur', async () => {
    handler = (_req, res) => json(res, 400, { error: 'invalid_grant', error_description: 'Invalid refresh token' });
    const result = await client().refreshToken({ clientId: 'c', refreshToken: 'SECRET-A-NE-PAS-FUITER' });
    if (result.outcome === 'ok') throw new Error('aurait dû échouer');
    expect(result.message).not.toContain('SECRET-A-NE-PAS-FUITER');
    expect(result.code).not.toContain('SECRET-A-NE-PAS-FUITER');
  });
});
