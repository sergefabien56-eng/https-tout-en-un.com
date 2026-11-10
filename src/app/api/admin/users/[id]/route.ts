import { NextResponse, type NextRequest } from 'next/server';
import { getAuthorizedUser } from '@/modules/identity/user-list';
import { AppError } from '@/core/errors/app-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  // Refuser un identifiant non canonique avant toute requête SQL.
  if (!/^[1-9]\d{0,17}$/.test(id)) return NextResponse.json({ error: 'Utilisateur introuvable.' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } });
  try {
    const result = await getAuthorizedUser(request.cookies.get('toutenun_session')?.value, id);
    if (!result) return NextResponse.json({ error: 'Utilisateur introuvable.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'Service temporairement indisponible.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
