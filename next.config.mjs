/**
 * Configuration Next.js.
 * En .mjs et non .ts : le chargeur de configuration de Next embarque son propre TypeScript,
 * qui entre en conflit avec TypeScript 7 (échec « Cannot read properties of undefined »).
 */
/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  // La police du PDF doit aussi être disponible dans l'archive autonome Next.
  outputFileTracingIncludes: {
    '/api/admin/roles/export/pdf': ['./assets/fonts/DejaVuSans.ttf', './assets/fonts/LICENSE-DejaVu.txt'],
    '/api/admin/users/export/pdf': ['./assets/fonts/DejaVuSans.ttf', './assets/fonts/LICENSE-DejaVu.txt'],
    '/api/shops/export/pdf': ['./assets/fonts/DejaVuSans.ttf', './assets/fonts/LICENSE-DejaVu.txt'],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default config;
