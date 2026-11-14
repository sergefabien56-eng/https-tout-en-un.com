import { NextResponse, type NextRequest } from 'next/server';
import { AppError } from '@/core/errors/app-error';
import { exportAuthorizedUsersXlsx } from '@/modules/identity/export-users-xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const xlsx = await exportAuthorizedUsersXlsx(request.cookies.get('toutenun_session')?.value,
      params.get('q') ?? '', params.get('status') ?? 'all', params.get('role') ?? 'all');
    return new NextResponse(xlsx, { status: 200, headers: { ...headers,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="utilisateurs.xlsx"' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
