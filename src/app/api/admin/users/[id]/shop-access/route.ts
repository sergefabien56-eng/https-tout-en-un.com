import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { grantGlobalRoleShopAccess, revokeShopAccess } from '@/modules/identity/shop-access';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Révocation invalide.' }, { status: 400, headers }); }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
    Object.keys(body).sort().join(',') !== 'shopId')
    return NextResponse.json({ error: 'Révocation invalide.' }, { status: 400, headers });
  const input = body as { shopId: unknown };
  if (typeof input.shopId !== 'string')
    return NextResponse.json({ error: 'Boutique invalide.' }, { status: 400, headers });
  try {
    return NextResponse.json(await revokeShopAccess({
      token: request.cookies.get('toutenun_session')?.value,
      userId: (await params).id, shopId: input.shopId,
    }), { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Attribution invalide.' }, { status: 400, headers }); }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
    Object.keys(body).join(',') !== 'shopId' || typeof (body as { shopId?: unknown }).shopId !== 'string')
    return NextResponse.json({ error: 'Attribution invalide.' }, { status: 400, headers });
  try {
    return NextResponse.json(await grantGlobalRoleShopAccess({
      token: request.cookies.get('toutenun_session')?.value,
      userId: (await params).id, shopId: (body as { shopId: string }).shopId,
    }), { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
