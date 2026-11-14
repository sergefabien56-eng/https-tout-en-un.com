import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
vi.mock('@/modules/identity/export-shops-xlsx', () => ({
  exportOwnShopsXlsx: vi.fn(async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
}));
const { GET } = await import('@/app/api/shops/export/xlsx/route');
const { exportOwnShopsXlsx } = await import('@/modules/identity/export-shops-xlsx');
afterEach(() => vi.clearAllMocks());

describe('route Excel boutiques', () => {
  it('transmet session et filtres au service autorisé et interdit le cache', async () => {
    const r = await GET(new NextRequest('https://app.example.com/api/shops/export/xlsx?q=%3Dcmd&status=&sort=name-asc',
      { headers: { cookie: 'toutenun_session=fixture' } }));
    expect(exportOwnShopsXlsx).toHaveBeenCalledWith('fixture', { q: '=cmd', status: '', sort: 'name-asc' });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(r.headers.get('content-disposition')).toContain('boutiques.xlsx');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await r.arrayBuffer())[0]).toBe(0x50);
  });
  it.each([[new ForbiddenError(), 403], [new ValidationError('Filtres invalides.'), 400], [new Error('secret'), 503]])(
    'ne livre pas de fichier en cas d’erreur', async (error, status) => {
    vi.mocked(exportOwnShopsXlsx).mockRejectedValueOnce(error);
    const r = await GET(new NextRequest('https://app.example.com/api/shops/export/xlsx'));
    expect(r.status).toBe(status); expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('content-type')).toContain('application/json');
    expect(await r.text()).not.toContain('secret');
  });
});
