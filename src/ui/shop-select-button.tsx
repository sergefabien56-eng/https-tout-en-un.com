'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** La sélection n'est conservée qu'après autorisation serveur ; aucun cookie écrit en JS. */
export function ShopSelectButton({ shopId, label, selected }: { shopId: string; label: string; selected: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function choose() {
    setBusy(true); setError('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const result = await fetch('/api/preferences/shop', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token }, body: JSON.stringify({ shopId }) });
      if (!result.ok) throw new Error();
      router.refresh();
    } catch { setError('Sélection impossible. Réessayez.'); } finally { setBusy(false); }
  }
  return <><button type="button" onClick={choose} disabled={busy || selected}
    aria-label={`Sélectionner ${label}`} aria-pressed={selected}>{selected ? 'Sélectionnée' : busy ? 'Sélection…' : 'Sélectionner'}</button>
    {error && <span role="alert">{error}</span>}</>;
}
