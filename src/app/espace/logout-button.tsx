'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setBusy(true); setError('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.split('=')[1];
      if (!token) throw new Error();
      const result = await fetch('/api/auth/logout', {
        method: 'POST', credentials: 'same-origin', headers: { 'x-csrf-token': token },
      });
      if (!result.ok) throw new Error();
      router.replace('/connexion'); router.refresh();
    } catch { setError('Déconnexion impossible. Réessayez.'); setBusy(false); }
  }
  return <><button type="button" onClick={logout} disabled={busy}>{busy ? 'Déconnexion…' : 'Se déconnecter'}</button>
    {error && <p role="alert" className="form-error">{error}</p>}</>;
}
