// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationCurrencyForm } from '@/ui/organization-currency-form';
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => { cleanup(); refresh.mockClear(); vi.unstubAllGlobals(); document.cookie = 'toutenun_csrf=; Max-Age=0'; });
describe('formulaire devise de référence', () => {
  it('enregistre XOF seulement après réponse serveur, avec CSRF', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token';
    const mock = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', mock);
    render(createElement(OrganizationCurrencyForm, { current: null }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer XOF comme devise de référence' }));
    expect(await screen.findByText('Devise enregistrée.')).toBeTruthy();
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(mock.mock.calls[1]?.[0]).toBe('/api/admin/settings/reference-currency');
    expect(mock.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT', credentials: 'same-origin',
      headers: { 'x-csrf-token': 'valid-test-token' }, body: JSON.stringify({ currency: 'XOF' }) });
  });
  it('ne signale pas un succès si le serveur refuse', async () => {
    document.cookie = 'toutenun_csrf=valid-test-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false }));
    render(createElement(OrganizationCurrencyForm, { current: null }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer XOF comme devise de référence' }));
    expect(await screen.findByText(/Enregistrement impossible/)).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
  it('ne propose aucune écriture lorsque XOF est déjà enregistré', () => {
    render(createElement(OrganizationCurrencyForm, { current: 'XOF' }));
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
