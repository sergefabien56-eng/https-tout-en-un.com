'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TIMEZONES, type OrganizationTimezone } from '@/modules/identity/organization-timezones';

/** Modification volontaire : l'état visible ne devient « enregistré » qu'après réponse serveur. */
export function OrganizationTimezoneForm({ current }: { current: OrganizationTimezone | null }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<OrganizationTimezone>(current ?? 'Africa/Abidjan');
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
      const result = await fetch('/api/admin/settings', {
        method: 'PUT', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ timezone: selected }),
      });
      if (!result.ok) throw new Error();
      setMessage('Fuseau enregistré.'); router.refresh();
    } catch { setMessage('Enregistrement impossible. Vérifiez vos droits et réessayez.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void save(event)}>
    <label htmlFor="organization-timezone">Fuseau de référence de l’organisation</label>{' '}
    <select id="organization-timezone" value={selected} onChange={(event) => setSelected(event.target.value as OrganizationTimezone)}>
      {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
    </select>{' '}
    <button type="submit" disabled={!ready || busy || selected === current}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
