// Portal v2 track D unit tests: notification batching, rate limit, quiet
// hours, SMS consent, message text, Twilio signature/keywords, the weekly
// check-in, TipTop's notes and asset-build guard. No network, no database.
//
//   npm run test:notify

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_HOLD_MS,
  QUIET_MS,
  RATE_MS,
  WINDOW_MS,
  burstReady,
  emailSubject,
  inSmsHours,
  localHour,
  notificationEmail,
  notificationSms,
  pending,
  planDelivery,
  rateOk,
  toE164,
  type ClientPrefs,
  type NotificationRow,
} from '@/lib/portal/notify-delivery';
import { keywordIntent, twilioSignature, validTwilioSignature } from '@/lib/portal/sms';
import { buildCheckin, isOverdue, localDate, wantsCheckin, weekKey } from '@/lib/tiptop/checkin';
import { mergeFacts, nextQuestion, parseFacts, renderFacts } from '@/lib/tiptop/understanding';
import { jobBlocker, isActiveJob } from '@/lib/tiptop/jobs';
import type { GamePlan } from '@/lib/portal/game-plan';

// Monday Oct 19 2026, 17:00 UTC = 10:00 in Los Angeles (PDT).
const NOW = Date.parse('2026-10-19T17:00:00Z');
const MIN = 60_000;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

let n = 0;
function row(p: Partial<NotificationRow> = {}): NotificationRow {
  n += 1;
  return {
    id: `r${n}`,
    client_id: 'c1',
    kind: 'review_ready',
    direction: 'done',
    title: `Update ${n}`,
    body: null,
    link: '/portal/projects',
    created_at: ago(30 * MIN),
    read_at: null,
    resolved_at: null,
    emailed_at: null,
    texted_at: null,
    ...p,
  };
}

const CLIENT: ClientPrefs = {
  id: 'c1',
  user_id: 'u1',
  email: 'jane@example.com',
  first_name: 'Jane',
  business_name: 'Jane Co',
  phone: '(702) 555-0142',
  timezone: 'America/Los_Angeles',
  notify_email: true,
  notify_sms: true,
  digest_opt_out: false,
  sms_consent_at: '2026-10-01T00:00:00Z',
  sms_opted_out_at: null,
};

// ── pending ──────────────────────────────────────────────────────────────

test('pending: unsent, unread, unresolved, inside the window', () => {
  assert.equal(pending(row(), 'email', NOW), true);
  assert.equal(pending(row({ emailed_at: ago(MIN) }), 'email', NOW), false);
  assert.equal(pending(row({ emailed_at: ago(MIN) }), 'sms', NOW), true, 'channels are independent');
  assert.equal(pending(row({ read_at: ago(MIN) }), 'email', NOW), false, 'already seen in the portal');
  assert.equal(pending(row({ direction: 'waiting', resolved_at: ago(MIN) }), 'email', NOW), false, 'they already did it');
  assert.equal(pending(row({ direction: 'done', resolved_at: ago(MIN) }), 'email', NOW), true, 'resolved only matters for waiting rows');
  assert.equal(pending(row({ created_at: ago(WINDOW_MS + MIN) }), 'email', NOW), false, 'never sent late');
});

// ── burst + rate ─────────────────────────────────────────────────────────

test('burst: waits for the burst to settle, but not past the max hold', () => {
  assert.equal(burstReady([row({ created_at: ago(2 * MIN) })], NOW), false);
  assert.equal(burstReady([row({ created_at: ago(QUIET_MS) })], NOW), true);
  // A steady trickle: newest is fresh, but the oldest has waited an hour.
  assert.equal(burstReady([row({ created_at: ago(MAX_HOLD_MS) }), row({ created_at: ago(MIN) })], NOW), true);
  assert.equal(burstReady([row({ created_at: ago(40 * MIN) }), row({ created_at: ago(MIN) })], NOW), false);
  assert.equal(burstReady([], NOW), false);
});

test('rate: at most one message per channel per client per hour', () => {
  assert.equal(rateOk([row({ emailed_at: ago(20 * MIN) }), row()], 'email', NOW), false);
  assert.equal(rateOk([row({ emailed_at: ago(RATE_MS) }), row()], 'email', NOW), true);
  assert.equal(rateOk([row({ emailed_at: ago(20 * MIN) })], 'sms', NOW), true);
  assert.equal(rateOk([row()], 'email', NOW), true);
});

// ── quiet hours + phone ──────────────────────────────────────────────────

test('quiet hours: 8am to 9pm in the client timezone', () => {
  assert.equal(localHour(NOW, 'America/Los_Angeles'), 10);
  assert.equal(localHour(NOW, 'America/New_York'), 13);
  assert.equal(localHour(NOW, 'Not/AZone'), 10, 'bad timezone falls back to Los Angeles');
  assert.equal(localHour(NOW, null), 10);
  assert.equal(inSmsHours(NOW, 'America/Los_Angeles'), true);
  assert.equal(inSmsHours(Date.parse('2026-10-19T14:59:00Z'), 'America/Los_Angeles'), false, '7:59am PT');
  assert.equal(inSmsHours(Date.parse('2026-10-19T15:00:00Z'), 'America/Los_Angeles'), true, '8:00am PT');
  assert.equal(inSmsHours(Date.parse('2026-10-20T03:59:00Z'), 'America/Los_Angeles'), true, '8:59pm PT');
  assert.equal(inSmsHours(Date.parse('2026-10-20T04:00:00Z'), 'America/Los_Angeles'), false, '9:00pm PT');
  assert.equal(inSmsHours(Date.parse('2026-10-20T04:00:00Z'), 'Pacific/Honolulu'), true, '6pm in Honolulu');
});

test('toE164', () => {
  assert.equal(toE164('(702) 555-0142'), '+17025550142');
  assert.equal(toE164('1-702-555-0142'), '+17025550142');
  assert.equal(toE164('+44 20 7946 0958'), '+442079460958');
  assert.equal(toE164('555-0142'), null);
  assert.equal(toE164(''), null);
  assert.equal(toE164(null), null);
});

// ── planDelivery ─────────────────────────────────────────────────────────

test('plan: a settled burst goes out as one email and one text', () => {
  const rows = [row({ created_at: ago(25 * MIN) }), row({ created_at: ago(15 * MIN), direction: 'waiting' }), row({ created_at: ago(12 * MIN) })];
  const p = planDelivery(CLIENT, rows, NOW, { smsConfigured: true });
  assert.equal(p.email.send, true);
  assert.deepEqual(p.email.rowIds, rows.map((r) => r.id));
  assert.equal(p.sms.send, true);
  assert.equal(p.sms.rowIds.length, 3);
});

test('plan: email off, digest opt-out, placeholder email', () => {
  const rows = [row()];
  assert.equal(planDelivery({ ...CLIENT, notify_email: false }, rows, NOW, { smsConfigured: true }).email.skip, 'email-off');
  assert.equal(planDelivery({ ...CLIENT, digest_opt_out: true }, rows, NOW, { smsConfigured: true }).email.skip, 'email-off');
  assert.equal(planDelivery({ ...CLIENT, email: 'x@unassigned.invalid' }, rows, NOW, { smsConfigured: true }).email.skip, 'email-off');
  assert.equal(planDelivery({ ...CLIENT, user_id: null }, rows, NOW, { smsConfigured: true }).email.skip, 'email-off', 'never signed up');
});

test('plan: SMS needs opt-in, consent, no STOP, a phone, Twilio, and daytime', () => {
  const rows = [row()];
  const sms = (c: Partial<ClientPrefs>, now = NOW, configured = true) => planDelivery({ ...CLIENT, ...c }, rows, now, { smsConfigured: configured }).sms;
  assert.equal(sms({}).send, true);
  assert.equal(sms({ notify_sms: false }).skip, 'sms-off');
  assert.equal(sms({ notify_sms: null }).skip, 'sms-off', 'default is off');
  assert.equal(sms({ sms_consent_at: null }).skip, 'no-consent');
  assert.equal(sms({ sms_consent_at: undefined }).skip, 'no-consent', 'column missing reads as no consent');
  assert.equal(sms({ sms_opted_out_at: ago(MIN) }).skip, 'opted-out');
  assert.equal(sms({ phone: null }).skip, 'no-phone');
  assert.equal(sms({}, NOW, false).skip, 'sms-unconfigured');
  assert.equal(sms({}, Date.parse('2026-10-20T06:00:00Z')).skip, 'quiet-hours', '11pm PT');
});

test('plan: rows held overnight go at 8am in one text', () => {
  const night = Date.parse('2026-10-20T06:00:00Z'); // 11pm PT
  const rows = [row({ created_at: new Date(night - 20 * MIN).toISOString() }), row({ created_at: new Date(night).toISOString() })];
  assert.equal(planDelivery(CLIENT, rows, night + 30 * MIN, { smsConfigured: true }).sms.skip, 'quiet-hours');
  const morning = Date.parse('2026-10-20T15:00:00Z'); // 8am PT
  const p = planDelivery(CLIENT, rows, morning, { smsConfigured: true });
  assert.equal(p.sms.send, true);
  assert.equal(p.sms.rowIds.length, 2);
});

test('plan: an open burst and the hourly limit both hold', () => {
  const fresh = [row({ created_at: ago(3 * MIN) })];
  assert.equal(planDelivery(CLIENT, fresh, NOW, { smsConfigured: true }).email.skip, 'burst-open');
  const rows = [row({ created_at: ago(90 * MIN), emailed_at: ago(30 * MIN), texted_at: ago(30 * MIN) }), row({ created_at: ago(20 * MIN) })];
  const p = planDelivery(CLIENT, rows, NOW, { smsConfigured: true });
  assert.equal(p.email.skip, 'rate-limited');
  assert.equal(p.sms.skip, 'rate-limited');
  assert.deepEqual(p.email.rowIds, [rows[1].id], 'only the unsent row is pending');
});

test('plan: nothing pending', () => {
  const p = planDelivery(CLIENT, [row({ emailed_at: ago(2 * RATE_MS), texted_at: ago(2 * RATE_MS) })], NOW, { smsConfigured: true });
  assert.equal(p.email.skip, 'nothing-pending');
  assert.equal(p.sms.skip, 'nothing-pending');
});

// ── messages ─────────────────────────────────────────────────────────────

test('email: subject, waiting first, escaped, links absolute', () => {
  const one = row({ title: 'Your VSL cut is ready' });
  assert.equal(emailSubject([one]), 'Your VSL cut is ready');
  const rows = [row({ title: 'Cut <b>ready</b>' }), row({ direction: 'waiting', title: 'Approve 2 scripts', link: '/portal/projects?f=needs' }), row({ direction: 'waiting', title: 'Upload your logo' })];
  assert.equal(emailSubject(rows), '2 things waiting on you in your PodLab portal');
  assert.equal(emailSubject([row(), row()]), '2 updates in your PodLab portal');
  const m = notificationEmail(rows, { firstName: 'Jane' });
  assert.ok(m.html.includes('Cut &lt;b&gt;ready&lt;/b&gt;'), 'titles are escaped');
  assert.ok(!m.html.includes('<b>ready'));
  assert.ok(m.html.indexOf('Approve 2 scripts') < m.html.indexOf('Cut &lt;b&gt;'), 'waiting before done');
  assert.ok(/https?:\/\/[^"]+\/portal\/projects\?f=needs/.test(m.html));
  assert.ok(m.text.includes('Waiting on you:'));
  assert.ok(m.html.includes('/portal/profile'), 'says how to turn them off');
});

test('email: external links never leave the portal', () => {
  const m = notificationEmail([row({ link: 'https://evil.example/phish' })], { firstName: null });
  assert.ok(!m.html.includes('evil.example'));
});

test('sms: one short text, STOP line, waiting first', () => {
  const s1 = notificationSms([row({ title: 'Your VSL cut is ready', link: '/portal/projects' })]);
  assert.ok(s1.startsWith('PodLab: Your VSL cut is ready.'));
  assert.ok(s1.endsWith('Reply STOP to opt out.'));
  const s3 = notificationSms([row(), row({ direction: 'waiting', title: 'Approve your script' }), row()]);
  assert.ok(s3.includes('1 thing waiting on you, starting with: Approve your script'));
  assert.ok(s3.length <= 320, `two segments max, got ${s3.length}`);
  const long = notificationSms([row({ title: 'x'.repeat(400) })]);
  assert.ok(long.length <= 320);
});

// ── Twilio ───────────────────────────────────────────────────────────────

test('twilio signature: accepts the right one, rejects a tampered body or URL', () => {
  const params = { Body: 'STOP', From: '+17025550142', To: '+17025550100' };
  const url = 'https://podlablv.com/api/twilio/portal-sms';
  const sig = twilioSignature('secret', url, params);
  assert.equal(validTwilioSignature('secret', sig, [url], params), true);
  assert.equal(validTwilioSignature('secret', sig, ['http://localhost/x', url], params), true, 'any candidate URL');
  assert.equal(validTwilioSignature('secret', sig, [url], { ...params, Body: 'START' }), false);
  assert.equal(validTwilioSignature('other', sig, [url], params), false);
  assert.equal(validTwilioSignature('secret', null, [url], params), false);
});

test('keywords', () => {
  for (const w of ['STOP', 'stop', ' Stop ', 'UNSUBSCRIBE', 'cancel', 'end', 'quit', 'STOPALL', 'stop.']) assert.equal(keywordIntent(w), 'stop', w);
  for (const w of ['START', 'unstop', 'Yes']) assert.equal(keywordIntent(w), 'start', w);
  for (const w of ['please stop texting me later', 'hello', '', null]) assert.equal(keywordIntent(w), null, String(w));
});

// ── weekly check-in ──────────────────────────────────────────────────────

function plan(p: Partial<GamePlan> = {}): GamePlan {
  return {
    id: 'p1',
    pillar: 'Sales',
    outcome: '10 booked calls by Dec 15',
    metric: 'booked calls',
    baseline: 0,
    target: 10,
    current: 2,
    dueOn: '2026-12-15',
    priorities: ['Offer page'],
    status: 'on track',
    lastCheckInAt: null,
    lastCheckIn: null,
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
    ...p,
  };
}

test('weekKey: ISO weeks, in Los Angeles time', () => {
  assert.equal(weekKey(NOW), '2026-W43');
  assert.equal(weekKey(Date.parse('2026-01-01T20:00:00Z')), '2026-W01', 'Thu Jan 1 2026');
  assert.equal(weekKey(Date.parse('2027-01-01T20:00:00Z')), '2026-W53', 'Fri Jan 1 2027 belongs to 2026');
  assert.equal(weekKey(Date.parse('2026-10-19T06:00:00Z')), '2026-W42', 'still Sunday night in LA');
  assert.equal(localDate(Date.parse('2026-10-19T06:00:00Z')), '2026-10-18');
});

test('check-in: who gets one', () => {
  assert.equal(wantsCheckin([], []), false);
  assert.equal(wantsCheckin([plan({ status: 'done' })], []), false);
  assert.equal(wantsCheckin([plan()], []), true);
  assert.equal(wantsCheckin([], [{ id: 'a', title: 'x', dueOn: null }]), true);
});

test('check-in: numbers, overdue items, one question', () => {
  const ck = buildCheckin({
    firstName: 'Jane',
    plans: [plan(), plan({ id: 'p2', pillar: 'Content', outcome: '24 videos posted', metric: 'videos posted', target: 24, current: 20 })],
    openItems: [
      { id: 'a1', title: 'Write the 3 objections', dueOn: '2026-10-14' },
      { id: 'a2', title: 'Book the shoot', dueOn: '2026-10-25' },
      { id: 'a3', title: 'Call 5 past clients', dueOn: null },
    ],
    today: '2026-10-19',
    now: NOW,
  });
  assert.ok(ck.message.startsWith("Jane, it's check-in day."));
  assert.ok(ck.message.includes('Sales: 2 of 10 booked calls by Dec 15, at risk'), ck.message);
  assert.ok(ck.message.indexOf('Sales:') < ck.message.indexOf('Content:'), 'worst pace first');
  assert.ok(ck.message.includes('"Write the 3 objections" (was due Oct 14)'));
  assert.ok(!ck.message.includes('"Book the shoot" (was due'));
  assert.ok(ck.message.includes('2 more open on your action list.'));
  assert.equal((ck.message.match(/\?/g) ?? []).length, 1, 'exactly one question');
  assert.ok(ck.message.endsWith("Start with Sales: how many booked calls so far?"));
  assert.equal(ck.title, 'Weekly check-in with TipTop');
  assert.ok(ck.body.includes('Sales 2/10 (at risk)'));
  assert.ok(ck.body.includes('1 past due'));
});

test('check-in: items only', () => {
  const ck = buildCheckin({ firstName: null, plans: [], openItems: [{ id: 'a1', title: 'Send the offer doc', dueOn: '2026-10-10' }], today: '2026-10-19', now: NOW });
  assert.ok(ck.message.startsWith("It's check-in day."));
  assert.ok(ck.message.endsWith('Start with "Send the offer doc": done, still on, or should we move it?'));
  assert.equal(isOverdue({ id: 'x', title: 'x', dueOn: '2026-10-19' }, '2026-10-19'), false, 'due today is not overdue');
});

test('check-in: items only, nothing late: names the next few', () => {
  const items = [
    { id: 'a', title: 'Later one', dueOn: null },
    { id: 'b', title: 'Soonest', dueOn: '2026-10-21' },
    { id: 'c', title: 'Second', dueOn: '2026-10-30' },
    { id: 'd', title: 'Fourth', dueOn: null },
  ];
  const ck = buildCheckin({ firstName: 'Sam', plans: [], openItems: items, today: '2026-10-19', now: NOW });
  assert.ok(ck.message.includes('On your list (4):\n- "Soonest" (due Oct 21)\n- "Second" (due Oct 30)\n- "Later one"\n- and 1 more'), ck.message);
  assert.ok(!ck.message.includes('more open on your action list'));
  assert.ok(ck.message.endsWith('Which one gets finished this week?'));
});

// ── notes + builds ───────────────────────────────────────────────────────

test('understanding: merge, clear, ask order, parse junk', () => {
  let f = mergeFacts({}, { offer: 'Cohort, $997', business: 'Coaching for realtors' }, 't1');
  assert.equal(nextQuestion(f), 'audience');
  f = mergeFacts(f, { offer: '', audience: 'New agents' }, 't2');
  assert.equal(f.offer, undefined, 'empty clears');
  assert.equal(nextQuestion(f), 'offer');
  assert.deepEqual(parseFacts({ offer: { value: '  ' }, bogus: { value: 'x' }, goal: { value: '20 seats', at: 't' } }), { goal: { value: '20 seats', at: 't' } });
  assert.ok(renderFacts(f).includes('Still unknown, ask in this order, one at a time: offer, numbers'));
  assert.ok(renderFacts({}).includes('(nothing yet)'));
});

test('builds: one per kind at a time, capped per 30 days', () => {
  const day = 86_400_000;
  const j = (kind: string, status: string | null, daysAgo: number) => ({ id: `${kind}${daysAgo}`, kind, status, created_at: new Date(NOW - daysAgo * day).toISOString() });
  assert.equal(jobBlocker('assetslab', [], NOW), null);
  assert.ok(jobBlocker('assetslab', [j('assetslab', 'queued', 1)], NOW)?.includes('already queued'));
  assert.ok(jobBlocker('assetslab', [j('assetslab', null, 1)], NOW), 'null status counts as queued');
  assert.equal(jobBlocker('assetslab', [j('assetslab', 'done', 1)], NOW), null);
  assert.equal(jobBlocker('vsl_pack', [j('assetslab', 'running', 1)], NOW), null);
  const four = [j('assetslab', 'done', 1), j('vsl_pack', 'done', 2), j('brand_kit', 'failed', 3), j('assetslab', 'done', 4)];
  assert.ok(jobBlocker('vsl_pack', four, NOW)?.includes('4 builds'));
  assert.equal(jobBlocker('vsl_pack', four.map((x, i) => ({ ...x, created_at: new Date(NOW - (31 + i) * day).toISOString() })), NOW), null);
  assert.equal(isActiveJob('Running'), true);
  assert.equal(isActiveJob('done'), false);
});
