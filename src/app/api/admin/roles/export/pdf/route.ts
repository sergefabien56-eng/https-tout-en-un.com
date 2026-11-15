import { NextResponse, type NextRequest } from 'next/server';
import { exportRoleMatrixPdf } from '@/modules/identity/export-role-matrix-pdf';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const pdf = await exportRoleMatrixPdf(request.cookies.get('toutenun_session')?.value);
    return new NextResponse(pdf, { status: 200, headers: {
      ...headers, 'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="roles-permissions.pdf"',
    } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
