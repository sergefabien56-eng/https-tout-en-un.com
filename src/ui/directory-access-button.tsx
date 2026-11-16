'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
export function DirectoryAccessButton({ userId, granted }: { userId: string; granted: boolean }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setReady(true), []);
  async function change() {
    if (!window.confirm(granted
      ? 'Retirer à ce compte l’accès individuel à l’annuaire complet ?'
      : 'Autoriser ce compte à accéder à l’annuaire complet de l’organisation, sous réserve du droit global de consultation ?')) return;
    setBusy(true); setMessage('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/directory-access`, {
        method: 'PUT', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ expected: granted, granted: !granted }),
      });
      if (response.status === 409) { setMessage('L’accès a changé. Actualisez la page.'); router.refresh(); return; }
      if (!response.ok) throw new Error();
      setMessage('Accès mis à jour.'); router.refresh();
    } catch { setMessage('Modification impossible. Vérifiez vos droits et réessayez.'); }
    finally { setBusy(false); }
  }
  return <div><p>Autorisation individuelle : {granted ? 'accordée' : 'non accordée'}.</p>
    <button type="button" onClick={() => void change()} disabled={!ready || busy}>
      {busy ? 'Enregistrement…' : granted ? 'Retirer l’accès individuel' : 'Autoriser l’accès individuel'}
    </button>{message && <p role="status">{message}</p>}</div>;
}
