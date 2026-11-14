import { NextResponse, type NextRequest } from 'next/server';
import { AppError } from '@/core/errors/app-error';
import { exportOwnShopsXlsx } from '@/modules/identity/export-shops-xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const xlsx = await exportOwnShopsXlsx(request.cookies.get('toutenun_session')?.value,
      { ...(params.has('q') ? { q: params.get('q')! } : {}),
        ...(params.has('status') ? { status: params.get('status')! } : {}),
        ...(params.has('sort') ? { sort: params.get('sort')! } : {}) });
    return new NextResponse(xlsx, { status: 200, headers: { ...headers,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="boutiques.xlsx"' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
