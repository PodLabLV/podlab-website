// The ELITE Studio Day: who gets it, when it counts as booked, and the email
// block (lib/portal/studio-day.ts, lib/portal/studio-day-email.ts).
//
//   npm run test:studioday

import assert from 'node:assert/strict';
import { test as t } from 'node:test';
import {
  DEFAULT_STUDIO_DAY_URL,
  STUDIO_BOOKED_TAG,
  STUDIO_COPY,
  isElite,
  isStudioDayEvent,
  pickStudioBooking,
  studioDayState,
  studioDayUrl,
  formatStudioDay,
} from '@/lib/portal/studio-day';
import { EL_WELCOME_ON_FILE, studioDayEmailBlock } from '@/lib/portal/studio-day-email';
import { emailLayout } from '@/lib/portal-email';

const NOW = new Date('2026-10-28T18:00:00Z');

t('the link lives in one place and prefills name and email', () => {
  assert.equal(DEFAULT_STUDIO_DAY_URL, 'https://calendly.com/podlablv/essentialslab-elite-studio-day');
  const u = new URL(studioDayUrl('Jane Doe', 'Jane@Example.com', DEFAULT_STUDIO_DAY_URL));
  assert.equal(u.origin + u.pathname, DEFAULT_STUDIO_DAY_URL);
  assert.equal(u.searchParams.get('name'), 'Jane Doe');
  assert.equal(u.searchParams.get('email'), 'jane@example.com');
  assert.equal(new URL(studioDayUrl('', 'x@y.invalid', DEFAULT_STUDIO_DAY_URL)).search, '');
  // A link that already carries name/email (the Hermes one) is left alone.
  const pre = `${DEFAULT_STUDIO_DAY_URL}?name=A+B&email=a%40b.com`;
  assert.equal(new URL(studioDayUrl('Other', 'other@x.com', pre)).searchParams.get('email'), 'a@b.com');
});

t('ELITE from tier, plan label, product or payment; core and others are not', () => {
  assert.equal(isElite({ tier: 'elite' }), true);
  assert.equal(isElite({ planLabel: 'EssentialsLab ELITE' }), true);
  assert.equal(isElite({ planLabel: 'EssentialsLab ELITE + AssetsLab + TLC' }), true);
  assert.equal(isElite({ planLabel: 'EssentialsLab', labKeys: ['essentialslab-elite-pmt-1'] }), true);
  assert.equal(isElite({ products: ['essentialslab-elite'] }), true);
  assert.equal(isElite({ planLabel: 'EssentialsLab', labKeys: ['essentialslab-core'] }), false);
  assert.equal(isElite({ planLabel: 'Free VSL' }), false);
  assert.equal(isElite({}), false);
});

t('only the ELITE Studio Day event counts', () => {
  assert.equal(isStudioDayEvent('EssentialsLab ELITE Studio Day'), true);
  assert.equal(isStudioDayEvent('Free VSL — Studio Session'), false);
  assert.equal(isStudioDayEvent('Mission to 100 google reviews — Studio Session'), false);
  assert.equal(isStudioDayEvent(null), false);
});

t('booked = a live Studio Day row; canceled or deleted rows do not count', () => {
  const ev = 'EssentialsLab ELITE Studio Day';
  assert.equal(pickStudioBooking([], NOW), null);
  assert.equal(pickStudioBooking([{ event_name: ev, status: 'canceled', start_at: '2026-11-04T17:00:00Z' }], NOW), null);
  assert.equal(pickStudioBooking([{ event_name: ev, status: 'booked', start_at: '2026-11-04T17:00:00Z', event_deleted_at: '2026-10-27T00:00:00Z' }], NOW), null);
  assert.equal(pickStudioBooking([{ event_name: 'Free VSL — Studio Session', status: 'booked', start_at: '2026-11-04T17:00:00Z' }], NOW), null);
  // Rescheduled: old canceled, new booked -> the new one.
  const pick = pickStudioBooking(
    [
      { event_name: ev, status: 'canceled', start_at: '2026-11-01T17:00:00Z' },
      { event_name: ev, status: 'booked', start_at: '2026-11-12T17:00:00Z' },
      { event_name: ev, status: 'booked', start_at: '2026-11-05T17:00:00Z' },
    ],
    NOW,
  );
  assert.equal(pick?.start_at, '2026-11-05T17:00:00Z');
  // Already filmed: still booked (the button stays gone).
  assert.equal(pickStudioBooking([{ event_name: ev, status: 'booked', start_at: '2026-10-01T17:00:00Z' }], NOW)?.start_at, '2026-10-01T17:00:00Z');
});

t('state: button for ELITE until booked; nothing for core', () => {
  const base = DEFAULT_STUDIO_DAY_URL;
  assert.deepEqual(studioDayState({ elite: false, booking: null, base }), { eligible: false, booked: false, startAt: null, url: null });
  const open = studioDayState({ elite: true, booking: null, name: 'Jane Doe', email: 'jane@example.com', base });
  assert.equal(open.eligible && !open.booked, true);
  assert.ok(open.url?.startsWith(base + '?'));
  const booked = studioDayState({ elite: true, booking: { event_name: 'EssentialsLab ELITE Studio Day', status: 'booked', start_at: '2026-11-05T17:00:00Z' }, base });
  assert.deepEqual(booked, { eligible: true, booked: true, startAt: '2026-11-05T17:00:00Z', url: null });
  const tagged = studioDayState({ elite: true, booking: null, tags: ['x', STUDIO_BOOKED_TAG], base });
  assert.equal(tagged.booked, true);
  assert.equal(tagged.url, null);
});

t('booked date reads in Las Vegas time', () => {
  assert.equal(formatStudioDay('2026-11-05T17:00:00Z'), 'Thursday, November 5 at 9:00 AM');
  assert.equal(formatStudioDay(null), null);
});

t('client copy has no em dash, no emoji, and the contact is info@', () => {
  const all = [...Object.values(STUDIO_COPY), ...Object.values(EL_WELCOME_ON_FILE)];
  for (const v of all) {
    assert.ok(!/—/.test(v), `em dash in: ${v}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(v), `emoji in: ${v}`);
  }
  assert.ok(STUDIO_COPY.bookedBody.includes('info@podlablv.com'));
  assert.ok(EL_WELCOME_ON_FILE.lead.includes("there's nothing to fill out"));
});

t('the email block renders inside the Portal frame with an escaped link', () => {
  const url = studioDayUrl('Jane Doe', 'jane@example.com', DEFAULT_STUDIO_DAY_URL);
  const block = studioDayEmailBlock(url);
  const html = emailLayout({ title: 'Welcome', content: block.html.join('\n') });
  assert.ok(html.includes('Book your Studio Day &rarr;'));
  assert.ok(html.includes('href="https://calendly.com/podlablv/essentialslab-elite-studio-day?name=Jane+Doe&amp;email=jane%40example.com"'));
  assert.ok(block.text[0].includes(url));
});
