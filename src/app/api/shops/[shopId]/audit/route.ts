import { NextResponse, type NextRequest } from 'next/server';
import { listShopAudit } from '@/modules/audit/list-audit';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }): Promise<NextResponse> {
  const q = request.nextUrl.searchParams;
  const page = q.get('page') ?? '1';
  const module = q.get('module');
  const actorId = q.get('actorId');
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[1-9]\d{0,4}$/.test(page)) return NextResponse.json({ error: 'Page invalide.' }, { status: 400, headers });
  try {
    const { shopId } = await params;
    const events = await listShopAudit({ token: request.cookies.get('toutenun_session')?.value,
      shopId, page: Number(page), ...(module !== null ? { module } : {}),
      ...(actorId !== null ? { actorId } : {}) });
    return NextResponse.json(events, { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
