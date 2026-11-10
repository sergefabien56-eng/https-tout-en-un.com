import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { revokeSession } from '@/core/auth/service';

export const runtime = 'nodejs';
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
      !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined)) {
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403 });
  }
  const token = request.cookies.get('toutenun_session')?.value;
  if (token) await revokeSession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('toutenun_session');
  response.cookies.delete('toutenun_csrf');
  return response;
}
