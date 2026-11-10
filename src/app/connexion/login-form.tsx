'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/** Formulaire réellement relié aux routes, sans enregistrement public ni compte fictif. */
export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<'ready' | 'loading' | 'error'>('ready');
  const [message, setMessage] = useState('');
  const [csrf, setCsrf] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('CSRF indisponible'); return r.json(); })
      .then(() => {
        if (controller.signal.aborted) return;
        const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.split('=')[1];
        if (!token) throw new Error('CSRF absent');
        setCsrf(token);
      })
      .catch(() => { if (!controller.signal.aborted) { setState('error'); setMessage('Connexion indisponible. Réessayez plus tard.'); } });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrf || state === 'loading') return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setState('loading'); setMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({
          email: values.get('email'), password: values.get('password'), totp: values.get('totp'),
        }),
      });
      if (!response.ok) {
        const result: unknown = await response.json();
        const error = result && typeof result === 'object' && 'error' in result ? result.error : null;
        setMessage(typeof error === 'string' ? error : 'Connexion impossible.');
        setState('error');
        return;
      }
      form.reset();
      router.replace('/espace');
      router.refresh();
    } catch {
      setMessage('Service indisponible. Vérifiez votre connexion et réessayez.');
      setState('error');
    }
  }

  return (
    <form onSubmit={submit} className="login-form" aria-busy={state === 'loading'}>
      <label htmlFor="email">Adresse e-mail</label>
      <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
      <label htmlFor="password">Mot de passe</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required minLength={12} />
      <label htmlFor="totp">Code à 6 chiffres ou code de secours</label>
      <input id="totp" name="totp" type="text" inputMode="numeric" autoComplete="one-time-code"
        pattern="([0-9]{6}|[A-Za-z0-9_-]{22})" minLength={6} maxLength={22} required aria-describedby="totp-help" />
      <p id="totp-help" className="muted">Le code de l’application change toutes les 30 secondes. Un code de secours ne fonctionne qu’une seule fois.</p>
      {state === 'error' && <p role="alert" className="form-error">{message}</p>}
      <button type="submit" disabled={!csrf || state === 'loading'}>
        {state === 'loading' ? 'Vérification…' : 'Se connecter'}
      </button>
    </form>
  );
}
