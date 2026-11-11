import { NextResponse, type NextRequest } from 'next/server';
import { exportShopAudit } from '@/modules/audit/export-audit';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const { shopId } = await params;
    const q = request.nextUrl.searchParams;
    const csv = await exportShopAudit({ token: request.cookies.get('toutenun_session')?.value, shopId,
      ...(q.get('module') ? { module: q.get('module')! } : {}),
      ...(q.get('actorId') ? { actorId: q.get('actorId')! } : {}),
      ...(q.get('from') ? { from: q.get('from')! } : {}),
      ...(q.get('to') ? { to: q.get('to')! } : {}) });
    return new NextResponse(csv, { status: 200, headers: {
      ...headers, 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="journal-boutique-${shopId}.csv"`,
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
