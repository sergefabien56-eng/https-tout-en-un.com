// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationNameForm } from '@/ui/organization-name-form';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => { cleanup(); refresh.mockClear(); vi.unstubAllGlobals(); document.cookie = 'toutenun_csrf=; Max-Age=0'; });

describe('formulaire du nom de l’organisation', () => {
  it('envoie avec CSRF et affiche le nom renvoyé par le serveur', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token';
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'Organisation test' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(createElement(OrganizationNameForm, { current: null }));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nom de l’organisation'), 'Organisation test');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le nom' }));
    expect(await screen.findByText('Nom enregistré.')).toBeTruthy();
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/admin/settings/organization-name');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT', credentials: 'same-origin',
      headers: { 'x-csrf-token': 'valid-test-token' }, body: JSON.stringify({ name: 'Organisation test' }) });
  });
  it('ne signale pas un succès et ne rafraîchit pas si le serveur refuse', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false }));
    render(createElement(OrganizationNameForm, { current: null }));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nom de l’organisation'), 'Organisation');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le nom' }));
    expect(await screen.findByText(/Enregistrement impossible/)).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
