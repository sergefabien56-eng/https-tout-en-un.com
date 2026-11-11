import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as csrfGet } from '@/app/api/auth/csrf/route';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as meGet } from '@/app/api/auth/me/route';
import { GET as shopGet } from '@/app/api/shops/[shopId]/route';
import { GET as adminUsersGet } from '@/app/api/admin/users/route';
import { GET as adminUserDetailGet } from '@/app/api/admin/users/[id]/route';
import { GET as adminRolesGet } from '@/app/api/admin/roles/route';
import { GET as deepHealthGet } from '@/app/api/health/deep/route';
import { GET as sessionsGet } from '@/app/api/auth/sessions/route';
import { GET as notificationsGet } from '@/app/api/notifications/route';
import { GET as shopAuditGet } from '@/app/api/shops/[shopId]/audit/route';
import { GET as auditExportGet } from '@/app/api/shops/[shopId]/audit/export/route';
import { GET as shopsGet } from '@/app/api/shops/route';
import { POST as selectShopPost } from '@/app/api/preferences/shop/route';
import { POST as refreshPost } from '@/app/api/auth/refresh/route';
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
  it('GET espace /me sans cookie retourne 401 sans toucher à la base', async () => {
    const request = new NextRequest('https://app.example.com/api/auth/me');
    const result = await meGet(request);
    expect(result.status).toBe(401);
    expect(result.headers.get('cache-control')).toBe('no-store');
  });
  it('GET boutique sans cookie est refusé avant toute requête métier', async () => {
    const request = new NextRequest('https://app.example.com/api/shops/1');
    const result = await shopGet(request, { params: Promise.resolve({ shopId: '1' }) });
    expect(result.status).toBe(401);
  });
  it('GET utilisateurs sans session est refusé avant la lecture des données', async () => {
    const request = new NextRequest('https://app.example.com/api/admin/users');
    expect((await adminUsersGet(request)).status).toBe(401);
  });
  it('GET matrice des rôles sans session est refusé', async () => {
    const request = new NextRequest('https://app.example.com/api/admin/roles');
    expect((await adminRolesGet(request)).status).toBe(401);
  });
  it('GET santé profonde sans session refuse les informations système', async () => {
    const request = new NextRequest('https://app.example.com/api/health/deep');
    expect((await deepHealthGet(request)).status).toBe(401);
  });
  it('fiche utilisateur API : refus sans session et identifiant invalide', async () => {
    const request = new NextRequest('https://app.example.com/api/admin/users/1');
    expect((await adminUserDetailGet(request, { params: Promise.resolve({ id: '1' }) })).status).toBe(401);
    expect((await adminUserDetailGet(request, { params: Promise.resolve({ id: '1 OR 1=1' }) })).status).toBe(404);
  });
  it('GET sessions sans cookie refuse les détails de compte', async () => {
    const request = new NextRequest('https://app.example.com/api/auth/sessions');
    expect((await sessionsGet(request)).status).toBe(401);
  });
  it('POST refresh exige Origin, CSRF et session valide', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const request = new NextRequest('https://app.example.com/api/auth/refresh', { method: 'POST' });
    expect((await refreshPost(request)).status).toBe(403);
    const token = csrfGet().cookies.get('toutenun_csrf')!.value;
    const csrfOnly = new NextRequest('https://app.example.com/api/auth/refresh', { method: 'POST',
      headers: { origin: 'https://app.example.com', cookie: `toutenun_csrf=${token}`, 'x-csrf-token': token } });
    expect((await refreshPost(csrfOnly)).status).toBe(401);
  });
  it('GET audit boutique sans cookie est refusé', async () => {
    const request = new NextRequest('https://app.example.com/api/shops/1/audit');
    expect((await shopAuditGet(request, { params: Promise.resolve({ shopId: '1' }) })).status).toBe(401);
  });
  it('GET catalogue sans session refuse les boutiques', async () => {
    const request = new NextRequest('https://app.example.com/api/shops');
    expect((await shopsGet(request)).status).toBe(401);
  });
  it('POST sélection sans Origin/CSRF est refusé sans accès DB', async () => {
    const request = new NextRequest('https://app.example.com/api/preferences/shop', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ shopId: '1' }) });
    expect((await selectShopPost(request)).status).toBe(403);
  });
  it('GET export audit sans cookie est refusé', async () => {
    const request = new NextRequest('https://app.example.com/api/shops/1/audit/export');
    expect((await auditExportGet(request, { params: Promise.resolve({ shopId: '1' }) })).status).toBe(401);
  });
  it('GET notifications sans session refuse les détails du compte', async () => {
    const request = new NextRequest('https://app.example.com/api/notifications');
    expect((await notificationsGet(request)).status).toBe(401);
  });
  it('verrouillage progressif, plafonné', () => {
    const now = new Date('2026-11-10T00:00:00Z');
    expect(nextLock(4, now)).toBeNull();
    expect(nextLock(5, now)?.getTime()).toBe(now.getTime() + 30_000);
    expect(nextLock(6, now)?.getTime()).toBe(now.getTime() + 60_000);
    expect(nextLock(100, now)?.getTime()).toBe(now.getTime() + 3_600_000);
  });
});
