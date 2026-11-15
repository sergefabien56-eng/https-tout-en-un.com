import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ForbiddenError } from '@/core/errors/app-error';

vi.mock('@/modules/identity/export-role-matrix-pdf', () => ({
  exportRoleMatrixPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
}));
const { GET } = await import('@/app/api/admin/roles/export/pdf/route');
const { exportRoleMatrixPdf } = await import('@/modules/identity/export-role-matrix-pdf');
afterEach(() => vi.clearAllMocks());
describe('route export PDF des rôles', () => {
  it('répond en pièce jointe via le service autorisé, sans cache', async () => {
    const request = new NextRequest('https://app.example.com/api/admin/roles/export/pdf', {
      headers: { cookie: 'toutenun_session=fixture' },
    });
    const response = await GET(request);
    expect(exportRoleMatrixPdf).toHaveBeenCalledWith('fixture');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('roles-permissions.pdf');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await response.arrayBuffer())[0]).toBe(0x25);
  });
  it('refuse sans envoyer le fichier et ne révèle pas les erreurs internes', async () => {
    vi.mocked(exportRoleMatrixPdf).mockRejectedValueOnce(new ForbiddenError());
    const denied = await GET(new NextRequest('https://app.example.com/api/admin/roles/export/pdf'));
    expect(denied.status).toBe(403); expect(denied.headers.get('content-type')).toContain('application/json');
    expect(denied.headers.get('cache-control')).toBe('no-store');
    vi.mocked(exportRoleMatrixPdf).mockRejectedValueOnce(new Error('SECRET_INTERNE'));
    const failure = await GET(new NextRequest('https://app.example.com/api/admin/roles/export/pdf'));
    expect(failure.status).toBe(503); expect(await failure.text()).not.toContain('SECRET_INTERNE');
  });
});
