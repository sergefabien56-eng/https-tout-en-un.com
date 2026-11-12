import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { AppError } from '@/core/errors/app-error';
import { readOrganizationSettings, updateOrganizationTimezone } from '@/modules/identity/organization-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
function failure(error: unknown): NextResponse {
  return error instanceof AppError
    ? NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers })
    : NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
}
export async function GET(request: NextRequest): Promise<NextResponse> {
  try { return NextResponse.json(await readOrganizationSettings(request.cookies.get('toutenun_session')?.value), { headers }); }
  catch (error) { return failure(error); }
}
export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Paramètre invalide.' }, { status: 400, headers }); }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
    Object.keys(body).length !== 1 || !Object.hasOwn(body, 'timezone'))
    return NextResponse.json({ error: 'Paramètre invalide.' }, { status: 400, headers });
  try { return NextResponse.json(await updateOrganizationTimezone(request.cookies.get('toutenun_session')?.value,
    (body as { timezone: unknown }).timezone), { headers }); }
  catch (error) { return failure(error); }
}
