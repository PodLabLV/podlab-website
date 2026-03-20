import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /portal routes
  if (!pathname.startsWith('/portal')) {
    return NextResponse.next()
  }

  // Check for Supabase auth token in cookies
  const accessToken = request.cookies.get('sb-tncipuxobcbkwkmpcevt-auth-token')?.value
    || request.cookies.get('sb-access-token')?.value

  // Also check for the auth storage key (Supabase JS stores session in localStorage,
  // but we can check if they have any auth cookies at all)
  const hasAuthCookies = Array.from(request.cookies.getAll()).some(
    c => c.name.includes('supabase') || c.name.includes('sb-')
  )

  if (!accessToken && !hasAuthCookies) {
    // No auth at all — redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If they have cookies, let the client-side auth check handle the rest
  // (Supabase JS client manages session validation)
  return NextResponse.next()
}

export const config = {
  matcher: ['/portal/:path*'],
}
