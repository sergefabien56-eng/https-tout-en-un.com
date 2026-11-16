import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/modules/identity/organization-currency', () => ({
  updateOrganizationCurrency: vi.fn(async (_token: string, currency: string) => ({ currency })),
}));
const { PUT } = await import('@/app/api/admin/settings/reference-currency/route');
const { updateOrganizationCurrency } = await import('@/modules/identity/organization-currency');
const previousUrl = process.env.APP_URL;
const token = 'a'.repeat(43);
afterEach(() => { if (previousUrl) process.env.APP_URL = previousUrl; else delete process.env.APP_URL; vi.clearAllMocks(); });
function request(body: string, origin = 'https://app.example.com', csrf = token): NextRequest {
  return new NextRequest('https://app.example.com/api/admin/settings/reference-currency', {
    method: 'PUT', headers: { origin, 'content-type': 'application/json',
      cookie: `toutenun_csrf=${token}; toutenun_session=${token}`, 'x-csrf-token': csrf }, body,
  });
}
describe('route devise de référence', () => {
  it('refuse une origine étrangère ou un CSRF incorrect sans modifier', async () => {
    process.env.APP_URL = 'https://app.example.com';
    expect((await PUT(request('{"currency":"XOF"}', 'https://evil.example'))).status).toBe(403);
    expect((await PUT(request('{"currency":"XOF"}', 'https://app.example.com', 'b'.repeat(43)))).status).toBe(403);
    expect(updateOrganizationCurrency).not.toHaveBeenCalled();
  });
  it('refuse un JSON incorrect ou un corps avec propriétés inattendues', async () => {
    process.env.APP_URL = 'https://app.example.com';
    for (const body of ['{', '[]', '{}', '{"currency":"XOF","role":"owner"}'])
      expect((await PUT(request(body))).status).toBe(400);
    expect(updateOrganizationCurrency).not.toHaveBeenCalled();
  });
  it('transmet la session et la devise, avec une réponse non mise en cache', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const response = await PUT(request('{"currency":"XOF"}'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ currency: 'XOF' });
    expect(updateOrganizationCurrency).toHaveBeenCalledWith(token, 'XOF');
  });
});
