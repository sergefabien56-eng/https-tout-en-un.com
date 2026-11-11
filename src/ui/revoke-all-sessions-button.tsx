'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Action groupée explicite ; les droits et la session courante sont contrôlés par le serveur. */
export function RevokeAllSessionsButton() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  useEffect(() => setReady(true), []);
  async function revoke() {
    if (!window.confirm('Déconnecter tous les autres appareils ? Votre appareil actuel restera connecté.')) return;
    setBusy(true); setError(false);
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST', credentials: 'same-origin', headers: { 'x-csrf-token': token }, cache: 'no-store',
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <><button type="button" disabled={!ready || busy} onClick={() => void revoke()}>
    {busy ? 'Déconnexion en cours…' : 'Déconnecter tous les autres appareils'}
  </button>{error && <span role="alert">Déconnexion impossible. Actualisez la page et réessayez.</span>}</>;
}
