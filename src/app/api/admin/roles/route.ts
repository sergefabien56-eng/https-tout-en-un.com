import { NextResponse, type NextRequest } from 'next/server';
import { getRoleMatrix } from '@/modules/identity/role-matrix';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await getRoleMatrix(request.cookies.get('toutenun_session')?.value);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'Service temporairement indisponible.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
