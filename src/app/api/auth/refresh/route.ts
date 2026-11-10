import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { refreshSession } from '@/core/auth/refresh-session';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export async function POST(request: NextRequest): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'no-store' };
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined)) {
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  }
  const token = request.cookies.get('toutenun_session')?.value;
  try {
    const expires = await refreshSession(token);
    const result = NextResponse.json({ expiresAt: expires.toISOString() }, { headers });
    result.cookies.set('toutenun_session', token!, {
      httpOnly: true, sameSite: 'strict', secure: process.env.APP_URL.startsWith('https://'),
      path: '/', expires,
    });
    result.cookies.delete('toutenun_csrf');
    return result;
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' },
      { status: 503, headers });
  }
}
