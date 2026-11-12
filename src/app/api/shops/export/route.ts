import { NextResponse, type NextRequest } from 'next/server';
import { exportOwnShops } from '@/modules/identity/export-shops';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  try {
    const params = request.nextUrl.searchParams;
    const csv = await exportOwnShops(request.cookies.get('toutenun_session')?.value,
      { ...(params.has('q') ? { q: params.get('q')! } : {}),
        ...(params.has('status') ? { status: params.get('status')! } : {}),
        ...(params.has('sort') ? { sort: params.get('sort')! } : {}) });
    return new NextResponse(csv, { status: 200, headers: {
      ...headers, 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="boutiques.csv"',
    } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
