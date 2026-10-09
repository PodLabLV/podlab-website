import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/api-utils';
import { ACCESS_COOKIE } from '@/lib/portal-invite';
import { admin, notifySlack } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_LENGTH = 8;

/**
 * POST { password } — verify the parked token, set the password, and hand the
 * browser its session. The token cookie is cleared whatever happens, so a
 * failed or spent link can't be retried from the same browser.
 */
export async function POST(req: NextRequest) {
  const { limited } = rateLimit(req, { maxRequests: 8, windowMs: 60_000 });
  if (limited) return NextResponse.json({ error: 'Too many tries. Wait a minute.' }, { status: 429 });

  let parked: { t?: string; type?: 'invite' | 'recovery' } = {};
  try {
    parked = JSON.parse(req.cookies.get(ACCESS_COOKIE)?.value ?? '{}');
  } catch {
    parked = {};
  }

  let password = '';
  try {
    password = String((await req.json())?.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (password.length < MIN_LENGTH) {
    return NextResponse.json({ error: `Use at least ${MIN_LENGTH} characters.` }, { status: 400 });
  }

  const done = (body: object, status = 200) => {
    const res = NextResponse.json(body, { status });
    res.cookies.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  };

  if (!parked.t || (parked.type !== 'invite' && parked.type !== 'recovery')) {
    return done({ error: 'expired' }, 400);
  }

  // A throwaway anon client: verifyOtp gives it the user's session, which the
  // password update then runs under. Nothing persists server-side.
  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await auth.auth.verifyOtp({ token_hash: parked.t, type: parked.type });
  if (verified.error || !verified.data.session) {
    console.error('[portal] access token rejected', verified.error?.message);
    return done({ error: 'expired' }, 400);
  }

  const updated = await auth.auth.updateUser({ password });
  if (updated.error) {
    console.error('[portal] password update failed', updated.error.message);
    // The token is spent either way; the client needs a fresh link.
    return done({ error: updated.error.message.includes('different') ? 'Choose a password you have not used before.' : 'Could not set that password.' }, 400);
  }

  // Refresh the session after the password change so the browser gets a current one.
  const { data: refreshed } = await auth.auth.refreshSession();
  const session = refreshed.session ?? verified.data.session;

  if (parked.type === 'invite') {
    const db = admin();
    const { data: client } = await db
      .from('portal_clients')
      .select('business_name')
      .eq('user_id', verified.data.user!.id)
      .maybeSingle();
    let who = client?.business_name ?? null;
    if (!who) {
      // A teammate joining someone's portal.
      const { data: m } = await db.from('portal_client_members').select('first_name, role, portal_clients(business_name)').eq('user_id', verified.data.user!.id).maybeSingle();
      const biz = (m as { portal_clients?: { business_name?: string } } | null)?.portal_clients?.business_name;
      if (m && biz) who = `${m.first_name ?? verified.data.user!.email} (${m.role}, ${biz})`;
    }
    await notifySlack(`*Portal invite accepted* — ${who ?? verified.data.user!.email} set a password and is in.`);
  }

  return done({ access_token: session.access_token, refresh_token: session.refresh_token });
}
