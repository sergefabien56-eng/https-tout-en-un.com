import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { AppError } from '@/core/errors/app-error';
import { updateOrganizationName } from '@/modules/identity/organization-name';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Paramètre invalide.' }, { status: 400, headers }); }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
    Object.keys(body).length !== 1 || !Object.hasOwn(body, 'name'))
    return NextResponse.json({ error: 'Paramètre invalide.' }, { status: 400, headers });
  try {
    return NextResponse.json(await updateOrganizationName(request.cookies.get('toutenun_session')?.value,
      (body as { name: unknown }).name), { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
