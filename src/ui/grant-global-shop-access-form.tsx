'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function GrantGlobalShopAccessForm({ userId, shops }: {
  userId: string; shops: { id: string; displayName: string }[];
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [shopId, setShopId] = useState(shops[0]?.id ?? '');
  const router = useRouter();
  useEffect(() => setReady(true), []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shops.some((shop) => shop.id === shopId)) return;
    if (!window.confirm('Autoriser ce compte à accéder à cette boutique avec ses rôles globaux ?')) return;
    setBusy(true); setError(false);
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/shop-access`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ shopId }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)} className="shop-filters">
    <label htmlFor="grant-global-shop">Boutique à autoriser</label>
    <select id="grant-global-shop" value={shopId} onChange={(event) => setShopId(event.target.value)}>
      {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.displayName} · n° {shop.id}</option>)}
    </select>
    <button type="submit" disabled={!ready || busy || !shopId}>{busy ? 'Enregistrement…' : 'Autoriser cette boutique'}</button>
    {error && <span role="alert">Attribution impossible. Actualisez la page et réessayez.</span>}
  </form>;
}
