'use client';
/**
 * Gestion du logo commun — visible du seul Propriétaire.
 *
 * L'aperçu est LOCAL : le fichier reste dans le navigateur tant que « Enregistrer » n'est
 * pas utilisé. Le propriétaire voit donc le rendu en clair et en sombre AVANT tout envoi,
 * et peut renoncer sans laisser de trace.
 *
 * Aucune préférence individuelle n'est touchée ici : le thème clair/sombre reste local
 * à chaque navigateur (`theme-preference.ts`), et ce formulaire n'y accède jamais.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark, ProvisionalBrandIcon } from '@/ui/brand';
import { appConfig } from '@/core/config/app.config';

type State = { custom: boolean; url: string | null; updatedAt: string | null; width: number | null;
  height: number | null; provisional: boolean; note: string };

export function OrganizationLogoForm({ state }: { state: State }) {
  const router = useRouter();
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  // L'aperçu local doit être libéré : une URL d'objet non révoquée fuit en mémoire.
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    setError(''); setMessage('');
    const file = event.target.files?.[0];
    if (localUrl) URL.revokeObjectURL(localUrl);
    if (!file) { setLocalUrl(null); setFileName(''); return; }
    setFileName(file.name);
    setLocalUrl(URL.createObjectURL(file));
  }

  async function send(method: 'POST' | 'DELETE') {
    setBusy(true); setError(''); setMessage('');
    try {
      const csrf = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrf.ok) throw new Error('csrf');
      const token = document.cookie.split('; ').find((c) => c.startsWith('toutenun_csrf='))?.slice('toutenun_csrf='.length);
      if (!token) throw new Error('csrf');
      let body: BodyInit | null = null;
      const headers: Record<string, string> = { 'x-csrf-token': token };
      if (method === 'POST') {
        const file = input.current?.files?.[0];
        if (!file) return;
        body = file;
        headers['Content-Type'] = file.type || 'application/octet-stream';
      }
      const result = await fetch('/api/admin/settings/organization-logo',
        { method, credentials: 'same-origin', cache: 'no-store', headers, body });
      const payload = await result.json().catch(() => ({})) as { error?: string };
      if (!result.ok) { setError(payload.error ?? 'Enregistrement impossible.'); return; }
      setMessage(method === 'POST' ? 'Logo enregistré et journalisé.' : 'Logo retiré : l’icône provisoire est affichée.');
      if (input.current) input.current.value = '';
      if (localUrl) URL.revokeObjectURL(localUrl);
      setLocalUrl(null); setFileName('');
      router.refresh();
    } catch { setError('Enregistrement impossible. Vérifiez votre connexion, puis réessayez.'); }
    finally { setBusy(false); }
  }

  const preview = localUrl ?? state.url;

  return <div className="logo-manager">
    <p className="logo-manager-note">{state.note}</p>

    <div className="logo-previews" aria-label="Aperçu du logo">
      {/* Deux aperçus côte à côte : le rendu doit être vérifié dans les deux modes. */}
      <figure className="logo-preview logo-preview-light">
        <div className="logo-preview-surface"><BrandMark logoUrl={preview} size={56} /></div>
        <figcaption>Mode clair</figcaption>
      </figure>
      <figure className="logo-preview logo-preview-dark">
        <div className="logo-preview-surface"><BrandMark logoUrl={preview} size={56} /></div>
        <figcaption>Mode sombre</figcaption>
      </figure>
      <figure className="logo-preview logo-preview-small">
        <div className="logo-preview-surface"><BrandMark logoUrl={preview} size={20} /></div>
        <figcaption>Petite taille (20 px)</figcaption>
      </figure>
    </div>

    <p className="logo-preview-lockup">
      <BrandMark logoUrl={preview} size={36} />{' '}<strong>{appConfig.shortName}</strong>{' '}
      <span className="logo-preview-full">{appConfig.name}</span>
    </p>

    {!state.custom && !localUrl && <p className="logo-provisional">
      Icône provisoire affichée : cinq carrés, quatre boutiques reliées à un même outil.
      Elle n’est pas définitive et sera remplacée dès que vous aurez validé un logo.
    </p>}

    <form className="logo-form" onSubmit={(event) => { event.preventDefault(); void send('POST'); }}>
      <label htmlFor="organization-logo">Fichier du logo (1 Mio maximum)</label>
      <input ref={input} id="organization-logo" type="file" accept="image/png,image/jpeg,image/webp"
        aria-describedby="organization-logo-help" onChange={choose} />
      <p id="organization-logo-help" lang="fr">
        PNG, JPEG ou WebP. Les fichiers SVG sont refusés, car ils peuvent contenir du code.
        Les proportions sont conservées : l’image n’est jamais déformée. Elle est réduite à
        512 px au maximum et ré-encodée côté serveur, ce qui efface ses métadonnées.
      </p>
      {fileName && <p role="status">Fichier choisi : {fileName} — aperçu affiché, rien n’est encore enregistré.</p>}
      <div className="logo-actions">
        <button type="submit" disabled={busy || !localUrl}>{busy ? 'Envoi…' : 'Enregistrer ce logo'}</button>
        <button type="button" className="logo-secondary" disabled={busy || !state.custom}
          onClick={() => void send('DELETE')}>Retirer le logo</button>
      </div>
    </form>

    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <p className="logo-manager-audit">
      Chaque changement est inscrit au journal d’audit : auteur, date, dimensions et empreinte de
      l’opération. L’image elle-même n’est jamais recopiée dans le journal.
    </p>
    <p className="logo-manager-audit">
      Votre choix clair/sombre personnel n’est pas modifié par le logo commun : il reste
      enregistré dans ce navigateur, pour votre compte seulement.
    </p>
  </div>;
}

/** Réexport utilitaire : l'icône provisoire est aussi dessinée sur l'écran d'attente. */
export { ProvisionalBrandIcon };
