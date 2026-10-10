import { reportError } from '@/lib/alerts';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/api-utils';

// GET ?token= → the pre-fill for a client's Beaker invite (crm.beaker_invites,
// created by the CRM after the client's first Whop payment). The token is the
// only thing in the emailed link; this hands back just what the form shows.
// Also stamps opened_at so the CRM can see the invite was clicked.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const { limited } = rateLimit(request, { maxRequests: 20, windowMs: 60_000 });
  if (limited) return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 });

  const token = request.nextUrl.searchParams.get('token') || '';
  if (!UUID.test(token)) return NextResponse.json({ ok: false, error: "That invite link isn't valid." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    reportError('[affiliate/invite] Supabase env missing');
    return NextResponse.json({ ok: false, error: "We couldn't load your invite. You can still apply below." }, { status: 503 });
  }
  const crm = createClient(url, key, { db: { schema: 'crm' } });
  const { data, error } = await crm
    .from('beaker_invites')
    .select('token,email,first_name,last_name,company,opened_at,applied_at')
    .eq('token', token)
    .maybeSingle();
  if (error) {
    reportError('[affiliate/invite]', error);
    return NextResponse.json({ ok: false, error: "We couldn't load your invite. You can still apply below." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "That invite link isn't valid." }, { status: 404 });
  if (data.applied_at) {
    return NextResponse.json({ ok: false, error: "You've already joined with this invite. Sign in at crm.podlablv.com." }, { status: 409 });
  }
  if (!data.opened_at) {
    await crm.from('beaker_invites').update({ opened_at: new Date().toISOString() }).eq('token', token);
  }
  return NextResponse.json({
    ok: true,
    invite: { firstName: data.first_name, lastName: data.last_name, email: data.email, company: data.company },
  });
}
