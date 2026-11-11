import { NextResponse, type NextRequest } from 'next/server';
import { listOwnShops } from '@/modules/identity/shop-catalog';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw = request.nextUrl.searchParams.get('page') ?? '1';
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[1-9]\d{0,4}$/.test(raw)) return NextResponse.json({ error: 'Page invalide.' }, { status: 400, headers });
  try {
    return NextResponse.json(await listOwnShops(request.cookies.get('toutenun_session')?.value, Number(raw),
      { ...(request.nextUrl.searchParams.has('q') ? { q: request.nextUrl.searchParams.get('q')! } : {}),
        ...(request.nextUrl.searchParams.has('status') ? { status: request.nextUrl.searchParams.get('status')! } : {}),
        ...(request.nextUrl.searchParams.has('sort') ? { sort: request.nextUrl.searchParams.get('sort')! } : {}) }), { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
