import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as csrfGet } from '@/app/api/auth/csrf/route';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { nextLock } from '@/core/auth/service';

const oldAppUrl = process.env.APP_URL;
afterEach(() => { if (oldAppUrl) process.env.APP_URL = oldAppUrl; else delete process.env.APP_URL; });

describe('routes auth — barrières exécutées avant tout accès base', () => {
  it('GET CSRF délivre un jeton non prévisible et no-store', () => {
    const a = csrfGet(); const b = csrfGet();
    expect(a.cookies.get('toutenun_csrf')?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.cookies.get('toutenun_csrf')?.value).not.toEqual(b.cookies.get('toutenun_csrf')?.value);
    expect(a.headers.get('cache-control')).toBe('no-store');
  });
  it('POST login refuse un Origin étranger, y compris avec corps valide', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const request = new NextRequest('https://app.example.com/api/auth/login', {
      method: 'POST', headers: { origin: 'https://app.example.com.evil.test', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'MotDePasse!2026', totp: '123456' }),
    });
    expect((await loginPost(request)).status).toBe(403);
  });
  it('POST login refuse sans double-submit même avec Origin valide', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const request = new NextRequest('https://app.example.com/api/auth/login', {
      method: 'POST', headers: { origin: 'https://app.example.com', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'MotDePasse!2026', totp: '123456' }),
    });
    expect((await loginPost(request)).status).toBe(403);
  });
  it('POST logout ne détruit pas de session sans Origin et CSRF', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const request = new NextRequest('https://app.example.com/api/auth/logout', { method: 'POST' });
    expect((await logoutPost(request)).status).toBe(403);
  });
  it('verrouillage progressif, plafonné', () => {
    const now = new Date('2026-11-10T00:00:00Z');
    expect(nextLock(4, now)).toBeNull();
    expect(nextLock(5, now)?.getTime()).toBe(now.getTime() + 30_000);
    expect(nextLock(6, now)?.getTime()).toBe(now.getTime() + 60_000);
    expect(nextLock(100, now)?.getTime()).toBe(now.getTime() + 3_600_000);
  });
});
