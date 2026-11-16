'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function RolePermissionButton(props: { roleCode: string; roleLabel: string; permissionCode: string; permissionLabel: string; granted: boolean }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setReady(true), []);
  async function change() {
    const verb = props.granted ? 'retirer' : 'accorder';
    if (!window.confirm(`Confirmer : ${verb} « ${props.permissionLabel} » pour le rôle « ${props.roleLabel} » ? Cette modification concerne tous les comptes portant ce rôle, globalement ou dans une boutique.`)) return;
    setBusy(true); setMessage('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const result = await fetch('/api/admin/roles/permission', {
        method: 'PUT', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ roleCode: props.roleCode, permissionCode: props.permissionCode, expected: props.granted, granted: !props.granted }),
      });
      if (result.status === 409) { setMessage('La matrice a changé. Actualisez avant de confirmer.'); router.refresh(); return; }
      if (!result.ok) throw new Error();
      setMessage('Modification enregistrée.'); router.refresh();
    } catch { setMessage('Modification impossible. Vérifiez vos droits et réessayez.'); }
    finally { setBusy(false); }
  }
  return <div>
    <button type="button" disabled={!ready || busy} onClick={() => void change()}
      aria-label={`${props.roleLabel} — ${props.permissionLabel} : ${props.granted ? 'autorisé' : 'non autorisé'}. Modifier`}>
      {props.granted ? '✓' : '—'}
    </button>
    {message && <span role="status">{message}</span>}
  </div>;
}
