'use client';
import { useEffect, useMemo, useState } from 'react';

/**
 * Acquitter un incident : la seule action possible sur un incident, et elle est définitive.
 *
 * Trois états lisibles : prêt, en cours, acquitté. Le bouton n'est cliquable qu'une fois
 * React attaché (même précaution que `NotificationReadButton`) : un clic perdu avant
 * hydratation ne doit pas laisser croire à un acquittement.
 */
export function IncidentAcknowledgeButton({ id, initialAcknowledged }: {
  id: string; initialAcknowledged: string | null;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string | null>(initialAcknowledged);
  const [error, setError] = useState(false);
  useEffect(() => setReady(true), []);

  const label = useMemo(() => {
    if (busy) return 'Acquittement…';
    return acknowledged ? 'Acquitté' : 'Acquitter';
  }, [busy, acknowledged]);

  async function acknowledge() {
    setBusy(true); setError(false);
    try {
      const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrfResponse.ok) throw new Error();
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error();
      const response = await fetch(`/api/admin/system/incidents/${encodeURIComponent(id)}/acknowledge`, {
        method: 'POST', credentials: 'same-origin', headers: { 'x-csrf-token': token },
      });
      if (!response.ok) throw new Error();
      const body = await response.json() as { acknowledgedAt?: unknown };
      if (typeof body.acknowledgedAt !== 'string') throw new Error();
      // L'état affiché vient de la réponse serveur, jamais d'une supposition locale.
      setAcknowledged(body.acknowledgedAt);
    } catch { setError(true); } finally { setBusy(false); }
  }

  return <>
    <button type="button" disabled={!ready || busy || acknowledged !== null} onClick={() => void acknowledge()}>
      {label}
    </button>
    {acknowledged !== null && <span className="tag ok">Acquitté le {
      new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })
        .format(new Date(acknowledged))} UTC</span>}
    {error && <span role="alert">Acquittement impossible. Réessayez.</span>}
  </>;
}
