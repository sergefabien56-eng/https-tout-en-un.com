import { NextResponse, type NextRequest } from 'next/server';
import { getIncidentReport } from '@/modules/monitoring/system-incidents';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.searchParams.get('page') ?? '1';
  if (!/^[1-9]\d{0,4}$/.test(raw)) return NextResponse.json({ error: 'Page invalide.' }, { status: 400, headers });
  try {
    return NextResponse.json(await getIncidentReport(request.cookies.get('toutenun_session')?.value, Number(raw)),
      { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
