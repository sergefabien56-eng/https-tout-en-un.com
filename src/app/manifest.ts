import type { MetadataRoute } from 'next';
import { APP_NAME, APP_SHORT_NAME, BRAND_COLORS } from '@/core/config/app.config';

/** Métadonnées PWA ; aucun contenu privé n'est mis en cache par défaut. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: 'Gestion multi-boutiques Jumia',
    start_url: '/connexion',
    display: 'standalone',
    background_color: BRAND_COLORS.white,
    theme_color: BRAND_COLORS.navy,
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
