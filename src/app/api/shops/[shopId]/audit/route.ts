import { NextResponse, type NextRequest } from 'next/server';
import { listShopAudit } from '@/modules/audit/list-audit';
import { parseAuditFilters } from '@/modules/audit/filters';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }): Promise<NextResponse> {
  const q = request.nextUrl.searchParams;
  const page = q.get('page') ?? '1';
  const module = q.get('module') || null;
  const search = q.get('q') || null;
  const actorId = q.get('actorId') || null;
  const result = q.get('result') || null;
  const from = q.get('from') || null; const to = q.get('to') || null;
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[1-9]\d{0,4}$/.test(page)) return NextResponse.json({ error: 'Page invalide.' }, { status: 400, headers });
  try {
    const { shopId } = await params;
    const resultFilter = parseAuditFilters({ result: result ?? undefined }).result;
    const events = await listShopAudit({ token: request.cookies.get('toutenun_session')?.value,
      shopId, page: Number(page), ...(module !== null ? { module } : {}),
      ...(search !== null ? { q: search } : {}), ...(actorId !== null ? { actorId } : {}), ...(from !== null ? { from } : {}),
      ...(to !== null ? { to } : {}), ...(resultFilter !== undefined ? { result: resultFilter } : {}) });
    return NextResponse.json(events, { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
