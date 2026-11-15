import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { formatRoleMatrixPdf } from '@/modules/identity/export-role-matrix-pdf';
import type { RoleMatrix } from '@/modules/identity/role-matrix';

const date = '2026-11-15T10:00:00.000Z';
const fixture: RoleMatrix = {
  roles: [{ code: 'owner', label: 'Propriétaire', isSystem: true }, { code: 'assistant', label: 'Assistant', isSystem: true }],
  permissions: [
    { module: '=cmd', code: '+1', label: '@x' },
    { module: 'users', code: 'users:read', label: 'Consulter les utilisateurs' },
  ], grants: { owner: ['+1', 'users:read'], assistant: [] },
};

describe('export PDF de la matrice des rôles', () => {
  it('produit un PDF relisible avec périmètre et titre', async () => {
    const bytes = await formatRoleMatrixPdf(fixture, date);
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe('Rôles et permissions');
    expect(pdf.getSubject()).toContain('instantané');
  });
  it('pagine les rôles et permissions sans les tronquer', async () => {
    const matrix: RoleMatrix = {
      roles: Array.from({ length: 7 }, (_, n) => ({ code: `role${n}`, label: `Rôle ${n}`, isSystem: true })),
      permissions: Array.from({ length: 90 }, (_, n) => ({ module: 'module', code: `permission:${n}`, label: `Permission ${n}` })),
      grants: {},
    };
    const pdf = await PDFDocument.load(await formatRoleMatrixPdf(matrix, date));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4);
  });
  it('accepte une matrice vide mais borne la taille et refuse les libellés illisibles', async () => {
    expect((await PDFDocument.load(await formatRoleMatrixPdf({ roles: [], permissions: [], grants: {} }, date))).getPageCount()).toBe(1);
    const many = { ...fixture, roles: Array.from({ length: 21 }, (_, n) => ({ code: `${n}`, label: 'Rôle', isSystem: true })) };
    await expect(formatRoleMatrixPdf(many, date)).rejects.toThrow('trop volumineuse');
    await expect(formatRoleMatrixPdf({ ...fixture, permissions: Array.from({ length: 501 }, () => fixture.permissions[0]!) }, date))
      .rejects.toThrow('trop volumineuse');
    for (const label of ['a'.repeat(161), 'Action\u0001invisible', 'Chariot 🛒']) {
      await expect(formatRoleMatrixPdf({ ...fixture, permissions: [{ code: 'x', module: 'x', label }] }, date)).rejects.toThrow();
    }
  });
});
