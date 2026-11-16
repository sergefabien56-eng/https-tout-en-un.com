// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DirectoryAccessButton } from '@/ui/directory-access-button';
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => { cleanup(); refresh.mockClear(); vi.unstubAllGlobals(); document.cookie = 'toutenun_csrf=; Max-Age=0'; });
describe('bouton accès individuel', () => {
  it('annuler la confirmation ne fait aucune requête', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false)); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(createElement(DirectoryAccessButton, { userId: '2', granted: false }));
    await userEvent.click(screen.getByRole('button', { name: 'Autoriser l’accès individuel' }));
    expect(fetch).not.toHaveBeenCalled();
  });
  it('envoie la décision ciblée après confirmation et CSRF', async () => {
    document.cookie = 'toutenun_csrf=test-token'; vi.stubGlobal('confirm', vi.fn(() => true));
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetch);
    render(createElement(DirectoryAccessButton, { userId: '2', granted: false }));
    await userEvent.click(screen.getByRole('button', { name: 'Autoriser l’accès individuel' }));
    expect(await screen.findByText('Accès mis à jour.')).toBeTruthy();
    expect(fetch.mock.calls[1]?.[0]).toBe('/api/admin/users/2/directory-access');
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT', headers: { 'x-csrf-token': 'test-token' },
      body: JSON.stringify({ expected: false, granted: true }) });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
  it('un conflit ne s’affiche jamais comme un succès', async () => {
    document.cookie = 'toutenun_csrf=test-token'; vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, status: 409 }));
    render(createElement(DirectoryAccessButton, { userId: '2', granted: false }));
    await userEvent.click(screen.getByRole('button', { name: 'Autoriser l’accès individuel' }));
    expect(await screen.findByText(/L’accès a changé/)).toBeTruthy();
    expect(screen.queryByText('Accès mis à jour.')).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
