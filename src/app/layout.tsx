import type { Metadata, Viewport } from 'next';
import { APP_NAME, BRAND_COLORS, appConfig } from '@/core/config/app.config';
import './globals.css';

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${appConfig.shortName}` },
  description: 'Plateforme de gestion multi-boutiques Jumia',
  applicationName: APP_NAME,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND_COLORS.navy,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
