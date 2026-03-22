import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Auth is handled client-side by Supabase JS (localStorage sessions).
  // Middleware cannot reliably check localStorage, so we let the portal
  // layout component handle auth checks and redirect to /login if needed.
  return NextResponse.next()
}

export const config = {
  matcher: ['/portal/:path*'],
}
