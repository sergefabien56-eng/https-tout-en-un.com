import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { manageGlobalRole } from '@/modules/identity/manage-global-role';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Attribution invalide.' }, { status: 400, headers }); }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
    Object.keys(body).sort().join(',') !== 'grant,roleCode')
    return NextResponse.json({ error: 'Attribution invalide.' }, { status: 400, headers });
  const input = body as { roleCode: unknown; grant: unknown };
  try {
    return NextResponse.json(await manageGlobalRole({
      token: request.cookies.get('toutenun_session')?.value,
      userId: (await params).id, roleCode: input.roleCode, grant: input.grant,
    }), { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
