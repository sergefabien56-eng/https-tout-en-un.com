/**
 * Marque de l'application — icône provisoire originale et logo importé.
 *
 * Règles tenues ici, et nulle part ailleurs :
 *  - Le nom affiché vient de `appConfig` : jamais d'écriture en dur.
 *  - L'image importée est rendue avec `object-fit: contain` : proportions conservées,
 *    aucune déformation, jamais de recadrage.
 *  - En mode sombre, l'image reçoit une plaque claire discrète *si nécessaire* : un logo
 *    déjà clair n'en reçoit pas, un logo sombre en reçoit une. Le calcul se fait côté
 *    client à partir des pixels, sans requête réseau supplémentaire.
 */
'use client';

import { useEffect, useState } from 'react';
import { appConfig } from '@/core/config/app.config';

/**
 * Icône provisoire : quatre carrés satellites reliés à un carré central.
 * Cinq formes, quatre liens : plusieurs boutiques réunies dans un même outil.
 * Dessinée en dur ici, sans dépendance : elle s'affiche même si tout le reste échoue.
 * Elle reste PROVISOIRE tant que le propriétaire n'a pas validé de logo définitif.
 */
export function ProvisionalBrandIcon({ size = 40 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" role="img"
    aria-label="Icône provisoire : quatre boutiques réunies autour d’un même outil" focusable="false">
    <rect width="48" height="48" rx="11" fill="var(--brand-navy)" />
    {/* Quatre liens fins partant du centre : ils expriment le regroupement sans devenir
        des flèches, et restent lisibles à 20 px. */}
    <g stroke="var(--brand-turquoise)" strokeWidth="1.9" strokeLinecap="round" opacity="0.85">
      <path d="M24 24 L13.5 13.5" /><path d="M24 24 L34.5 13.5" />
      <path d="M24 24 L13.5 34.5" /><path d="M24 24 L34.5 34.5" />
    </g>
    {/* Carré central plein : le point de convergence. */}
    <rect x="19" y="19" width="10" height="10" rx="2.6" fill="var(--brand-turquoise)" />
    {/* Quatre boutiques. Un léger retrait les sépare du lien pour éviter l'effet de flèche. */}
    <g fill="var(--sidebar-text)">
      <rect x="8.5" y="8.5" width="9" height="9" rx="2.4" />
      <rect x="30.5" y="8.5" width="9" height="9" rx="2.4" />
      <rect x="8.5" y="30.5" width="9" height="9" rx="2.4" />
      <rect x="30.5" y="30.5" width="9" height="9" rx="2.4" />
    </g>
  </svg>;
}

/**
 * Mesure la clarté moyenne d'une image déjà chargée par le navigateur.
 * Retourne `null` si les pixels ne sont pas lisibles (canvas « tainted ») :
 * dans ce cas on n'ajoute AUCUNE plaque, car on ne peut pas savoir.
 */
function useNeedsLightBackdrop(src: string | null): boolean | null {
  const [needs, setNeeds] = useState<boolean | null>(null);
  useEffect(() => {
    setNeeds(null);
    if (!src) return;
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 32;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) { setNeeds(null); return; }
        context.drawImage(image, 0, 0, 32, 32);
        const { data } = context.getImageData(0, 0, 32, 32);
        let luminance = 0; let opaque = 0;
        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3]! / 255;
          if (alpha < 0.35) continue; // un fond transparent ne compte pas comme « sombre »
          luminance += (0.2126 * data[index]! + 0.7152 * data[index + 1]! + 0.0722 * data[index + 2]!) * alpha;
          opaque += alpha;
        }
        if (opaque === 0) { setNeeds(true); return; } // image entièrement transparente
        setNeeds(luminance / opaque < 110); // seuil : en dessous, le logo est sombre
      } catch { setNeeds(null); }
    };
    image.onerror = () => { if (!cancelled) setNeeds(null); };
    image.src = src;
    return () => { cancelled = true; image.onload = null; image.onerror = null; };
  }, [src]);
  return needs;
}

/**
 * Affichage du logo : image importée si elle existe, icône provisoire sinon.
 * `variant` change seulement la taille et la présence du nom, jamais l'image elle-même.
 */
export function BrandMark({ logoUrl = null, size = 40, className = '' }: {
  logoUrl?: string | null; size?: number; className?: string;
}) {
  const needsBackdrop = useNeedsLightBackdrop(logoUrl);
  if (!logoUrl) return <span className={className}><ProvisionalBrandIcon size={size} /></span>;
  return <span className={`brand-image ${needsBackdrop === true ? 'brand-image-on-light' : ''} ${className}`}
    style={{ width: size, height: size }}>
    <img src={logoUrl} alt="" width={size} height={size} decoding="async" />
  </span>;
}

/** Icône seule + nom complet : usage « version avec le nom ». */
export function BrandLockup({ logoUrl = null, subtitle = true }: { logoUrl?: string | null; subtitle?: boolean }) {
  return <span className="brand-lockup">
    <BrandMark logoUrl={logoUrl} size={40} />
    <span className="brand-lockup-text">
      <span className="brand-lockup-name">{appConfig.shortName}</span>
      {subtitle && <small>{appConfig.name}</small>}
    </span>
  </span>;
}
