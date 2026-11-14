import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { ForbiddenError } from '@/core/errors/app-error';

vi.mock('@/modules/identity/export-role-matrix-xlsx', () => ({
  exportRoleMatrixXlsx: vi.fn(async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
}));
const { GET } = await import('@/app/api/admin/roles/export/xlsx/route');
const { exportRoleMatrixXlsx } = await import('@/modules/identity/export-role-matrix-xlsx');
afterEach(() => vi.clearAllMocks());

describe('route export Excel rôles', () => {
  it('retourne le fichier uniquement depuis le service autorisé, sans cache', async () => {
    const request = new NextRequest('https://app.example.com/api/admin/roles/export/xlsx', {
      headers: { cookie: 'toutenun_session=fixture' },
    });
    const response = await GET(request);
    expect(exportRoleMatrixXlsx).toHaveBeenCalledWith('fixture');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers.get('content-disposition')).toContain('roles-permissions.xlsx');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await response.arrayBuffer())[0]).toBe(0x50);
  });
  it('renvoie 403 et jamais un fichier en cas de refus', async () => {
    vi.mocked(exportRoleMatrixXlsx).mockRejectedValueOnce(new ForbiddenError());
    const response = await GET(new NextRequest('https://app.example.com/api/admin/roles/export/xlsx'));
    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
