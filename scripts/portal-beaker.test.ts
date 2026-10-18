import test from 'node:test';
import assert from 'node:assert/strict';
import { TAB_ROUTES, activeTab, beakerOnlyAllowed, tabsFor } from '@/lib/portal/tabs';
import {
  contactLooksValid,
  likeExact,
  moneyTotals,
  nextPayoutDate,
  payoutLine,
  plainStatus,
  setupSteps,
  splitContact,
  termsCurrent,
  toolkit,
  type LedgerRow,
} from '@/lib/portal/beaker-view';
import { planBeakerNotifications } from '@/lib/portal/beaker-notify';
import { resolveBeaker } from '@/lib/portal/beaker-account';

// ── tabs ─────────────────────────────────────────────────────────────────

test('tabs: a client who is not a Beaker sees exactly the four tabs, as before', () => {
  const t = tabsFor({ client: true, beaker: false });
  assert.deepEqual(t.map((x) => x.label), ['Dashboard', 'TipTop', 'Assets', 'Projects']);
  assert.equal(t, TAB_ROUTES);
});

test('tabs: a client who is a Beaker sees five; a Beaker with no client account sees only Beaker', () => {
  assert.deepEqual(tabsFor({ client: true, beaker: true }).map((x) => x.label), ['Dashboard', 'TipTop', 'Assets', 'Projects', 'Beaker']);
  assert.deepEqual(tabsFor({ client: false, beaker: true }).map((x) => x.label), ['Beaker']);
  // Nobody set up yet: unchanged (the pages explain).
  assert.equal(tabsFor({ client: false, beaker: false }).length, 4);
});

test('tabs: /portal/beaker and the old /portal/referrals light up Beaker; Dashboard is not active for a Beaker-only account', () => {
  assert.equal(activeTab('/portal/beaker'), '/portal/beaker');
  assert.equal(activeTab('/portal/referrals'), '/portal/beaker');
  assert.equal(activeTab('/portal', tabsFor({ client: false, beaker: true })), null);
  assert.equal(activeTab('/portal/invoices'), '/portal');
  assert.equal(beakerOnlyAllowed('/portal/beaker'), true);
  assert.equal(beakerOnlyAllowed('/portal/profile'), true);
  assert.equal(beakerOnlyAllowed('/portal'), false);
  assert.equal(beakerOnlyAllowed('/portal/projects'), false);
  assert.equal(beakerOnlyAllowed('/portal/beakerx'), false);
});

// ── plain language ───────────────────────────────────────────────────────

test('status: CRM stages read as Submitted → Talking → Bought / Not a fit', () => {
  assert.equal(plainStatus('NEW LEAD'), 'submitted');
  assert.equal(plainStatus('DATABASE ONLY'), 'submitted');
  assert.equal(plainStatus(null), 'submitted');
  assert.equal(plainStatus('DISCOVERY CALL BOOKED'), 'talking');
  assert.equal(plainStatus('PENDING/NEGOTIATIONS'), 'talking');
  assert.equal(plainStatus('S4-SCRIPTS'), 'talking');
  assert.equal(plainStatus('CLOSED WON'), 'bought');
  assert.equal(plainStatus('closed-won'), 'bought');
  assert.equal(plainStatus('CLOSED LOST'), 'not_fit');
  assert.equal(plainStatus('DISQUALIFIED'), 'not_fit');
  assert.equal(plainStatus('NO-SHOW'), 'not_fit');
  // Money earned always means they bought, whatever the board says.
  assert.equal(plainStatus('NEW LEAD', 15000), 'bought');
});

const row = (p: Partial<LedgerRow>): LedgerRow => ({
  id: Math.random().toString(36).slice(2),
  lead_id: 'L1',
  lead_name: 'Jane — Acme',
  kind: 'commission',
  amount_cents: 0,
  effective_status: 'held',
  hold_until: null,
  paid_at_source: null,
  payout_id: null,
  created_at: '2026-10-01T00:00:00Z',
  ...p,
});

test('money: earned, on hold, ready and paid out add up from the ledger', () => {
  const ledger = [
    row({ amount_cents: 15000, effective_status: 'held', hold_until: '2026-11-20T00:00:00Z' }),
    row({ amount_cents: 5000, effective_status: 'disputed', hold_until: '2026-11-05T00:00:00Z' }),
    row({ amount_cents: 30000, effective_status: 'payable' }),
    row({ amount_cents: 20000, effective_status: 'payable', payout_id: 'p1' }), // claimed by a run in flight
    row({ amount_cents: 40000, effective_status: 'paid', payout_id: 'p0' }),
    row({ amount_cents: 99900, effective_status: 'void' }),
    row({ amount_cents: -2000, kind: 'clawback', effective_status: 'payable' }),
  ];
  const m = moneyTotals(ledger, [{ id: 'p0', amount_cents: 40000, period_label: 'x', method: null, sent_at: '2026-10-01T00:00:00Z' }]);
  assert.equal(m.earnedCents, 15000 + 5000 + 30000 + 20000 + 40000 - 2000);
  assert.equal(m.onHoldCents, 20000);
  assert.equal(m.readyCents, 28000);
  assert.equal(m.paidCents, 40000);
  assert.equal(m.nextClearsOn, '2026-11-05T00:00:00Z');
});

test('money: next payout is the 1st or the 14th, Pacific', () => {
  assert.equal(nextPayoutDate(new Date('2026-10-18T20:00:00Z')), '2026-11-01');
  assert.equal(nextPayoutDate(new Date('2026-10-05T20:00:00Z')), '2026-10-14');
  assert.equal(nextPayoutDate(new Date('2026-12-20T20:00:00Z')), '2027-01-01');
  // 03:00 UTC on Oct 14 is still Oct 13 in Las Vegas.
  assert.equal(nextPayoutDate(new Date('2026-10-14T03:00:00Z')), '2026-10-14');
});

test('money: payout setup and the one-line answer to "when do I get paid"', () => {
  const done = { whopLinked: true, whopUsername: 'jane', termsCurrent: true, termsVersion: 'v2026.09.28', w9: 'received' as const };
  const fresh = { ...done, whopLinked: false, whopUsername: null, termsCurrent: false, w9: 'missing' as const };
  assert.deepEqual(setupSteps(done), []);
  assert.deepEqual(setupSteps(fresh), ['whop', 'terms', 'w9']);
  const zero = { earnedCents: 0, onHoldCents: 0, readyCents: 0, paidCents: 0, nextClearsOn: null };
  assert.match(payoutLine(zero, fresh, '2026-11-01'), /first payout/);
  assert.match(payoutLine({ ...zero, onHoldCents: 15000, nextClearsOn: '2026-11-20' }, done, '2026-11-01'), /\$150 is on its 45-day hold; the next part clears Nov 20/);
  assert.match(payoutLine({ ...zero, readyCents: 25000 }, fresh, '2026-11-01'), /finish payout setup/);
  assert.match(payoutLine({ ...zero, readyCents: 5000 }, done, '2026-11-01'), /start at \$100/);
  assert.equal(payoutLine({ ...zero, readyCents: 25000 }, done, '2026-11-01'), '$250 goes to your Whop account (@jane) on the Nov 1 run.');
  assert.equal(termsCurrent({ terms_version: null, agreement_version: 'v2026.10.02b' }), true);
  assert.equal(termsCurrent({ terms_version: null, agreement_version: 'v2026.08.19' }), false);
});

test('toolkit: every message carries their link and the commission disclosure (§7.1)', () => {
  const k = toolkit('https://podlablv.com/?ref=jane-doe', 'Jane Doe');
  for (const body of [k.text, k.email, k.social]) {
    assert.ok(body.includes('https://podlablv.com/?ref=jane-doe'));
    assert.match(body, /commission/);
    assert.doesNotMatch(body, /guarantee/i);
  }
});

test('refer form: one field takes an email or a phone', () => {
  assert.deepEqual(splitContact(' Jane@X.com '), { email: 'jane@x.com', phone: '' });
  assert.deepEqual(splitContact('(702) 555-0101'), { email: '', phone: '(702) 555-0101' });
  assert.equal(contactLooksValid('jane@x.com'), true);
  assert.equal(contactLooksValid('jane@x'), false);
  assert.equal(contactLooksValid('555-0101'), true);
  assert.equal(contactLooksValid('12'), false);
  assert.equal(likeExact('First_Last@X.com'), 'first\\_last@x.com');
});

// ── notifications ────────────────────────────────────────────────────────

test('notifications: one row per event in the window, deduped by ref', () => {
  const since = '2026-10-15T00:00:00Z';
  const rows = planBeakerNotifications({
    since,
    leads: [
      { id: 'L1', name: 'Jane Doe — Acme', stage: 'CLOSED WON', attributed_at: '2026-10-16T00:00:00Z' },
      { id: 'L2', name: 'Old Lead', stage: 'NEW LEAD', attributed_at: '2026-09-01T00:00:00Z' },
    ],
    events: [
      { lead_id: 'L1', to_stage: 'DISCOVERY CALL BOOKED', created_at: '2026-10-16T01:00:00Z' },
      { lead_id: 'L1', to_stage: 'SALES CALL BOOKED', created_at: '2026-10-16T02:00:00Z' }, // still Talking: no second row
      { lead_id: 'L1', to_stage: 'CLOSED WON', created_at: '2026-10-17T00:00:00Z' },
      { lead_id: 'L2', to_stage: 'CLOSED LOST', created_at: '2026-10-10T00:00:00Z' }, // before the window
      { lead_id: 'LX', to_stage: 'CLOSED WON', created_at: '2026-10-17T00:00:00Z' }, // not their lead
    ],
    commissions: [
      { id: 'C1', lead_id: 'L1', lead_name: 'Jane Doe — Acme', kind: 'commission', amount_cents: 15000, hold_until: '2026-12-01T00:00:00Z', created_at: '2026-10-17T00:00:00Z' },
      { id: 'C0', lead_id: 'L1', lead_name: 'Jane Doe — Acme', kind: 'commission', amount_cents: 15000, hold_until: null, created_at: '2026-09-17T00:00:00Z' },
    ],
    payouts: [{ id: 'P1', amount_cents: 40000, method: 'whop', sent_at: '2026-10-15T12:00:00Z' }],
  });
  assert.deepEqual(rows.map((r) => r.ref), ['beaker:lead:L1:credited', 'beaker:lead:L1:talking', 'beaker:lead:L1:bought', 'beaker:comm:C1', 'beaker:payout:P1']);
  assert.equal(rows[2].title, 'Jane Doe became a PodLab client');
  assert.equal(rows[3].title, 'You earned $150 from Jane Doe');
  // Server-written dates are Las Vegas dates: 00:00 UTC Dec 1 is Nov 30 there.
  assert.match(rows[3].body ?? '', /Nov 30/);
  assert.equal(rows[4].title, '$400 paid to your Whop account');
  assert.ok(rows.every((r) => r.direction === 'done' && r.link?.startsWith('/portal/beaker')));
});

// ── who is a Beaker ──────────────────────────────────────────────────────

const AFF = { id: 'a1', beaker_id: 'jane-doe', full_name: 'Jane Doe', email: 'Jane@Example.com', status: 'approved', kind: 'affiliate', profile_id: 'u-jane', whop_user_id: null, whop_username: null, w9_status: 'missing', terms_version: null, agreement_version: 'v2026.10.02b', auto_payout: false };

function fakeDb(user: Record<string, unknown>, tables: Record<string, Array<Record<string, unknown>>>, staff: string[] = []) {
  const from = (t: string) => {
    let rows = tables[t] ?? [];
    const q = {
      select: () => q,
      eq: (col: string, v: unknown) => ((rows = rows.filter((r) => r[col] === v)), q),
      ilike: (col: string, v: string) => ((rows = rows.filter((r) => String(r[col]).toLowerCase() === v.replace(/\\(.)/g, '$1'))), q),
      limit: () => q,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    };
    return q;
  };
  return {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (t: string) => (t === 'portal_staff' ? from('portal_staff_rows') : from(t)),
    schema: () => ({ from: (t: string) => from(`crm.${t}`) }),
    _staff: staff,
  } as never;
}
const req = (method = 'GET', headers: Record<string, string> = {}) => new Request('https://x/api', { method, headers: { authorization: 'Bearer t', ...headers } });

test('who: an affiliate-only login is matched by the CRM login it was given', async () => {
  const db = fakeDb({ id: 'u-jane', email: 'jane.other@x.com', email_confirmed_at: null }, { 'crm.affiliates': [AFF] });
  const b = await resolveBeaker(req(), db);
  assert.equal(b?.affiliate.beaker_id, 'jane-doe');
  assert.equal(b?.clientId, null);
  assert.equal(b?.readOnly, false);
});

test('who: by email only once the email is confirmed', async () => {
  const aff = { ...AFF, profile_id: null };
  const unconfirmed = fakeDb({ id: 'u-x', email: 'jane@example.com', email_confirmed_at: null }, { 'crm.affiliates': [aff] });
  assert.equal(await resolveBeaker(req(), unconfirmed), null);
  const confirmed = fakeDb({ id: 'u-x', email: 'jane@example.com', email_confirmed_at: '2026-10-01T00:00:00Z' }, { 'crm.affiliates': [aff] });
  assert.equal((await resolveBeaker(req(), confirmed))?.affiliate.id, 'a1');
});

test('who: a client owner who is a Beaker gets their client id for notifications', async () => {
  const aff = { ...AFF, profile_id: null };
  const db = fakeDb({ id: 'u-owner', email: 'owner@x.com', email_confirmed_at: null }, { 'crm.affiliates': [aff], portal_clients: [{ id: 'c1', email: 'jane@example.com', user_id: 'u-owner', crm_lead_id: 'L9' }] });
  const b = await resolveBeaker(req(), db);
  assert.equal(b?.clientId, 'c1');
  assert.equal(b?.clientCrmLeadId, 'L9');
});

test('who: paused, terminated and JV partners are not Beakers here; nobody is matched without a token', async () => {
  for (const patch of [{ status: 'paused' }, { status: 'terminated' }, { kind: 'jv_partner' }]) {
    const db = fakeDb({ id: 'u-jane', email: 'jane@example.com', email_confirmed_at: '2026-10-01' }, { 'crm.affiliates': [{ ...AFF, ...patch }] });
    assert.equal(await resolveBeaker(req(), db), null);
  }
  const db = fakeDb({ id: 'u-jane', email: 'x' }, { 'crm.affiliates': [AFF] });
  assert.equal(await resolveBeaker(new Request('https://x/api'), db), null);
});

test('who: a staff preview is read-only and refuses writes', async () => {
  const id = '11111111-2222-3333-4444-555555555555';
  const tables = {
    'crm.affiliates': [AFF],
    portal_clients: [{ id, email: 'jane@example.com', user_id: 'u-jane', crm_lead_id: null }],
    portal_staff_rows: [{ email: 'hiram@podlablv.com', name: 'Hiram' }],
  };
  const staffUser = { id: 'u-staff', email: 'hiram@podlablv.com', email_confirmed_at: '2026-01-01' };
  const read = await resolveBeaker(req('GET', { 'x-portal-view-as': id }), fakeDb(staffUser, tables));
  assert.equal(read?.readOnly, true);
  assert.equal(read?.clientId, id);
  assert.equal(await resolveBeaker(req('POST', { 'x-portal-view-as': id }), fakeDb(staffUser, tables)), null);
});
