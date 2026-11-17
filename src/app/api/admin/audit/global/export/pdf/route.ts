import { NextResponse, type NextRequest } from 'next/server';
import { loadGlobalAuditExport } from '@/modules/audit/export-global-audit';
import { formatGlobalAuditPdf } from '@/modules/audit/export-global-audit-pdf';
import { parseAuditFilters } from '@/modules/audit/filters';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILTER_KEYS = ['q', 'module', 'actorId', 'from', 'to', 'result'] as const;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  try {
    const q = request.nextUrl.searchParams;
    const filters = parseAuditFilters(Object.fromEntries(FILTER_KEYS
      .map((key) => [key, q.get(key)]).filter(([, value]) => value !== null && value !== '')));
    const data = await loadGlobalAuditExport({ token: request.cookies.get('toutenun_session')?.value, ...filters });
    const bytes = await formatGlobalAuditPdf(data);
    return new NextResponse(bytes, { status: 200, headers: {
      ...headers, 'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="journal-global-proprietaire.pdf"',
    } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
