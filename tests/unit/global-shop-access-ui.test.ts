// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GrantGlobalShopAccessForm } from '@/ui/grant-global-shop-access-form';
import { RevokeShopAccessButton } from '@/ui/revoke-shop-access-button';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => { cleanup(); refresh.mockClear(); vi.unstubAllGlobals(); document.cookie = 'toutenun_csrf=; Max-Age=0'; });

describe('accès d’un compte à rôle global — composants', () => {
  it('attribue la boutique choisie, avec confirmation et jeton CSRF', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token';
    vi.stubGlobal('confirm', () => true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    render(createElement(GrantGlobalShopAccessForm, { userId: '2', shops: [
      { id: '1', displayName: 'Abidjan' }, { id: '2', displayName: 'Dakar' },
    ] }));
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Boutique à autoriser'), '2');
    await user.click(screen.getByRole('button', { name: 'Autoriser cette boutique' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/admin/users/2/shop-access');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'same-origin',
      headers: { 'x-csrf-token': 'valid-test-token' }, body: JSON.stringify({ shopId: '2' }) });
  });
  it('annuler une révocation ne déclenche aucune mutation', async () => {
    vi.stubGlobal('confirm', () => false);
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(createElement(RevokeShopAccessButton, { userId: '2', shopId: '1', shopLabel: 'Abidjan', globalRole: true }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Révoquer cet accès lié au rôle global' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('une révocation réussie déclenche DELETE puis rafraîchissement', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token'; vi.stubGlobal('confirm', () => true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetchMock);
    render(createElement(RevokeShopAccessButton, { userId: '2', shopId: '1', shopLabel: 'Abidjan', globalRole: true }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Révoquer cet accès lié au rôle global' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'DELETE', headers: { 'x-csrf-token': 'valid-test-token' }, body: JSON.stringify({ shopId: '1' }) });
  });
  it('échec serveur : erreur visible, sans rafraîchir', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token'; vi.stubGlobal('confirm', () => true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false }));
    render(createElement(GrantGlobalShopAccessForm, { userId: '2', shops: [{ id: '1', displayName: 'Abidjan' }] }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Autoriser cette boutique' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
