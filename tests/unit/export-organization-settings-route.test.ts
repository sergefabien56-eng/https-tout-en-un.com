import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError, ForbiddenError } from '@/core/errors/app-error';

vi.mock('@/modules/identity/export-organization-settings', () => ({
  exportOrganizationSettingsCsv: vi.fn(async () => '\uFEFF"Paramètre","Valeur"\r\n'),
}));
vi.mock('@/modules/identity/export-organization-settings-xlsx', () => ({
  exportOrganizationSettingsXlsx: vi.fn(async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
}));
const { GET: csvGet } = await import('@/app/api/admin/settings/export/route');
const { GET: xlsxGet } = await import('@/app/api/admin/settings/export/xlsx/route');
const { exportOrganizationSettingsCsv } = await import('@/modules/identity/export-organization-settings');
const { exportOrganizationSettingsXlsx } = await import('@/modules/identity/export-organization-settings-xlsx');
afterEach(() => vi.clearAllMocks());
const request = (path: string) => new NextRequest(`https://app.example.com${path}`, {
  headers: { cookie: 'toutenun_session=fixture' },
});

describe('routes exports paramètres', () => {
  it('CSV : utilise le service autorisé et les en-têtes de téléchargement', async () => {
    const response = await csvGet(request('/api/admin/settings/export'));
    expect(exportOrganizationSettingsCsv).toHaveBeenCalledWith('fixture');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('parametres-organisation.csv');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('Excel : utilise le service autorisé et les en-têtes de téléchargement', async () => {
    const response = await xlsxGet(request('/api/admin/settings/export/xlsx'));
    expect(exportOrganizationSettingsXlsx).toHaveBeenCalledWith('fixture');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('spreadsheetml.sheet');
    expect(response.headers.get('content-disposition')).toContain('parametres-organisation.xlsx');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(new Uint8Array(await response.arrayBuffer())[0]).toBe(0x50);
  });
  it('refuse sans produire de fichier, sans fuite des erreurs internes', async () => {
    vi.mocked(exportOrganizationSettingsCsv).mockRejectedValueOnce(new ForbiddenError());
    vi.mocked(exportOrganizationSettingsXlsx).mockRejectedValueOnce(new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' }));
    const denied = await csvGet(request('/api/admin/settings/export'));
    const anonymous = await xlsxGet(request('/api/admin/settings/export/xlsx'));
    expect(denied.status).toBe(403); expect(anonymous.status).toBe(401);
    for (const response of [denied, anonymous]) {
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    }
    vi.mocked(exportOrganizationSettingsCsv).mockRejectedValueOnce(new Error('SECRET_INTERNE'));
    const failure = await csvGet(request('/api/admin/settings/export'));
    expect(failure.status).toBe(503); expect(await failure.text()).not.toContain('SECRET_INTERNE');
  });
});
