'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SCOPED_ROLES, type ScopedRole } from '@/modules/identity/scoped-roles';

const LABELS: Record<ScopedRole, string> = {
  manager: 'Gestionnaire', stock_manager: 'Responsable des stocks',
  accountant: 'Comptable', assistant: 'Assistant',
};
async function changeRole(userId: string, shopId: string, roleCode: ScopedRole, grant: boolean) {
  const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!csrf.ok) throw new Error();
  const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
  if (!token) throw new Error();
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/shop-roles`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
    body: JSON.stringify({ shopId, roleCode, grant }),
  });
  if (!response.ok) throw new Error();
}

export function GrantShopRoleForm({ userId, shops }: {
  userId: string; shops: { id: string; displayName: string }[];
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [shopId, setShopId] = useState(shops[0]?.id ?? '');
  const [roleCode, setRoleCode] = useState<ScopedRole>('manager');
  const router = useRouter();
  useEffect(() => setReady(true), []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shops.some((shop) => shop.id === shopId)) return;
    if (!window.confirm(`Attribuer ${LABELS[roleCode]} à cette boutique ?`)) return;
    setBusy(true); setError(false);
    try { await changeRole(userId, shopId, roleCode, true); router.refresh(); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)} className="shop-filters">
    <label htmlFor="assign-shop">Boutique</label>
    <select id="assign-shop" value={shopId} onChange={(event) => setShopId(event.target.value)}>
      {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.displayName} · n° {shop.id}</option>)}
    </select>
    <label htmlFor="assign-role">Rôle boutique</label>
    <select id="assign-role" value={roleCode} onChange={(event) => setRoleCode(event.target.value as ScopedRole)}>
      {SCOPED_ROLES.map((code) => <option key={code} value={code}>{LABELS[code]}</option>)}
    </select>
    <button type="submit" disabled={!ready || busy || !shopId}>{busy ? 'Enregistrement…' : 'Attribuer'}</button>
    {error && <span role="alert">Attribution impossible. Actualisez la page et réessayez.</span>}
  </form>;
}

export function RevokeShopRoleButton({ userId, shopId, roleCode }: {
  userId: string; shopId: string; roleCode: ScopedRole;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  useEffect(() => setReady(true), []);
  async function revoke() {
    if (!window.confirm(`Retirer ${LABELS[roleCode]} de la boutique n° ${shopId} ? Les autres rôles restent en place.`)) return;
    setBusy(true); setError(false);
    try { await changeRole(userId, shopId, roleCode, false); router.refresh(); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <><button type="button" disabled={!ready || busy} onClick={() => void revoke()}>
    {busy ? 'Retrait…' : `Retirer ${LABELS[roleCode]} de la boutique n° ${shopId}`}
  </button>{error && <span role="alert">Retrait impossible. Réessayez.</span>}</>;
}
