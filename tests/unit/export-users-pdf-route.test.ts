import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';

vi.mock('@/modules/identity/export-users-pdf', () => ({
  exportAuthorizedUsersPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
}));
const { GET } = await import('@/app/api/admin/users/export/pdf/route');
const { exportAuthorizedUsersPdf } = await import('@/modules/identity/export-users-pdf');
afterEach(() => vi.clearAllMocks());
describe('route PDF utilisateurs', () => {
  it('transmet session et filtres, renvoie une pièce jointe sans cache', async () => {
    const response = await GET(new NextRequest('https://example.test/api/admin/users/export/pdf?q=nom&status=active&role=manager', {
      headers: { cookie: 'toutenun_session=fixture' },
    }));
    expect(exportAuthorizedUsersPdf).toHaveBeenCalledWith('fixture', 'nom', 'active', 'manager');
    expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('utilisateurs.pdf');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('utilise les valeurs de filtres par défaut et refuse sans émettre de PDF', async () => {
    vi.mocked(exportAuthorizedUsersPdf).mockRejectedValueOnce(new ForbiddenError());
    const denied = await GET(new NextRequest('https://example.test/api/admin/users/export/pdf'));
    expect(exportAuthorizedUsersPdf).toHaveBeenCalledWith(undefined, '', 'all', 'all');
    expect(denied.status).toBe(403); expect(denied.headers.get('content-type')).toContain('application/json');
    vi.mocked(exportAuthorizedUsersPdf).mockRejectedValueOnce(new ValidationError('Filtre invalide.'));
    expect((await GET(new NextRequest('https://example.test/api/admin/users/export/pdf?status=invalid'))).status).toBe(400);
    vi.mocked(exportAuthorizedUsersPdf).mockRejectedValueOnce(new Error('SECRET_INTERNE'));
    const failure = await GET(new NextRequest('https://example.test/api/admin/users/export/pdf'));
    expect(failure.status).toBe(503); expect(await failure.text()).not.toContain('SECRET_INTERNE');
  });
});
