'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScopedRole } from '@/modules/identity/scoped-roles';
export function MemberRoleActions(props: {
  userId: string; memberName: string; shopId: string;
  roles: { code: string; label: string }[]; delegableRoles: { code: ScopedRole; label: string }[];
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<ScopedRole | ''>(props.delegableRoles[0]?.code ?? '');
  useEffect(() => setReady(true), []);
  const role = props.delegableRoles.find((item) => item.code === selected);
  const assigned = props.roles.some((item) => item.code === selected);
  async function change(grant: boolean) {
    if (!role || !props.delegableRoles.some((item) => item.code === selected)) return;
    const action = grant ? 'Attribuer' : 'Retirer';
    if (!window.confirm(`${action} le rôle ${role.label} à ${props.memberName} pour cette boutique ? Les autres rôles et l’accès boutique restent inchangés.`)) return;
    setBusy(true); setMessage('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch(`/api/admin/users/${encodeURIComponent(props.userId)}/shop-roles`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ shopId: props.shopId, roleCode: selected, grant }),
      });
      if (!response.ok) throw new Error();
      setMessage('Rôle mis à jour.'); router.refresh();
    } catch { setMessage('Modification refusée ou indisponible. Actualisez et vérifiez vos droits.'); }
    finally { setBusy(false); }
  }
  if (!props.delegableRoles.length) return <span>Aucun rôle attribuable avec vos permissions.</span>;
  return <div>
    <label htmlFor={`member-role-${props.userId}`}>Rôle pour {props.memberName}</label>{' '}
    <select id={`member-role-${props.userId}`} value={selected} onChange={(event) => setSelected(event.target.value as ScopedRole)}>
      {props.delegableRoles.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
    </select>{' '}
    <button type="button" disabled={!ready || busy || !selected || assigned} onClick={() => void change(true)}>Attribuer</button>{' '}
    <button type="button" disabled={!ready || busy || !selected || !assigned} onClick={() => void change(false)}>Retirer</button>
    {message && <p role="status">{message}</p>}
  </div>;
}
