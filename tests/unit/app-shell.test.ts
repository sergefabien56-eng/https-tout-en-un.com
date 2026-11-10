// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { AppShell } from '@/ui/app-shell';

vi.mock('next/navigation', () => ({ usePathname: () => '/espace' }));

const mount = (permissions = ['dashboard:read', 'system:manage', 'shops:read']) =>
  render(createElement(AppShell, { userName: 'Compte réel', permissions, children: createElement('p', {}, 'Contenu protégé') }));

beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme; });
afterEach(() => { cleanup(); });

describe('coquille UI — état prêt et états indisponibles', () => {
  it('montre la page réelle et désactive les entrées non prêtes', () => {
    mount();
    expect(screen.getByRole('link', { name: /vue d'ensemble/i }).getAttribute('href')).toBe('/espace');
    const soon = within(screen.getByRole('navigation', { name: 'Modules' })).getByText('Toutes les boutiques');
    expect(soon.closest('[aria-disabled]')?.getAttribute('aria-disabled')).toBe('true');
    expect(soon.closest('a')).toBeNull();
    expect(screen.getByText('Compte réel')).toBeTruthy();
    expect(screen.getByText('Contenu protégé')).toBeTruthy();
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
