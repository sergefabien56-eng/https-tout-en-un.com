'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from 'lucide-react';
import { appConfig } from '@/core/config/app.config';
import { visibleNavigation } from '@/ui/navigation.config';
import { Button } from '@/ui/components/button';

const MENU_KEY = 'toutenun.nav.open';
const RAIL_KEY = 'toutenun.nav.rail';
const THEME_KEY = 'toutenun.theme';
type Theme = 'system' | 'light' | 'dark';

function readIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MENU_KEY) ?? '["dashboard"]');
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : ['dashboard'];
  } catch { return ['dashboard']; }
}

export function AppShell({ userName, permissions, globalPermissions, children }: {
  userName: string; permissions: readonly string[]; globalPermissions?: readonly string[]; children: ReactNode;
}) {
  const pathname = usePathname();
  const groups = visibleNavigation(new Set(permissions), new Set(globalPermissions ?? permissions));
  const active = groups.find((g) => g.children.some((c) => c.availability === 'ready' && c.href === pathname));
  const [open, setOpen] = useState<string[]>(active ? [active.id] : []);
  const [drawer, setDrawer] = useState(false);
  const [rail, setRail] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const menuButton = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stored = readIds();
    setOpen(active && !stored.includes(active.id) ? [...stored, active.id] : stored);
    setRail(localStorage.getItem(RAIL_KEY) === 'true');
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'light' || value === 'dark') {
      setTheme(value);
      document.documentElement.dataset.theme = value;
    }
  }, [active?.id]);
  useEffect(() => {
    if (!drawer) return;
    const sidebar = navRef.current?.closest<HTMLElement>('.workspace-sidebar');
    sidebar?.querySelector<HTMLElement>('.drawer-close')?.focus();
    const onDrawerKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { setDrawer(false); menuButton.current?.focus(); }
      if (event.key !== 'Tab' || !sidebar) return;
      const focusable = [...sidebar.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]')]
        .filter((el) => el.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onDrawerKey);
    return () => document.removeEventListener('keydown', onDrawerKey);
  }, [drawer]);

  function setExpanded(next: string[]) {
    setOpen(next); localStorage.setItem(MENU_KEY, JSON.stringify(next));
  }
  function toggle(id: string) {
    setExpanded(open.includes(id) ? open.filter((v) => v !== id) : [...open, id]);
    if (rail) { setRail(false); localStorage.setItem(RAIL_KEY, 'false'); }
  }
  function changeTheme() {
    const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(next);
    if (next === 'system') { localStorage.removeItem(THEME_KEY); delete document.documentElement.dataset.theme; }
    else { localStorage.setItem(THEME_KEY, next); document.documentElement.dataset.theme = next; }
  }
  function navigateKeys(event: KeyboardEvent<HTMLElement>) {
    const focusable = [...(navRef.current?.querySelectorAll<HTMLElement>('[data-nav-focus]:not([disabled])') ?? [])]
      .filter((el) => el.getClientRects().length > 0);
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    let target: HTMLElement | undefined;
    if (event.key === 'ArrowDown') target = focusable[(index + 1) % focusable.length];
    if (event.key === 'ArrowUp') target = focusable[(index - 1 + focusable.length) % focusable.length];
    if (event.key === 'Home') target = focusable[0];
    if (event.key === 'End') target = focusable.at(-1);
    if (target) { event.preventDefault(); target.focus(); }
    if (event.key === 'Escape') {
      const id = (document.activeElement as HTMLElement).closest<HTMLElement>('[data-group]')?.dataset.group;
      if (drawer) { setDrawer(false); menuButton.current?.focus(); }
      else if (id && open.includes(id)) setExpanded(open.filter((v) => v !== id));
    }
  }

  return (
    <div className={`workspace ${rail ? 'workspace-rail' : ''} ${drawer ? 'workspace-drawer-open' : ''}`}>
      {drawer && <button className="workspace-scrim" type="button" aria-label="Fermer le menu" onClick={() => { setDrawer(false); menuButton.current?.focus(); }} />}
      <aside className="workspace-sidebar" aria-label="Navigation principale" id="app-sidebar">
        <div className="sidebar-brand"><span className="brand-mark" aria-hidden="true">T1</span>
          <span className="sidebar-full">{appConfig.shortName}<small>Business Manager</small></span>
          <Button variant="ghost" size="icon" className="drawer-close" aria-label="Fermer le menu" onClick={() => { setDrawer(false); menuButton.current?.focus(); }}><X size={20} /></Button>
        </div>
        <div className="sidebar-tools sidebar-full">
          <button type="button" onClick={() => setExpanded(groups.map((g) => g.id))}>Tout ouvrir</button>
          <button type="button" onClick={() => setExpanded([])}>Tout fermer</button>
        </div>
        <nav ref={navRef} aria-label="Modules" onKeyDown={navigateKeys} className="sidebar-nav">
          {groups.map((group) => {
            const expanded = open.includes(group.id);
            const current = active?.id === group.id;
            const Icon = group.icon;
            return <section key={group.id} data-group={group.id} className="nav-group">
              <button type="button" data-nav-focus title={group.label} aria-expanded={expanded}
                aria-controls={`nav-${group.id}`} className={`nav-group-button ${current ? 'nav-current-group' : ''}`}
                onClick={() => toggle(group.id)}>
                <Icon size={19} aria-hidden="true" /><span className="sidebar-full">{group.label}</span>
                <ChevronDown size={16} className={`sidebar-full nav-chevron ${expanded ? 'nav-chevron-open' : ''}`} aria-hidden="true" />
              </button>
              <div id={`nav-${group.id}`} className="nav-children sidebar-full" hidden={!expanded}>
                {group.children.map((leaf) => {
                  const LeafIcon = leaf.icon;
                  return leaf.availability === 'ready' ?
                    <Link data-nav-focus key={leaf.id} href={leaf.href} onClick={() => setDrawer(false)}
                      aria-current={pathname === leaf.href ? 'page' : undefined}
                      className={`nav-leaf ${pathname === leaf.href ? 'nav-active' : ''}`}>
                      <LeafIcon size={16} aria-hidden="true" />{leaf.label}
                    </Link> :
                    <span key={leaf.id} className="nav-leaf nav-soon" aria-disabled="true" title="Bientôt disponible">
                      <LeafIcon size={16} aria-hidden="true" />{leaf.label}<small>Bientôt</small>
                    </span>;
                })}
              </div>
            </section>;
          })}
        </nav>
        <div className="sidebar-footer sidebar-full">Données Jumia indisponibles · Phase 2</div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <Button ref={menuButton} variant="ghost" size="icon" className="mobile-menu"
            aria-label="Ouvrir le menu" aria-controls="app-sidebar" aria-expanded={drawer}
            onClick={() => setDrawer(true)}><Menu size={22} /></Button>
          <Button variant="ghost" size="icon" className="desktop-collapse"
            aria-label={rail ? 'Déployer le menu' : 'Réduire le menu'}
            onClick={() => { setRail(!rail); localStorage.setItem(RAIL_KEY, String(!rail)); }}>
            {rail ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </Button>
          <strong className="topbar-name">{appConfig.shortName}</strong>
          <span className="shop-context" title="Aucune boutique connectée">Toutes les boutiques <small>Indisponible</small></span>
          <div className="topbar-spacer" />
          <button type="button" className="topbar-disabled" disabled title="Recherche bientôt disponible" aria-label="Recherche bientôt disponible"><Search size={18} /></button>
          <button type="button" className="topbar-disabled" disabled title="Notifications bientôt disponibles" aria-label="Notifications bientôt disponibles"><Bell size={18} /></button>
          <Button variant="ghost" size="icon" aria-label={`Thème ${theme} : changer le thème`} onClick={changeTheme}>
            {theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}
          </Button>
          <Link href="/espace/sessions" className="topbar-user" title="Mes sessions" aria-label={`${userName} — mes sessions`}>{userName}</Link>
        </header>
        <div className="workspace-content"><div className="workspace-inner">{children}</div></div>
      </div>
    </div>
  );
}
