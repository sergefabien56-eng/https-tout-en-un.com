'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

/** Destinations réellement présentes ; la permission est calculée côté serveur dans layout. */
export function QuickActions({ permissions, globalPermissions, auditShopAccess }: {
  permissions: readonly string[]; globalPermissions: readonly string[]; auditShopAccess: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const has = (permission: string) => permissions.includes(permission);
  const global = (permission: string) => globalPermissions.includes(permission);
  return <div ref={root} className="quick-actions" onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="quick-actions-panel"
      aria-label="Actions rapides" className="quick-actions-trigger" onClick={() => setOpen(!open)}>
      <Plus size={19} aria-hidden="true" /><span className="quick-actions-label">Actions rapides</span>
    </button>
    {open && <nav id="quick-actions-panel" aria-label="Actions rapides" className="quick-actions-panel">
      <Link ref={first} href="/espace/sessions" onClick={() => setOpen(false)}>Mes sessions</Link>
      {has('dashboard:read') && <Link href="/espace/recherche" onClick={() => setOpen(false)}>Rechercher dans mon espace</Link>}
      {has('shops:read') && <Link href="/espace/boutiques" onClick={() => setOpen(false)}>Mes boutiques</Link>}
      {has('audit:read') && (auditShopAccess ? <Link href="/espace/journal" onClick={() => setOpen(false)}>
        Journal de la boutique sélectionnée</Link> : <span aria-disabled="true" title="Sélectionnez une boutique autorisée">
        Journal · sélectionner une boutique</span>)}
      {global('users:read') && <Link href="/espace/utilisateurs" onClick={() => setOpen(false)}>Utilisateurs</Link>}
      {has('dashboard:read') && <Link href="/espace/notifications" onClick={() => setOpen(false)}>Mes notifications</Link>}
      {global('users:write') && <span aria-disabled="true" title="Invitation indisponible">Inviter un utilisateur · bientôt</span>}
    </nav>}
  </div>;
}
