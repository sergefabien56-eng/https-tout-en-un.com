import { NextResponse, type NextRequest } from 'next/server';
import { credentialsSchema, verifyCsrf } from '@/core/auth/primitives';
import { InvalidCredentials, login } from '@/core/auth/service';
import { isAllowedOrigin } from '@/core/auth/primitives';
import { z } from 'zod';

export const runtime = 'nodejs';
const loginSchema = credentialsSchema.extend({ totp: z.string().regex(/^(\d{6}|[A-Za-z0-9_-]{22})$/) });
const badRequest = (): NextResponse => NextResponse.json(
  { error: 'Identifiants ou code de vérification invalides.' },
  { status: 401, headers: { 'Cache-Control': 'no-store' } },
);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.APP_URL;
  if (!appUrl || !isAllowedOrigin(request.headers.get('origin'), appUrl)) {
    return NextResponse.json({ error: 'Origine non autorisée.' }, { status: 403 });
  }
  if (!verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined)) {
    return NextResponse.json({ error: 'Session expirée. Rechargez la page.' }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return badRequest(); }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return badRequest();
  try {
    const session = await login({ ...parsed.data, ...(request.headers.get('user-agent') ? { userAgent: request.headers.get('user-agent')! } : {}) });
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set('toutenun_session', session.token, {
      httpOnly: true, sameSite: 'strict', secure: process.env.APP_URL?.startsWith('https://') ?? false,
      path: '/', expires: session.expiresAt,
    });
    response.cookies.delete('toutenun_csrf');
    return response;
  } catch (error) {
    if (error instanceof InvalidCredentials) return badRequest();
    // Pas de détail technique ni de secret au navigateur.
    return NextResponse.json({ error: 'Connexion indisponible. Réessayez plus tard.' }, { status: 503 });
  }
}
