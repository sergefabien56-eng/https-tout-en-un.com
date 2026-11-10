import { NextResponse, type NextRequest } from 'next/server';
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lecture de boutique réelle : session, shop, permission et contexte RLS côté serveur. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> },
): Promise<NextResponse> {
  const { shopId } = await params;
  try {
    const shop = await withAuthorizedShopTransaction(
      { token: request.cookies.get('toutenun_session')?.value, shopId, permission: 'shops:read' },
      async (db, context) => {
        const result = await db.query<{ id: string; display_name: string; status: string; country_code: string }>(
          `SELECT id::text, display_name, status, country_code
           FROM shops WHERE id = $1 AND deleted_at IS NULL`,
          [context.shopId],
        );
        const row = result.rows[0];
        return row ? { id: row.id, displayName: row.display_name, status: row.status,
          countryCode: row.country_code, provenance: 'Réelle' as const } : null;
      },
    );
    return NextResponse.json(shop, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.userMessage },
        { status: error.httpStatus, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: 'Service temporairement indisponible.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
