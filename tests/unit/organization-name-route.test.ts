import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/modules/identity/organization-name', () => ({
  updateOrganizationName: vi.fn(async (_token: string, name: string) => ({ name })),
}));
const { PUT } = await import('@/app/api/admin/settings/organization-name/route');
const { updateOrganizationName } = await import('@/modules/identity/organization-name');
const previousUrl = process.env.APP_URL;
const token = 'a'.repeat(43);
afterEach(() => { if (previousUrl) process.env.APP_URL = previousUrl; else delete process.env.APP_URL; vi.clearAllMocks(); });
function request(body: string, origin = 'https://app.example.com', csrf = token): NextRequest {
  return new NextRequest('https://app.example.com/api/admin/settings/organization-name', {
    method: 'PUT', headers: { origin, 'content-type': 'application/json',
      cookie: `toutenun_csrf=${token}; toutenun_session=${token}`, 'x-csrf-token': csrf }, body,
  });
}
describe('route nom de l’organisation', () => {
  it('refuse une origine étrangère ou un CSRF incorrect sans modifier', async () => {
    process.env.APP_URL = 'https://app.example.com';
    expect((await PUT(request('{"name":"Test"}', 'https://evil.example'))).status).toBe(403);
    expect((await PUT(request('{"name":"Test"}', 'https://app.example.com', 'b'.repeat(43)))).status).toBe(403);
    expect(updateOrganizationName).not.toHaveBeenCalled();
  });
  it('refuse un JSON incorrect ou un corps avec propriétés inattendues', async () => {
    process.env.APP_URL = 'https://app.example.com';
    for (const body of ['{', '[]', '{}', '{"name":"Test","role":"owner"}'])
      expect((await PUT(request(body))).status).toBe(400);
    expect(updateOrganizationName).not.toHaveBeenCalled();
  });
  it('transmet la session et le nom, avec une réponse non mise en cache', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const response = await PUT(request('{"name":"Test"}'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ name: 'Test' });
    expect(updateOrganizationName).toHaveBeenCalledWith(token, 'Test');
  });
});
