'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ManagedStatus } from '@/modules/identity/change-user-status';

export function ChangeUserStatusButton({ id, status }: { id: string; status: ManagedStatus }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  useEffect(() => setReady(true), []);
  const next = status === 'active' ? 'suspended' : 'active';
  async function change() {
    if (!window.confirm(status === 'active'
      ? 'Suspendre ce compte et déconnecter tous ses appareils ?'
      : 'Réactiver ce compte ? Les sessions précédentes resteront révoquées.')) return;
    setBusy(true); setError(false);
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}/status`, {
        method: 'PATCH', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <><button type="button" disabled={!ready || busy} onClick={() => void change()}>
    {busy ? 'Enregistrement…' : status === 'active' ? 'Suspendre et déconnecter' : 'Réactiver'}
  </button>{error && <span role="alert">Modification impossible. Actualisez la fiche et réessayez.</span>}</>;
}
