// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { AppShell } from '@/ui/app-shell';

vi.mock('next/navigation', () => ({ usePathname: () => '/espace', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const mount = (permissions = ['dashboard:read', 'system:manage', 'shops:read'], unreadNotifications = 0) =>
  render(createElement(AppShell, { userName: 'Compte réel', permissions, unreadNotifications,
    children: createElement('p', {}, 'Contenu protégé') }));

beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('coquille UI — état prêt et états indisponibles', () => {
  it('montre la page réelle et désactive les entrées non prêtes', () => {
    mount();
    expect(screen.getByRole('link', { name: /vue d'ensemble/i }).getAttribute('href')).toBe('/espace');
    const nav = within(screen.getByRole('navigation', { name: 'Modules' }));
    fireEvent.click(nav.getByRole('button', { name: 'Boutiques & Plateformes' }));
    expect(nav.getByRole('link', { name: 'Toutes les boutiques' }).getAttribute('href')).toBe('/espace/boutiques');
    const soon = nav.getByText('Connexions Jumia');
    expect(soon.closest('[aria-disabled]')?.getAttribute('aria-disabled')).toBe('true');
    expect(soon.closest('a')).toBeNull();
    expect(screen.getByText('Compte réel')).toBeTruthy();
    expect(screen.getByText('Contenu protégé')).toBeTruthy();
  });
  it('cloche : compteur réel plafonné et nom accessible sans divulgation', () => {
    mount(undefined, 100);
    expect(screen.getByRole('link', { name: 'Mes notifications : plus de 99 non lues' }).textContent).toContain('99+');
    cleanup();
    mount(undefined, 0);
    expect(screen.getByRole('link', { name: 'Mes notifications : 0 non lues' })).toBeTruthy();
    expect(screen.queryByText('99+')).toBeNull();
  });
  it('cache une entrée si la permission n’est pas accordée', () => {
    mount(['dashboard:read']);
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).queryByText('Toutes les boutiques')).toBeNull();
    expect(screen.queryByText('Système')).toBeNull();
  });
  it('Tout fermer et Tout ouvrir agissent sur plusieurs sections', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tout fermer' }));
    expect(screen.getByRole('button', { name: 'Tableau de bord' }).getAttribute('aria-expanded')).toBe('false');
    await user.click(screen.getByRole('button', { name: 'Tout ouvrir' }));
    expect(screen.getByRole('button', { name: 'Tableau de bord' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Boutiques & Plateformes' }).getAttribute('aria-expanded')).toBe('true');
  });
  it('sélecteur de barre : clavier, recherche filtrée et fermeture Échap', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      shops: [{ id: '7', displayName: 'Boutique CI', countryCode: 'CI', status: 'connected' }], nextPage: null,
    }) });
    vi.stubGlobal('fetch', fetchMock);
    mount();
    const trigger = screen.getByRole('button', { name: 'Choisir une boutique' });
    await userEvent.setup().click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Choix de boutique' });
    const search = within(dialog).getByRole('searchbox', { name: 'Rechercher parmi mes boutiques' });
    expect(document.activeElement).toBe(search);
    await userEvent.setup().type(search, 'CI');
    expect(await within(dialog).findByRole('button', { name: /Boutique CI/ })).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('q=CI'))).toBe(true);
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Choix de boutique' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it('mémorise le thème choisi', async () => {
    mount();
    await userEvent.setup().click(screen.getByRole('button', { name: /changer le thème/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('toutenun.theme')).toBe('dark');
  });
  it('le tiroir s’ouvre et Échap le ferme, avec retour du focus', () => {
    mount();
    const open = screen.getByRole('button', { name: 'Ouvrir le menu' });
    fireEvent.click(open);
    expect(open.getAttribute('aria-expanded')).toBe('true');
    const nav = screen.getByRole('navigation', { name: 'Modules' });
    expect(within(nav).getByRole('button', { name: 'Tableau de bord' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(open.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(open);
  });
  it('axe : pas de violation sérieuse/critique sur la coquille', async () => {
    const { container } = mount();
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
  });
});
