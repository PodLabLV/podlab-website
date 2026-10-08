import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/portal-invite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN = /^[A-Za-z0-9_-]{20,200}$/;
const TYPES = new Set(['invite', 'recovery']);

/**
 * GET — where the invite and reset emails point. Parks the token in an httpOnly
 * cookie and sends the browser to a clean /login/set-password, so the token is
 * never in a page URL that analytics would record. Spends nothing: the token is
 * verified only when a password is submitted.
 */
export async function GET(req: NextRequest) {
  const tokenHash = req.nextUrl.searchParams.get('token_hash') ?? '';
  const type = req.nextUrl.searchParams.get('type') ?? '';

  // A relative Location on purpose: behind podlablv.com's proxy this request's own
  // host is podlab-site.vercel.app, and the cookie only comes back on podlablv.com.
  const go = (path: string) => {
    const res = new NextResponse(null, { status: 303 });
    res.headers.set('Location', path);
    res.headers.set('Referrer-Policy', 'no-referrer');
    res.headers.set('Cache-Control', 'no-store');
    return res;
  };

  if (!TOKEN.test(tokenHash) || !TYPES.has(type)) return go('/login/set-password?state=invalid');

  const res = go(`/login/set-password?kind=${type}`);
  res.cookies.set(ACCESS_COOKIE, JSON.stringify({ t: tokenHash, type }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return res;
}
