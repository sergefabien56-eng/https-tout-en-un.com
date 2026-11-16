import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { AppError } from '@/core/errors/app-error';
import { manageDirectoryAccess } from '@/modules/identity/directory-access';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Choix invalide.' }, { status: 400, headers }); }
  if (typeof body !== 'object' || body === null || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'expected,granted')
    return NextResponse.json({ error: 'Choix invalide.' }, { status: 400, headers });
  const values = body as { expected: unknown; granted: unknown };
  try { return NextResponse.json(await manageDirectoryAccess({ ...values, id: (await params).id,
    token: request.cookies.get('toutenun_session')?.value }), { headers }); }
  catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
