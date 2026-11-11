'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Shop = { id: string; displayName: string; countryCode: string; status: string };

/** Recherche et sélection dans un catalogue déjà filtré par RLS côté serveur. */
export function ShopSwitcher({ selectedShop }: { selectedShop: string | null }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [shops, setShops] = useState<Shop[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { if (open) search.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ page: String(page), q });
        const response = await fetch(`/api/shops?${params}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json() as { shops: Shop[]; nextPage: number | null };
        setShops(data.shops); setNextPage(data.nextPage);
      } catch {
        if (!controller.signal.aborted) { setShops([]); setError('Catalogue indisponible. Réessayez.'); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, page, q]);
  async function select(shopId: string) {
    setBusy(true); setError('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch('/api/preferences/shop', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token }, body: JSON.stringify({ shopId }) });
      if (!response.ok) throw new Error();
      setOpen(false); trigger.current?.focus();
      if (pathname === '/espace/journal') router.push(shopId === 'all' ? '/espace/journal' : `/espace/journal?shop=${shopId}`);
      router.refresh();
    } catch { setError('Sélection impossible. Réessayez.'); }
    finally { setBusy(false); }
  }
  return <div className="shop-switcher" onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} className="shop-context" type="button" aria-expanded={open}
      aria-controls="shop-switcher-panel"
      aria-label={selectedShop ? `Choisir une boutique — Préférence : ${selectedShop}` : 'Choisir une boutique'}
      onClick={() => setOpen(!open)}>
      {selectedShop ? `Préférence : ${selectedShop}` : 'Choisir une boutique'}
    </button>
    {open && <div id="shop-switcher-panel" className="shop-switcher-panel" role="dialog" aria-label="Choix de boutique">
      <label htmlFor="shop-switcher-search">Rechercher parmi mes boutiques</label>
      <input ref={search} id="shop-switcher-search" type="search" value={q} maxLength={80}
        onChange={(event) => { setQ(event.target.value); setPage(1); }} />
      <button type="button" disabled={busy} onClick={() => void select('all')}>Toutes les boutiques autorisées</button>
      {loading ? <p role="status">Chargement…</p> : shops.length === 0 && !error ? <p role="status">Aucune boutique trouvée.</p> :
        <ul>{shops.map((shop) => <li key={shop.id}><button type="button" disabled={busy}
          onClick={() => void select(shop.id)}>{shop.displayName} · {shop.countryCode} · {shop.status}</button></li>)}</ul>}
      {error && <p role="alert">{error}</p>}
      <div className="shop-switcher-pages">
        {page > 1 && <button type="button" onClick={() => setPage(page - 1)}>Précédent</button>}
        {nextPage !== null && <button type="button" onClick={() => setPage(nextPage)}>Suivant</button>}
      </div>
      <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Fermer</button>
    </div>}
  </div>;
}
