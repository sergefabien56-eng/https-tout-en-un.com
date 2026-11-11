'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Bouton accessible, état rafraîchi seulement après écriture serveur confirmée. */
export function NotificationReadButton({ id, read }: { id: string; read: boolean }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  // Ne pas présenter un bouton cliquable avant l'attachement de son gestionnaire React.
  useEffect(() => setReady(true), []);
  async function change() {
    setBusy(true); setError(false);
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ read: !read }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <><button type="button" disabled={!ready || busy} onClick={() => void change()}>
    {busy ? 'Enregistrement…' : read ? 'Marquer comme non lue' : 'Marquer comme lue'}
  </button>{error && <span role="alert">Modification impossible. Réessayez.</span>}</>;
}
