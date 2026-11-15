import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
vi.mock('@/modules/identity/export-shops-pdf', () => ({
  exportOwnShopsPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
}));
const { GET } = await import('@/app/api/shops/export/pdf/route');
const { exportOwnShopsPdf } = await import('@/modules/identity/export-shops-pdf');
afterEach(() => vi.clearAllMocks());

describe('route PDF boutiques', () => {
  it('transmet session et filtres au service autorisé et interdit le cache', async () => {
    const r = await GET(new NextRequest('https://app.example.com/api/shops/export/pdf?q=%3Dcmd&status=&sort=name-asc',
      { headers: { cookie: 'toutenun_session=fixture' } }));
    expect(exportOwnShopsPdf).toHaveBeenCalledWith('fixture', { q: '=cmd', status: '', sort: 'name-asc' });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/pdf');
    expect(r.headers.get('content-disposition')).toContain('boutiques.pdf');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await r.arrayBuffer())[0]).toBe(0x25);
  });
  it.each([[new ForbiddenError(), 403], [new ValidationError('Filtres invalides.'), 400], [new Error('secret'), 503]])(
    'ne livre pas de fichier en cas d’erreur', async (error, status) => {
    vi.mocked(exportOwnShopsPdf).mockRejectedValueOnce(error);
    const r = await GET(new NextRequest('https://app.example.com/api/shops/export/pdf'));
    expect(r.status).toBe(status); expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('content-type')).toContain('application/json');
    expect(await r.text()).not.toContain('secret');
  });
});
