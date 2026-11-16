import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/modules/identity/update-role-permission', () => ({
  updateRolePermission: vi.fn(async (input: object) => ({ ...input, changed: true })),
}));
const { PUT } = await import('@/app/api/admin/roles/permission/route');
const { updateRolePermission } = await import('@/modules/identity/update-role-permission');
const previous = process.env.APP_URL, token = 'a'.repeat(43);
afterEach(() => { if (previous) process.env.APP_URL = previous; else delete process.env.APP_URL; vi.clearAllMocks(); });
function req(body: string, origin = 'https://app.example.com', csrf = token) {
  return new NextRequest('https://app.example.com/api/admin/roles/permission', { method: 'PUT',
    headers: { origin, cookie: `toutenun_csrf=${token}; toutenun_session=${token}`, 'x-csrf-token': csrf, 'content-type': 'application/json' }, body });
}
describe('route édition matrice', () => {
  it('refuse origine étrangère, CSRF et schéma incorrect avant le service', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const body = '{"roleCode":"assistant","permissionCode":"system:manage","expected":false,"granted":true}';
    expect((await PUT(req(body, 'https://evil.example'))).status).toBe(403);
    expect((await PUT(req(body, 'https://app.example.com', 'b'.repeat(43)))).status).toBe(403);
    for (const invalid of ['{', '[]', '{}', '{"roleCode":"assistant","permissionCode":"system:manage","expected":false,"granted":true,"other":1}'])
      expect((await PUT(req(invalid))).status).toBe(400);
    expect(updateRolePermission).not.toHaveBeenCalled();
  });
  it('transmet la session et exige une réponse sans cache', async () => {
    process.env.APP_URL = 'https://app.example.com';
    const body = '{"roleCode":"assistant","permissionCode":"system:manage","expected":false,"granted":true}';
    const response = await PUT(req(body));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(updateRolePermission).toHaveBeenCalledWith({ token, roleCode: 'assistant', permissionCode: 'system:manage', expected: false, granted: true });
  });
});
