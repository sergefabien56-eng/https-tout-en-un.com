import { NextResponse, type NextRequest } from 'next/server';
import { listAuthorizedUsers } from '@/modules/identity/user-list';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const value = params.get('page') ?? '1';
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'all';
  const role = params.get('role') ?? 'all';
  if (!/^[1-9]\d{0,4}$/.test(value)) {
    return NextResponse.json({ error: 'Page invalide.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const result = await listAuthorizedUsers(request.cookies.get('toutenun_session')?.value, Number(value), q, status, role);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'Service temporairement indisponible.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
