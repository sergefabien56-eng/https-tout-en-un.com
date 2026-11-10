import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/core/auth/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('toutenun_session')?.value;
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ displayName: session.displayName }, { headers: { 'Cache-Control': 'no-store' } });
}
