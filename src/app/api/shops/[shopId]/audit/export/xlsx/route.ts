import { NextResponse, type NextRequest } from 'next/server';
import { exportShopAuditXlsx } from '@/modules/audit/export-audit-xlsx';
import { parseAuditFilters } from '@/modules/audit/filters';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }): Promise<NextResponse> {
  try {
    const { shopId } = await params;
    const q = request.nextUrl.searchParams;
    const resultFilter = parseAuditFilters({ result: q.get('result') || undefined }).result;
    const xlsx = await exportShopAuditXlsx({ token: request.cookies.get('toutenun_session')?.value, shopId,
      ...(q.get('module') ? { module: q.get('module')! } : {}),
      ...(q.get('q') ? { q: q.get('q')! } : {}),
      ...(q.get('actorId') ? { actorId: q.get('actorId')! } : {}),
      ...(q.get('from') ? { from: q.get('from')! } : {}),
      ...(q.get('to') ? { to: q.get('to')! } : {}),
      ...(resultFilter !== undefined ? { result: resultFilter } : {}) });
    return new NextResponse(xlsx, { status: 200, headers: { ...headers,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="journal-boutique.xlsx"' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
