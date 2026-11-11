// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevokeSessionButton } from '@/ui/revoke-session-button';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => { cleanup(); refresh.mockClear(); vi.unstubAllGlobals(); document.cookie = 'toutenun_csrf=; Max-Age=0'; });

describe('déconnexion autre appareil', () => {
  it('annulation : aucune requête de mutation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', () => false);
    render(createElement(RevokeSessionButton, { id: '17' }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Déconnecter cet autre appareil' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('Origin navigateur et CSRF : mise à jour seulement après succès serveur', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token';
    vi.stubGlobal('confirm', () => true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    render(createElement(RevokeSessionButton, { id: '17' }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Déconnecter cet autre appareil' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/sessions/17/revoke');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'same-origin',
      headers: { 'x-csrf-token': 'valid-test-token' } });
  });
  it('échec réseau : erreur visible et aucun rafraîchissement trompeur', async () => {
    vi.stubGlobal('confirm', () => true);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('hors ligne')));
    render(createElement(RevokeSessionButton, { id: '17' }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Déconnecter cet autre appareil' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
