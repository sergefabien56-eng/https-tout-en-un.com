'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function OrganizationNameForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setReady(true), []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const result = await fetch('/api/admin/settings/organization-name', {
        method: 'PUT', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ name }),
      });
      if (!result.ok) throw new Error();
      const saved: { name: string } = await result.json();
      setName(saved.name); setMessage('Nom enregistré.'); router.refresh();
    } catch { setMessage('Enregistrement impossible. Vérifiez le nom et vos droits, puis réessayez.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void save(event)}>
    <label htmlFor="organization-name">Nom de l’organisation</label>{' '}
    <input id="organization-name" value={name} onChange={(event) => setName(event.target.value)}
      maxLength={100} required autoComplete="organization" />{' '}
    <button type="submit" disabled={!ready || busy || !name.trim() || name.trim().normalize('NFC') === current}>
      {busy ? 'Enregistrement…' : 'Enregistrer le nom'}
    </button>
    {message && <p role="status">{message}</p>}
  </form>;
}
