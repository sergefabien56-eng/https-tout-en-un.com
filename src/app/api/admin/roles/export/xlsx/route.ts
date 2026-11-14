import { NextResponse, type NextRequest } from 'next/server';
import { exportRoleMatrixXlsx } from '@/modules/identity/export-role-matrix-xlsx';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const xlsx = await exportRoleMatrixXlsx(request.cookies.get('toutenun_session')?.value);
    return new NextResponse(xlsx, { status: 200, headers: {
      ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="roles-permissions.xlsx"',
    } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
