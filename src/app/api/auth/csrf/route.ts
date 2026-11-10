import { NextResponse } from 'next/server';
import { createSessionToken } from '@/core/auth/primitives';

export const runtime = 'nodejs';
export function GET(): NextResponse {
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('toutenun_csrf', createSessionToken().token, {
    secure: process.env.APP_URL?.startsWith('https://') ?? false, httpOnly: false,
    sameSite: 'strict', path: '/', maxAge: 3600,
  });
  return response;
}
