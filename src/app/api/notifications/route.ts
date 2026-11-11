import { NextResponse, type NextRequest } from 'next/server';
import { isNotificationReadFilter, listOwnNotifications } from '@/modules/notifications/list-own';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.searchParams.get('page') ?? '1';
  const filter = request.nextUrl.searchParams.get('filter') ?? 'all';
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[1-9]\d{0,4}$/.test(raw)) return NextResponse.json({ error: 'Page invalide.' }, { status: 400, headers });
  if (!isNotificationReadFilter(filter)) return NextResponse.json({ error: 'Filtre invalide.' }, { status: 400, headers });
  try {
    return NextResponse.json(await listOwnNotifications(request.cookies.get('toutenun_session')?.value, Number(raw), filter), { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
