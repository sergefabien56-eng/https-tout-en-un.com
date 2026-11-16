import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { AppError } from '@/core/errors/app-error';
import { updateRolePermission } from '@/modules/identity/update-role-permission';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400, headers }); }
  if (typeof body !== 'object' || body === null || Array.isArray(body) ||
    Object.keys(body).sort().join(',') !== 'expected,granted,permissionCode,roleCode')
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400, headers });
  try {
    const values = body as { roleCode: unknown; permissionCode: unknown; expected: unknown; granted: unknown };
    return NextResponse.json(await updateRolePermission({ ...values, token: request.cookies.get('toutenun_session')?.value }), { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage }, { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
