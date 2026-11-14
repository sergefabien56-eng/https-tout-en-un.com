import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
vi.mock('@/modules/identity/export-users-xlsx', () => ({
  exportAuthorizedUsersXlsx: vi.fn(async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
}));
const { GET } = await import('@/app/api/admin/users/export/xlsx/route');
const { exportAuthorizedUsersXlsx } = await import('@/modules/identity/export-users-xlsx');
afterEach(() => vi.clearAllMocks());

describe('route Excel utilisateurs', () => {
  it('transmet session et filtres au service autorisé et interdit le cache', async () => {
    const r = await GET(new NextRequest('https://app.example.com/api/admin/users/export/xlsx?q=%3Dcmd&status=active&role=manager',
      { headers: { cookie: 'toutenun_session=fixture' } }));
    expect(exportAuthorizedUsersXlsx).toHaveBeenCalledWith('fixture', '=cmd', 'active', 'manager');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(r.headers.get('content-disposition')).toContain('utilisateurs.xlsx');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await r.arrayBuffer())[0]).toBe(0x50);
  });
  it.each([[new ForbiddenError(), 403], [new ValidationError('Filtres invalides.'), 400], [new Error('secret'), 503]])(
    'ne livre pas de fichier en cas d’erreur', async (error, status) => {
      vi.mocked(exportAuthorizedUsersXlsx).mockRejectedValueOnce(error);
      const r = await GET(new NextRequest('https://app.example.com/api/admin/users/export/xlsx'));
      expect(r.status).toBe(status); expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('content-type')).toContain('application/json');
      expect(await r.text()).not.toContain('secret');
    });
});
