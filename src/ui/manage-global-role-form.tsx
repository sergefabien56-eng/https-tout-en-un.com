'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SCOPED_ROLES, type ScopedRole } from '@/modules/identity/scoped-roles';

const LABELS: Record<ScopedRole, string> = {
  manager: 'Gestionnaire', stock_manager: 'Responsable des stocks',
  accountant: 'Comptable', assistant: 'Assistant',
};

async function changeGlobalRole(userId: string, roleCode: ScopedRole, grant: boolean) {
  const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!csrf.ok) throw new Error();
  const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
  if (!token) throw new Error();
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/global-roles`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
    body: JSON.stringify({ roleCode, grant }),
  });
  if (!response.ok) throw new Error();
}

export function GrantGlobalRoleForm({ userId }: { userId: string }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [roleCode, setRoleCode] = useState<ScopedRole>('manager');
  const router = useRouter();
  useEffect(() => setReady(true), []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!SCOPED_ROLES.some((code) => code === roleCode)) return;
    if (!window.confirm(`Attribuer ${LABELS[roleCode]} en rôle global ? Aucune boutique n’est ajoutée automatiquement à ce compte.`)) return;
    setBusy(true); setError(false);
    try { await changeGlobalRole(userId, roleCode, true); router.refresh(); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)} className="shop-filters">
    <label htmlFor="grant-global-role">Rôle global</label>
    <select id="grant-global-role" value={roleCode} onChange={(event) => setRoleCode(event.target.value as ScopedRole)}>
      {SCOPED_ROLES.map((code) => <option key={code} value={code}>{LABELS[code]}</option>)}
    </select>
    <button type="submit" disabled={!ready || busy}>{busy ? 'Enregistrement…' : 'Attribuer le rôle global'}</button>
    {error && <span role="alert">Attribution impossible. Actualisez la page et réessayez.</span>}
  </form>;
}

export function RevokeGlobalRoleButton({ userId, roleCode }: { userId: string; roleCode: ScopedRole }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  useEffect(() => setReady(true), []);
  async function revoke() {
    if (!window.confirm(`Retirer le rôle global ${LABELS[roleCode]} ? Les rôles boutique et les lignes d’accès de ce compte restent en place.`)) return;
    setBusy(true); setError(false);
    try { await changeGlobalRole(userId, roleCode, false); router.refresh(); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <><button type="button" disabled={!ready || busy} onClick={() => void revoke()}>
    {busy ? 'Retrait…' : `Retirer le rôle global ${LABELS[roleCode]}`}
  </button>{error && <span role="alert">Retrait impossible. Réessayez.</span>}</>;
}
