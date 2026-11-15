import { NextResponse, type NextRequest } from 'next/server';
import { AppError } from '@/core/errors/app-error';
import { exportAuthorizedUsersPdf } from '@/modules/identity/export-users-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;
    const pdf = await exportAuthorizedUsersPdf(request.cookies.get('toutenun_session')?.value,
      params.get('q') ?? '', params.get('status') ?? 'all', params.get('role') ?? 'all');
    return new NextResponse(pdf, { status: 200, headers: { ...headers,
      'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="utilisateurs.pdf"' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
