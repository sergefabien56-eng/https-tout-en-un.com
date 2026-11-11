// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { AppShell } from '@/ui/app-shell';

vi.mock('next/navigation', () => ({ usePathname: () => '/espace', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const mount = (permissions = ['dashboard:read', 'system:manage', 'shops:read'], unreadNotifications = 0,
  globalPermissions?: string[]) =>
  render(createElement(AppShell, { userName: 'Compte réel', permissions,
    ...(globalPermissions === undefined ? {} : { globalPermissions }), unreadNotifications,
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
  it('actions rapides : destinations réelles, droits globaux et accès audit de boutique vérifié', async () => {
    render(createElement(AppShell, { userName: 'Propriétaire', selectedShop: 'Boutique CI',
      auditShopAccess: true, permissions: ['dashboard:read', 'shops:read', 'audit:read', 'users:read', 'users:write'],
      globalPermissions: ['users:read', 'users:write'], unreadNotifications: 0,
      children: createElement('p', {}, 'Espace') }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Actions rapides' }));
    const panel = within(screen.getByRole('navigation', { name: 'Actions rapides' }));
    expect(panel.getAllByRole('link')).toHaveLength(6);
    expect(panel.getByRole('link', { name: 'Journal de la boutique sélectionnée' }).getAttribute('href'))
      .toBe('/espace/journal');
    expect(panel.getByRole('link', { name: 'Utilisateurs' }).getAttribute('href')).toBe('/espace/utilisateurs');
    expect(panel.getByText('Inviter un utilisateur · bientôt').closest('a')).toBeNull();
    expect(panel.getByText('Inviter un utilisateur · bientôt').getAttribute('aria-disabled')).toBe('true');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions rapides' }).parentElement!, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Actions rapides' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Actions rapides' }));
  });
  it('actions rapides : ne propose aucun lien vers les données hors droits', async () => {
    render(createElement(AppShell, { userName: 'Compte restreint', permissions: ['audit:read'],
      globalPermissions: [], auditShopAccess: false, unreadNotifications: 0,
      children: createElement('p', {}, 'Espace') }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Actions rapides' }));
    const panel = within(screen.getByRole('navigation', { name: 'Actions rapides' }));
    expect(panel.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/espace/sessions']);
    expect(panel.getByText('Journal · sélectionner une boutique').closest('a')).toBeNull();
    expect(panel.queryByText('Utilisateurs')).toBeNull();
    expect(panel.queryByText('Mes boutiques')).toBeNull();
    expect(panel.queryByText('Inviter un utilisateur · bientôt')).toBeNull();
  });
  it('cloche : compteur réel plafonné et nom accessible sans divulgation', () => {
    mount(undefined, 100);
    expect(screen.getByRole('link', { name: 'Mes notifications : plus de 99 non lues' }).textContent).toContain('99+');
    cleanup();
    mount(undefined, 0);
    expect(screen.getByRole('link', { name: 'Mes notifications : 0 non lues' })).toBeTruthy();
    expect(screen.queryByText('99+')).toBeNull();
  });
  it('Ctrl+K recherche boutiques et comptes autorisés via une API protégée et ferme avec Échap', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ shops: [
      { id: '7', displayName: 'Boutique CI', countryCode: 'CI', status: 'connected' },
    ], users: [{ id: '2', displayName: 'Utilisateur CI', email: 'user@ci.invalid' }],
    audit: [{ id: '9', module: 'shops', action: 'fixture.created', occurredAt: '2026-11-11T10:00:00Z' }],
    auditShopId: '7' }) });
    vi.stubGlobal('fetch', fetchMock);
    mount();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const dialog = screen.getByRole('dialog', { name: 'Recherche rapide dans mon espace' });
    const field = within(dialog).getByRole('searchbox', { name: 'Rechercher dans mon espace' });
    expect(document.activeElement).toBe(field);
    await userEvent.setup().type(field, 'CI');
    const hit = await within(dialog).findByRole('link', { name: /Boutique CI/ });
    expect(hit.getAttribute('href')).toBe('/espace/boutiques?q=Boutique%20CI');
    const userHit = await within(dialog).findByRole('link', { name: /Utilisateur CI/ });
    expect(userHit.getAttribute('href')).toBe('/espace/utilisateurs/2');
    const auditHit = await within(dialog).findByRole('link', { name: /shops · fixture.created/ });
    expect(auditHit.getAttribute('href')).toBe('/espace/journal?shop=7&q=CI');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/search?q=CI'))).toBe(true);
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Recherche rapide dans mon espace' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rechercher dans mon espace' }));
  });
  it('cache une entrée si la permission n’est pas accordée', () => {
    mount(['dashboard:read']);
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).queryByText('Toutes les boutiques')).toBeNull();
    expect(screen.queryByText('Système')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rechercher dans mon espace' })).toBeNull();
  });
  it('montre la recherche aux lecteurs globaux de comptes, pas au rôle boutique seul', () => {
    mount(['dashboard:read', 'users:read'], 0, ['users:read']);
    expect(screen.getByRole('button', { name: 'Rechercher dans mon espace' })).toBeTruthy();
    cleanup();
    mount(['dashboard:read', 'users:read'], 0, []);
    expect(screen.queryByRole('button', { name: 'Rechercher dans mon espace' })).toBeNull();
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
