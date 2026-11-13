import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/modules/identity/shop-access', () => ({
  grantGlobalRoleShopAccess: vi.fn(async () => ({ granted: true, changed: true })),
  revokeShopAccess: vi.fn(async () => ({ revoked: true, changed: true })),
}));
const { POST, DELETE } = await import('@/app/api/admin/users/[id]/shop-access/route');
const { grantGlobalRoleShopAccess } = await import('@/modules/identity/shop-access');
const priorUrl = process.env.APP_URL;
afterEach(() => { if (priorUrl) process.env.APP_URL = priorUrl; else delete process.env.APP_URL; vi.clearAllMocks(); });
const params = { params: Promise.resolve({ id: '2' }) };
const token = 'a'.repeat(43);
function request(method: string, body: unknown, origin = 'https://app.example.com', csrf = token): NextRequest {
  return new NextRequest('https://app.example.com/api/admin/users/2/shop-access', {
    method, headers: { origin, 'content-type': 'application/json', cookie: `toutenun_csrf=${token}; toutenun_session=${token}`, 'x-csrf-token': csrf },
    body: JSON.stringify(body),
  });
}
describe('route accès boutique — Origin, CSRF, corps strict et no-store', () => {
  it('refuse origine étrangère et CSRF absent ou erroné avant mutation', async () => {
    process.env.APP_URL = 'https://app.example.com';
    expect((await POST(request('POST', { shopId: '1' }, 'https://evil.example'), params)).status).toBe(403);
    expect((await POST(request('POST', { shopId: '1' }, 'https://app.example.com', 'b'.repeat(43)), params)).status).toBe(403);
    expect((await DELETE(request('DELETE', { shopId: '1' }, 'https://evil.example'), params)).status).toBe(403);
    expect(grantGlobalRoleShopAccess).not.toHaveBeenCalled();
  });
  it('rejette les paramètres supplémentaires ou mal typés ; ne transmet que la boutique', async () => {
    process.env.APP_URL = 'https://app.example.com';
    expect((await POST(request('POST', { shopId: '1', role: 'owner' }), params)).status).toBe(400);
    expect((await POST(request('POST', { shopId: 1 }), params)).status).toBe(400);
    expect(grantGlobalRoleShopAccess).not.toHaveBeenCalled();
    const result = await POST(request('POST', { shopId: '1' }), params);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(grantGlobalRoleShopAccess).toHaveBeenCalledWith({ token, userId: '2', shopId: '1' });
  });
});
