'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReferenceCurrency } from '@/modules/identity/reference-currency';

/** Seul XOF a été décidé ; aucun changement automatique à l'installation. */
export function OrganizationCurrencyForm({ current }: { current: ReferenceCurrency | null }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setReady(true), []);
  async function save() {
    setBusy(true); setMessage('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const result = await fetch('/api/admin/settings/reference-currency', {
        method: 'PUT', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ currency: 'XOF' }),
      });
      if (!result.ok) throw new Error();
      setMessage('Devise enregistrée.'); router.refresh();
    } catch { setMessage('Enregistrement impossible. Vérifiez vos droits et réessayez.'); }
    finally { setBusy(false); }
  }
  return <div>
    <button type="button" disabled={!ready || busy || current === 'XOF'} onClick={() => void save()}>
      {busy ? 'Enregistrement…' : 'Enregistrer XOF comme devise de référence'}
    </button>
    {message && <p role="status">{message}</p>}
  </div>;
}
