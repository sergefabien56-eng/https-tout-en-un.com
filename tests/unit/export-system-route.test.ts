import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AppError, ForbiddenError } from '@/core/errors/app-error';
vi.mock('@/modules/monitoring/export-system', () => ({
  exportSystemCsv: vi.fn(async () => '\uFEFF"Système"'),
  exportSystemXlsx: vi.fn(async () => new Uint8Array([0x50, 0x4b])),
}));
vi.mock('@/modules/monitoring/export-system-pdf', () => ({
  exportSystemPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
}));
const { GET: csv } = await import('@/app/api/admin/system/export/route');
const { GET: xlsx } = await import('@/app/api/admin/system/export/xlsx/route');
const { GET: pdf } = await import('@/app/api/admin/system/export/pdf/route');
const { exportSystemCsv, exportSystemXlsx } = await import('@/modules/monitoring/export-system');
const { exportSystemPdf } = await import('@/modules/monitoring/export-system-pdf');
afterEach(() => vi.clearAllMocks());
const req = () => new NextRequest('https://example.invalid/api/admin/system/export', { headers: { cookie: 'toutenun_session=fixture' } });
describe('routes export Système', () => {
  it.each([[csv, exportSystemCsv, 'csv', 'text/csv'], [xlsx, exportSystemXlsx, 'xlsx', 'spreadsheetml.sheet'], [pdf, exportSystemPdf, 'pdf', 'application/pdf']] as const)('sert le fichier %s uniquement avec le service autorisé', async (get, service, ext, mime) => {
      const response = await get(req()); expect(service).toHaveBeenCalledWith('fixture');
      expect(response.status).toBe(200); expect(response.headers.get('content-type')).toContain(mime);
      expect(response.headers.get('content-disposition')).toContain(`systeme-instantane.${ext}`);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    });
  it.each([[csv, exportSystemCsv], [xlsx, exportSystemXlsx], [pdf, exportSystemPdf]] as const)('masque les erreurs internes et refuse les accès non autorisés', async (get, service) => {
      for (const [error, status] of [[new ForbiddenError(), 403], [new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' }), 401], [new Error('SECRET_INTERNE'), 503]] as const) {
        vi.mocked(service).mockRejectedValueOnce(error); const response = await get(req());
        expect(response.status).toBe(status); expect(response.headers.get('cache-control')).toBe('no-store');
        expect(response.headers.get('content-type')).toContain('application/json'); expect(await response.text()).not.toContain('SECRET_INTERNE');
      }
    });
});
