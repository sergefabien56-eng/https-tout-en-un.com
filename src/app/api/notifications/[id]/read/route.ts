import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { AppError } from '@/core/errors/app-error';
import { setOwnNotificationRead } from '@/modules/notifications/set-read';

export const runtime = 'nodejs';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store' };
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Action invalide.' }, { status: 400, headers }); }
  if (!body || typeof body !== 'object' || !('read' in body) || typeof body.read !== 'boolean')
    return NextResponse.json({ error: 'Action invalide.' }, { status: 400, headers });
  try {
    const result = await setOwnNotificationRead(request.cookies.get('toutenun_session')?.value,
      (await params).id, body.read);
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
