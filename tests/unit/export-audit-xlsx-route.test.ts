import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
vi.mock('@/modules/audit/export-audit-xlsx', () => ({
  exportShopAuditXlsx: vi.fn(async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
}));
const { GET } = await import('@/app/api/shops/[shopId]/audit/export/xlsx/route');
const { exportShopAuditXlsx } = await import('@/modules/audit/export-audit-xlsx');
afterEach(() => vi.clearAllMocks());
const params = { params: Promise.resolve({ shopId: '7' }) };

describe('route Excel journal', () => {
  it('transmet boutique, session et filtres au service autorisé et interdit le cache', async () => {
    const r = await GET(new NextRequest('https://app.example.com/api/shops/7/audit/export/xlsx?q=%3Dcmd&module=shops&actorId=5&from=2026-01-01&to=2026-01-02&result=failure',
      { headers: { cookie: 'toutenun_session=fixture' } }), params);
    expect(exportShopAuditXlsx).toHaveBeenCalledWith({ token: 'fixture', shopId: '7', q: '=cmd', module: 'shops', actorId: '5',
      from: '2026-01-01', to: '2026-01-02', result: 'failure' });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(r.headers.get('content-disposition')).toContain('journal-boutique.xlsx');
    expect(r.headers.get('cache-control')).toBe('no-store'); expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await r.arrayBuffer())[0]).toBe(0x50);
  });
  it.each([[new ForbiddenError(), 403], [new ValidationError('Filtres invalides.'), 400], [new Error('secret'), 503]])(
    'ne livre pas de fichier en cas d’erreur', async (error, status) => {
      vi.mocked(exportShopAuditXlsx).mockRejectedValueOnce(error);
      const r = await GET(new NextRequest('https://app.example.com/api/shops/7/audit/export/xlsx'), params);
      expect(r.status).toBe(status); expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('content-type')).toContain('application/json'); expect(await r.text()).not.toContain('secret');
    });
  it('refuse un filtre de résultat invalide avant le service', async () => {
    const r = await GET(new NextRequest('https://app.example.com/api/shops/7/audit/export/xlsx?result=other'), params);
    expect(r.status).toBe(400); expect(exportShopAuditXlsx).not.toHaveBeenCalled();
  });
});
