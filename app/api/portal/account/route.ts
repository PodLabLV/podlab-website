import { NextResponse } from 'next/server';
import { reportError } from '@/lib/alerts';
import { admin, logToCrm, resolveCaller } from '@/lib/portal-server';
import { recordActivity } from '@/lib/portal/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Profile (portal v2): the account sections that need the service role.
 *
 * GET   → { email, loginEmail, isOwner, phone, prefs, credits, invoices }
 *         prefs   = { ready, notifyEmail, notifySms }
 *         credits = { ready, balance, ledger[] } from portal_credit_ledger
 * PATCH { notifyEmail?: boolean, notifySms?: boolean } — notification delivery
 *       preferences on portal_clients. Turning texts on needs a phone on file
 *       and records when they opted in (A2P consent trail).
 *
 * Name, phone, business, website, timezone and the daily-digest switch stay on
 * /api/portal/profile.
 */

interface LedgerRow {
  id: string;
  delta: number;
  reason: string;
  note: string | null;
  expires_on: string | null;
  created_at: string;
}

export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  const [client, prefs, balance, ledger, invoices] = await Promise.all([
    db.from('portal_clients').select('email, phone').eq('id', caller.clientId).maybeSingle(),
    db.from('portal_clients').select('notify_email, notify_sms').eq('id', caller.clientId).maybeSingle(),
    db.from('portal_credit_balance').select('balance').eq('client_id', caller.clientId).maybeSingle(),
    db.from('portal_credit_ledger').select('id, delta, reason, note, expires_on, created_at').eq('client_id', caller.clientId).order('created_at', { ascending: false }).limit(100),
    db
      .from('portal_invoices')
      .select('id, invoice_no, description, amount_cents, status, issued_on, due_on, paid_at, hosted_invoice_url, receipt_url, pdf_url')
      .eq('client_id', caller.clientId)
      .order('issued_on', { ascending: false, nullsFirst: false }),
  ]);

  return NextResponse.json(
    {
      email: client.data?.email ?? caller.email,
      loginEmail: caller.email,
      isOwner: !caller.member,
      phone: (client.data?.phone as string | null) ?? null,
      prefs: {
        ready: !prefs.error,
        notifyEmail: prefs.data?.notify_email ?? true,
        notifySms: prefs.data?.notify_sms ?? false,
      },
      credits: {
        ready: !balance.error && !ledger.error,
        balance: Number(balance.data?.balance ?? 0),
        ledger: ((ledger.data ?? []) as LedgerRow[]).map((r) => ({
          id: r.id,
          delta: r.delta,
          reason: r.reason,
          note: r.note,
          expiresOn: r.expires_on,
          createdAt: r.created_at,
        })),
      },
      invoices: (invoices.data ?? [])
        .filter((i: { status: string | null }) => !/^void/i.test(i.status ?? ''))
        .map((i: Record<string, unknown>) => ({
          id: String(i.id),
          invoiceNo: (i.invoice_no as string | null) ?? null,
          description: (i.description as string | null) ?? null,
          amountCents: Number(i.amount_cents ?? 0),
          status: String(i.status ?? 'Open'),
          issuedOn: (i.issued_on as string | null) ?? null,
          dueOn: (i.due_on as string | null) ?? null,
          paidAt: (i.paid_at as string | null) ?? null,
          payUrl: (i.hosted_invoice_url as string | null) ?? null,
          receiptUrl: ((i.receipt_url ?? i.pdf_url) as string | null) ?? null,
        })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PATCH(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  let p: { notifyEmail?: unknown; notifySms?: unknown };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (p.notifyEmail !== undefined) {
    if (typeof p.notifyEmail !== 'boolean') return NextResponse.json({ error: 'notifyEmail must be true or false.' }, { status: 400 });
    patch.notify_email = p.notifyEmail;
  }
  if (p.notifySms !== undefined) {
    if (typeof p.notifySms !== 'boolean') return NextResponse.json({ error: 'notifySms must be true or false.' }, { status: 400 });
    if (p.notifySms) {
      const { data } = await db.from('portal_clients').select('phone').eq('id', caller.clientId).maybeSingle();
      if (!data?.phone) return NextResponse.json({ error: 'Add a mobile number in your details first, then switch texts on.' }, { status: 409 });
    }
    patch.notify_sms = p.notifySms;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  const { error } = await db.from('portal_clients').update(patch).eq('id', caller.clientId);
  if (error) {
    reportError('[portal] notification prefs save failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  // Text opt-in / opt-out: keep a timestamped trail tied to the client (A2P consent).
  if (p.notifySms !== undefined) {
    const { error: stampErr } = await db
      .from('portal_clients')
      .update(p.notifySms ? { notify_sms_opted_in_at: new Date().toISOString() } : { notify_sms_opted_out_at: new Date().toISOString() })
      .eq('id', caller.clientId);
    if (stampErr && !/notify_sms_opted/.test(stampErr.message)) reportError('[portal] sms consent stamp failed', stampErr.message);
    const line = `${caller.displayName} turned portal text updates ${p.notifySms ? 'on' : 'off'}`;
    await recordActivity(db, caller.clientId, 'update', line);
    await logToCrm(db, caller, line);
  }
  return NextResponse.json({ ok: true });
}
