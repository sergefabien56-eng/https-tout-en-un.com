import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { getSession } from '@/core/auth/service';
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export async function POST(request: NextRequest): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store' };
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Sélection invalide.' }, { status: 400, headers }); }
  if (typeof body !== 'object' || body === null || !('shopId' in body) ||
    typeof body.shopId !== 'string' || (body.shopId !== 'all' && !/^[1-9]\d{0,18}$/.test(body.shopId)))
    return NextResponse.json({ error: 'Sélection invalide.' }, { status: 400, headers });
  const token = request.cookies.get('toutenun_session')?.value;
  try {
    if (body.shopId === 'all') {
      if (!token || !(await getSession(token))) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    } else {
      await withAuthorizedShopTransaction({ token, shopId: body.shopId, permission: 'shops:read' }, async (db, ctx) => {
        const shop = await db.query('SELECT id FROM shops WHERE id = $1 AND deleted_at IS NULL', [ctx.shopId]);
        if (!shop.rows[0]) throw new AppError('FORBIDDEN', { userMessage: 'Boutique introuvable ou non autorisée.' });
      });
    }
    const result = NextResponse.json({ ok: true }, { headers });
    if (body.shopId === 'all') result.cookies.delete('toutenun_shop');
    else result.cookies.set('toutenun_shop', body.shopId, {
      httpOnly: true, sameSite: 'strict', secure: process.env.APP_URL.startsWith('https://'), path: '/', maxAge: 30 * 24 * 3600,
    });
    result.cookies.delete('toutenun_csrf');
    return result;
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
