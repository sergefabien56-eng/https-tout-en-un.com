'use client';
import { useEffect } from 'react';

/** Une page privée ouverte et visible renouvelle la session ; aucun jeton lu par JS. */
export function SessionHeartbeat() {
  useEffect(() => {
    const renew = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
        if (!csrf.ok) return;
        const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
        if (!token) return;
        await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin',
          headers: { 'x-csrf-token': token }, cache: 'no-store' });
      } catch { /* Réseau indisponible : expiration normale, jamais de session fictive. */ }
    };
    const timer = window.setInterval(() => { void renew(); }, 5 * 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
