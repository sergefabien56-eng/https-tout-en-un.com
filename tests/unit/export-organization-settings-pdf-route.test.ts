import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';

vi.mock('@/modules/identity/export-organization-settings-pdf', () => ({
  exportOrganizationSettingsPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
}));
const { GET } = await import('@/app/api/admin/settings/export/pdf/route');
const { exportOrganizationSettingsPdf } = await import('@/modules/identity/export-organization-settings-pdf');
afterEach(() => vi.clearAllMocks());
const request = () => new NextRequest('https://app.example.com/api/admin/settings/export/pdf', {
  headers: { cookie: 'toutenun_session=fixture' },
});

describe('route PDF paramètres', () => {
  it('utilise la session et renvoie un fichier PDF sans cache', async () => {
    const response = await GET(request());
    expect(exportOrganizationSettingsPdf).toHaveBeenCalledWith('fixture');
    expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('parametres-organisation.pdf');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await response.arrayBuffer())[0]).toBe(0x25);
  });
  it.each([[new ForbiddenError(), 403], [new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' }), 401],
    [new ValidationError('PDF illisible.'), 400], [new Error('SECRET_INTERNE'), 503]])(
    'refuse sans produire de fichier ni divulguer les erreurs internes', async (error, status) => {
      vi.mocked(exportOrganizationSettingsPdf).mockRejectedValueOnce(error);
      const response = await GET(request());
      expect(response.status).toBe(status); expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(await response.text()).not.toContain('SECRET_INTERNE');
    });
});
