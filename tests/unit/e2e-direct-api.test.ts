import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { request } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { directApi } from '../e2e/direct-api';

describe('transport API des tests navigateur', () => {
  let server: Server;
  let baseURL: string;
  let mutations = 0;
  let resets = 0;
  const seen = new WeakSet<object>();

  beforeAll(async () => {
    // Simule un serveur qui réinitialise une connexion réutilisée : ce n'est
    // pas la preuve que le serveur CI a fait exactement la même chose.
    server = createServer((req, res) => {
      if (req.url === '/reset') { resets++; req.socket.destroy(); return; }
      if (seen.has(req.socket)) { req.socket.destroy(); return; }
      seen.add(req.socket);
      if (req.url === '/set-cookie') res.setHeader('Set-Cookie', 'fixture=test; Path=/; HttpOnly');
      if (req.method === 'POST') mutations++;
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = req.url === '/denied' ? 403 : 200;
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => res.end(JSON.stringify({ cookie: req.headers.cookie, origin: req.headers.origin,
        connection: req.headers.connection, body: Buffer.concat(chunks).toString() })));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });

  it('reproduit le reset artificiel en cas de réutilisation par Playwright', async () => {
    const ctx = await request.newContext({ baseURL });
    try {
      expect((await ctx.get('/')).status()).toBe(200);
      await expect(ctx.get('/')).rejects.toThrow(/ECONNRESET|socket hang up/);
    } finally { await ctx.dispose(); }
  });

  it('utilise des connexions distinctes sans perdre cookies, corps, en-têtes ni erreurs HTTP', async () => {
    const ctx = await request.newContext({ baseURL });
    try {
      const api = directApi(ctx);
      expect((await api.get('/set-cookie')).status()).toBe(200);
      const response = await api.post('/mutation', { headers: { Origin: baseURL }, data: { name: 'fictif' } });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ cookie: 'fixture=test', origin: baseURL, connection: 'close', body: '{"name":"fictif"}' });
      expect(mutations).toBe(1);
      expect((await api.get('/denied')).status()).toBe(403);
      expect((await api.get('/')).status()).toBe(200);
    } finally { await ctx.dispose(); }
  });

  it('ne relance pas une requête ayant subi une réinitialisation', async () => {
    const ctx = await request.newContext({ baseURL });
    try {
      const before = resets;
      await expect(directApi(ctx).get('/reset')).rejects.toThrow(/ECONNRESET|socket hang up/);
      expect(resets - before).toBe(1);
    } finally { await ctx.dispose(); }
  });
});
