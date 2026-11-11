'use client';

import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ShopHit = { id: string; displayName: string; countryCode: string; status: string };

/** Recherche de boutiques uniquement. L'API réauthentifie et filtre par rôle + RLS. */
export function ShopQuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ShopHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpen(true);
      }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => { if (open) field.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    const q = query.trim();
    if (q.length < 2) return;
    const timer = window.setTimeout(async () => {
      setLoading(true); setError(false);
      try {
        const response = await fetch(`/api/shops?q=${encodeURIComponent(q)}&page=1`,
          { cache: 'no-store', credentials: 'same-origin', signal: abort.signal });
        if (!response.ok) throw new Error();
        const data = await response.json() as { shops: ShopHit[] };
        if (!abort.signal.aborted) setHits(data.shops.slice(0, 5));
      } catch {
        if (!abort.signal.aborted) { setHits([]); setError(true); }
      } finally { if (!abort.signal.aborted) setLoading(false); }
    }, 180);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [open, query]);

  function close() { setOpen(false); setQuery(''); setHits([]); setError(false); trigger.current?.focus(); }
  return <>
    <button ref={trigger} type="button" className="topbar-shop-search"
      aria-label="Rechercher une boutique" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Search size={18} aria-hidden="true" />
    </button>
    {open && <div className="quick-search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={panel} className="quick-search-panel" role="dialog" aria-modal="true" aria-label="Recherche rapide de boutiques"
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); close(); }
          if (event.key !== 'Tab') return;
          const items = [...(panel.current?.querySelectorAll<HTMLElement>('input,button,a[href]') ?? [])];
          const first = items[0], last = items.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <div className="quick-search-header"><label htmlFor="quick-shop-query">Rechercher parmi mes boutiques</label>
          <button type="button" aria-label="Fermer la recherche" onClick={close}><X size={18} aria-hidden="true" /></button></div>
        <input ref={field} id="quick-shop-query" type="search" maxLength={80} value={query}
          onChange={(event) => { setQuery(event.target.value); setHits([]); setError(false);
            setLoading(event.target.value.trim().length >= 2); }}
          placeholder="Nom de boutique (2 caractères minimum)" />
        <p className="muted">Uniquement les boutiques auxquelles vous avez accès ; la recherche globale est à venir.</p>
        {query.trim().length < 2 ? <p role="status">Saisissez au moins deux caractères.</p>
          : loading ? <p role="status">Recherche en cours…</p>
          : error ? <p role="alert">Recherche indisponible. Réessayez.</p>
          : hits.length === 0 ? <p role="status">Aucune boutique trouvée.</p>
          : <ul>{hits.map((hit) => <li key={hit.id}><Link onClick={close}
            href={`/espace/boutiques?q=${encodeURIComponent(hit.displayName)}`}>
            {hit.displayName} · {hit.countryCode} · {hit.status}</Link></li>)}</ul>}
        {query.trim().length >= 2 && !error && <Link onClick={close} href={`/espace/boutiques?q=${encodeURIComponent(query.trim())}`}>
          Voir tous les résultats autorisés</Link>}
      </div>
    </div>}
  </>;
}
