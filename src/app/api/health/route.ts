import { NextResponse } from 'next/server';
import { appConfig } from '@/core/config/app.config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sonde de santé (liveness). Ne divulgue aucun secret ni chaîne de connexion.
 * La sonde profonde (/api/health/deep) arrive au lot L10 : elle vérifiera la base, les
 * migrations appliquées et l'état de la file.
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
