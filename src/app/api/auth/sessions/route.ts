import { NextResponse, type NextRequest } from 'next/server';
import { listOwnSessions } from '@/modules/identity/active-sessions';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    return NextResponse.json({ sessions: await listOwnSessions(request.cookies.get('toutenun_session')?.value) }, { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
