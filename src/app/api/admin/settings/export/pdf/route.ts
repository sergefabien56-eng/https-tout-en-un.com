import { NextResponse, type NextRequest } from 'next/server';
import { exportOrganizationSettingsPdf } from '@/modules/identity/export-organization-settings-pdf';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const bytes = await exportOrganizationSettingsPdf(request.cookies.get('toutenun_session')?.value);
    return new NextResponse(bytes, { status: 200, headers: {
      ...headers, 'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="parametres-organisation.pdf"',
    } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
