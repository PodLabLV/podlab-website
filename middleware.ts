import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { REF_COOKIE, REF_MAX_AGE, refFromUrl } from '@/lib/beaker-ref'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()

  // Beaker referral: remember the affiliate for 90 days on every podlablv.com
  // host (the CRM's Buy redirect reads it). Last Beaker link wins.
  const ref = refFromUrl(request.nextUrl)
  if (ref) {
    const host = request.nextUrl.hostname
    res.cookies.set(REF_COOKIE, ref, {
      maxAge: REF_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: true,
      // Parent domain in production so crm./finish. see it; host-only on
      // previews and localhost, where .podlablv.com would be rejected.
      ...(host === 'podlablv.com' || host.endsWith('.podlablv.com') ? { domain: '.podlablv.com' } : {}),
    })
  }

  // Portal auth is handled client-side by Supabase JS (localStorage sessions).
  // Middleware cannot reliably check localStorage, so the portal layout
  // component handles auth checks and redirects to /login if needed.
  return res
}

export const config = {
  // Every page (a Beaker link can point anywhere, including /essentialslab,
  // which is proxied to another project after this runs) — but not API
  // routes or static files.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico|txt|xml)$).*)'],
}
