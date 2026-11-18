/**
 * Image du logo commun — lecture pour tout utilisateur connecté.
 *
 * `Content-Disposition: inline` et `X-Content-Type-Options: nosniff` empêchent le
 * navigateur de réinterpréter le fichier. Le type servi est TOUJOURS `image/png` :
 * l'image a été ré-encodée à l'import, donc aucun autre type ne peut sortir d'ici.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { AppError } from '@/core/errors/app-error';
import { readOrganizationLogoBytes } from '@/modules/identity/organization-logo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const logo = await readOrganizationLogoBytes(request.cookies.get('toutenun_session')?.value);
    if (!logo) return NextResponse.json({ error: 'Aucun logo enregistré.' }, { status: 404, headers });
    return new NextResponse(new Uint8Array(logo.bytes), {
      status: 200,
      headers: { ...headers, 'Content-Type': logo.mime,
        'Content-Disposition': `inline; filename="logo.${logo.extension}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
        ETag: `"${logo.updatedAt}"` },
    });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
      { status: error.httpStatus, headers: { ...headers, 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'Service temporairement indisponible.' },
      { status: 503, headers: { ...headers, 'Cache-Control': 'no-store' } });
  }
}
