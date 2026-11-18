import { NextResponse } from 'next/server';
import { appConfig } from '@/core/config/app.config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * La sonde publique ne dit jamais qu'une chose : le processus répond.
 * `/api/health/deep` (Propriétaire) vérifie la base et lit les mesures réelles.
 *
 * `database` reste volontairement « configured-not-checked » : cette route n'interroge pas
 * la base, l'annoncer « ok » ici serait une affirmation non mesurée.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: 'ok',
      name: appConfig.shortName,
      version: appConfig.version,
      environment: appConfig.environment,
      time: new Date().toISOString(),
      checks: {
        database: process.env.DATABASE_URL ? 'configured-not-checked' : 'not-configured',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
