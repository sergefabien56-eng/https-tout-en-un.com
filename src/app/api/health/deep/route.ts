import { NextResponse, type NextRequest } from 'next/server';
import { getDeepHealth } from '@/modules/monitoring/deep-health';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return NextResponse.json(await getDeepHealth(request.cookies.get('toutenun_session')?.value),
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'Vérification indisponible.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
