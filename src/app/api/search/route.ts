import { NextResponse, type NextRequest } from 'next/server';
import { AppError } from '@/core/errors/app-error';
import { searchAuthorizedDirectory } from '@/modules/identity/directory-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Même service et mêmes contrôles serveur que la page de recherche. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  try {
    const result = await searchAuthorizedDirectory(request.cookies.get('toutenun_session')?.value,
      request.nextUrl.searchParams.get('q') ?? '', request.cookies.get('toutenun_shop')?.value);
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers });
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
  }
}
