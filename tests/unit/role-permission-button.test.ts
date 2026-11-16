// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RolePermissionButton } from '@/ui/role-permission-button';
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const props = { roleCode: 'assistant', roleLabel: 'Assistant', permissionCode: 'system:manage', permissionLabel: 'Accéder au Système', granted: false };
afterEach(() => { cleanup(); refresh.mockClear(); vi.unstubAllGlobals(); document.cookie = 'toutenun_csrf=; Max-Age=0'; });
describe('confirmation édition matrice', () => {
  it('annuler ne fait aucune requête', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(createElement(RolePermissionButton, props));
    await userEvent.click(screen.getByRole('button'));
    expect(fetch).not.toHaveBeenCalled();
  });
  it('envoie la valeur attendue après confirmation et CSRF', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token';
    vi.stubGlobal('confirm', vi.fn(() => true));
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetch);
    render(createElement(RolePermissionButton, props));
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Modification enregistrée.')).toBeTruthy();
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT', headers: { 'x-csrf-token': 'valid-test-token' },
      body: JSON.stringify({ roleCode: 'assistant', permissionCode: 'system:manage', expected: false, granted: true }) });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
  it('un conflit rafraîchit sans afficher de succès', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token'; vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, status: 409 }));
    render(createElement(RolePermissionButton, props));
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText(/La matrice a changé/)).toBeTruthy();
    expect(screen.queryByText('Modification enregistrée.')).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
