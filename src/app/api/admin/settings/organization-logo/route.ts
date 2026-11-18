/**
 * Import et retrait du logo commun — Propriétaire exclusivement.
 *
 * Le contrôle de rôle ne repose pas sur la seule présence du jeton CSRF : un appel
 * direct à cette route par un Gestionnaire (qui possède `settings:manage`) doit être
 * refusé par le module. Le test d'intégration le vérifie sans passer par l'écran.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedOrigin, verifyCsrf } from '@/core/auth/primitives';
import { AppError } from '@/core/errors/app-error';
import { removeOrganizationLogo, updateOrganizationLogo } from '@/modules/identity/organization-logo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
/** Marge au-dessus de 1 Mio : le corps HTTP peut dépasser le fichier de quelques octets. */
const BODY_LIMIT = 1_200_000;

function refused(request: NextRequest): NextResponse | null {
  if (!process.env.APP_URL || !isAllowedOrigin(request.headers.get('origin'), process.env.APP_URL) ||
    !verifyCsrf(request.cookies.get('toutenun_csrf')?.value, request.headers.get('x-csrf-token') ?? undefined))
    return NextResponse.json({ error: 'Requête non autorisée.' }, { status: 403, headers });
  return null;
}

function failure(error: unknown): NextResponse {
  console.error('[logo] échec', error);
  if (error instanceof AppError) return NextResponse.json({ error: error.userMessage },
    { status: error.httpStatus, headers });
  return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503, headers });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rejected = refused(request); if (rejected) return rejected;
  const announced = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isFinite(announced) || announced <= 0 || announced > BODY_LIMIT)
    return NextResponse.json({ error: 'Fichier trop volumineux : 1 Mio maximum.' }, { status: 413, headers });
  let bytes: Buffer;
  try { bytes = Buffer.from(await request.arrayBuffer()); }
  catch { return NextResponse.json({ error: 'Fichier illisible.' }, { status: 400, headers }); }
  // Deuxième barrière : la taille réelle, pas celle annoncée.
  if (bytes.length > BODY_LIMIT)
    return NextResponse.json({ error: 'Fichier trop volumineux : 1 Mio maximum.' }, { status: 413, headers });
  try {
    return NextResponse.json(await updateOrganizationLogo(
      request.cookies.get('toutenun_session')?.value, bytes), { headers });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const rejected = refused(request); if (rejected) return rejected;
  try {
    await removeOrganizationLogo(request.cookies.get('toutenun_session')?.value);
    return NextResponse.json({ removed: true }, { headers });
  } catch (error) { return failure(error); }
}
