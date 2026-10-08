import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/api-utils'
import { admin } from '@/lib/portal-server'
import { createAccessLink, sendAccessEmail } from '@/lib/portal-invite'

// "Forgot it?" on /login and "Send a new link" on /login/set-password. The link
// lands on /login/set-password (via /api/portal/access), which actually asks for
// a new password; the old flow redirected to /login and never set one.
// Always answers success, so the form can't be used to discover accounts.

export async function POST(request: NextRequest) {
  const { limited } = rateLimit(request, { maxRequests: 3, windowMs: 60_000 })
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 })
  }

  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const db = admin()

    // Recovery only: a reset must never create an account for an unknown email.
    const link = await createAccessLink(db, { email: cleanEmail, forceRecovery: true })
    if (!link) return NextResponse.json({ success: true })

    const { data: client } = await db
      .from('portal_clients')
      .select('first_name')
      .eq('user_id', link.userId)
      .maybeSingle()

    await sendAccessEmail('reset', cleanEmail, link.url, client?.first_name)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Password reset error:', err)
    return NextResponse.json({ success: true })
  }
}
