import { NextResponse, type NextRequest } from 'next/server';
import { exportAuthorizedUsers } from '@/modules/identity/export-users';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const params = request.nextUrl.searchParams;
    const csv = await exportAuthorizedUsers(request.cookies.get('toutenun_session')?.value,
      params.get('q') ?? '', params.get('status') ?? 'all', params.get('role') ?? 'all');
    return new NextResponse(csv, { status: 200, headers: {
      ...headers, 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="utilisateurs.csv"',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
