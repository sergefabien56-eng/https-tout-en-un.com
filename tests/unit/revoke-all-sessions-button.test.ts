// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevokeAllSessionsButton } from '@/ui/revoke-all-sessions-button';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => { cleanup(); refresh.mockClear(); vi.unstubAllGlobals(); document.cookie = 'toutenun_csrf=; Max-Age=0'; });

describe('déconnexion groupée des autres appareils', () => {
  it('annulation : aucune requête, session courante explicitement préservée', async () => {
    const fetchMock = vi.fn(); const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('fetch', fetchMock); vi.stubGlobal('confirm', confirm);
    render(createElement(RevokeAllSessionsButton));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Déconnecter tous les autres appareils' }));
    expect(confirm.mock.calls[0]?.[0]).toContain('Votre appareil actuel restera connecté');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('CSRF puis POST : rafraîchissement seulement après réponse réussie', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token';
    vi.stubGlobal('confirm', () => true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    render(createElement(RevokeAllSessionsButton));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Déconnecter tous les autres appareils' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/sessions/revoke-others');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'same-origin',
      headers: { 'x-csrf-token': 'valid-test-token' } });
  });
  it('échec : erreur visible sans prétendre déconnecter', async () => {
    vi.stubGlobal('confirm', () => true);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('hors ligne')));
    render(createElement(RevokeAllSessionsButton));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Déconnecter tous les autres appareils' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
