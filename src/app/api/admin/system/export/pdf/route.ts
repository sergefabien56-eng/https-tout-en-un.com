import { NextResponse, type NextRequest } from 'next/server';
import { AppError } from '@/core/errors/app-error';
import { exportSystemPdf } from '@/modules/monitoring/export-system-pdf';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await exportSystemPdf(request.cookies.get('toutenun_session')?.value);
    return new NextResponse(data, { headers: { ...headers, 'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="systeme-instantane.pdf"' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
