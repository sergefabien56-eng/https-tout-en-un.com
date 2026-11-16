import { NextResponse, type NextRequest } from 'next/server';
import { AppError } from '@/core/errors/app-error';
import { listShopMembers } from '@/modules/identity/shop-members';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest, { params }: { params: Promise<{ shopId: string }> }): Promise<NextResponse> {
  const page = request.nextUrl.searchParams.get('page') ?? '1';
  if (!/^[1-9]\d{0,4}$/.test(page)) return NextResponse.json({ error: 'Page invalide.' }, { status: 400, headers });
  try {
    const result = await listShopMembers({ token: request.cookies.get('toutenun_session')?.value,
      shopId: (await params).shopId, page: Number(page) });
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
