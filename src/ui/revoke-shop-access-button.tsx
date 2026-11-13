'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function RevokeShopAccessButton({ userId, shopId, shopLabel }: {
  userId: string; shopId: string; shopLabel: string;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  useEffect(() => setReady(true), []);
  async function revoke() {
    if (!window.confirm(`Révoquer l’accès indépendant à ${shopLabel} ? Aucun rôle de ce compte n’est retiré.`)) return;
    setBusy(true); setError(false);
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/shop-access`, {
        method: 'DELETE', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ shopId }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <><button type="button" disabled={!ready || busy} onClick={() => void revoke()}>
    {busy ? 'Révocation…' : 'Révoquer cet accès indépendant'}
  </button>{error && <span role="alert">Révocation impossible. Actualisez la page et réessayez.</span>}</>;
}
