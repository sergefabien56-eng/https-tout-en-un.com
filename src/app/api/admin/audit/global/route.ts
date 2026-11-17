import { NextResponse, type NextRequest } from 'next/server';
import { listGlobalAudit } from '@/modules/audit/list-global-audit';
import { parseAuditFilters } from '@/modules/audit/filters';
import { AppError } from '@/core/errors/app-error';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams;
  const page = q.get('page') ?? '1';
  if (!/^[1-9]\d{0,4}$/.test(page)) return NextResponse.json({ error: 'Page invalide.' }, { status: 400, headers });
  try {
    const filters = parseAuditFilters(Object.fromEntries(['q','module','actorId','from','to','result']
      .map((key) => [key, q.get(key)]).filter(([, value]) => value !== null && value !== '')));
    const data = await listGlobalAudit({ token: request.cookies.get('toutenun_session')?.value, page: Number(page), ...filters });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
