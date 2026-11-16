import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/modules/identity/directory-access', () => ({
  manageDirectoryAccess: vi.fn(async (input: object) => ({ ...input, changed: true })),
}));
const { PUT } = await import('@/app/api/admin/users/[id]/directory-access/route');
const { manageDirectoryAccess } = await import('@/modules/identity/directory-access');
const previous = process.env.APP_URL, token = 'a'.repeat(43), params = Promise.resolve({ id: '2' });
afterEach(() => { if (previous) process.env.APP_URL = previous; else delete process.env.APP_URL; vi.clearAllMocks(); });
function request(body: string, origin = 'https://app.example.com', csrf = token) {
  return new NextRequest('https://app.example.com/api/admin/users/2/directory-access', { method: 'PUT',
    headers: { origin, cookie: `toutenun_csrf=${token}; toutenun_session=${token}`, 'x-csrf-token': csrf }, body });
}
describe('route accès individuel annuaire', () => {
  it('refuse origine, CSRF et corps incorrect avant mutation', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const body = '{"expected":false,"granted":true}';
    expect((await PUT(request(body, 'https://evil.example'), { params })).status).toBe(403);
    expect((await PUT(request(body, 'https://app.example.com', 'b'.repeat(43)), { params })).status).toBe(403);
    for (const invalid of ['{', '{}', '[]', '{"expected":false,"granted":true,"extra":1}'])
      expect((await PUT(request(invalid), { params })).status).toBe(400);
    expect(manageDirectoryAccess).not.toHaveBeenCalled();
  });
  it('transmet session et état prévu, sans cache', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const response = await PUT(request('{"expected":false,"granted":true}'), { params });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(manageDirectoryAccess).toHaveBeenCalledWith({ id: '2', token, expected: false, granted: true });
  });
});
