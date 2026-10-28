// The referral card after an edit approval (lib/portal/referral-nudge.ts).
//
//   npm run test:nudge

import assert from 'node:assert/strict';
import { test as t } from 'node:test';
import { NUDGE_COPY, NUDGE_QUIET_DAYS, REFER_URL, nudgeAllowed } from '@/lib/portal/referral-nudge';

const NOW = new Date('2026-11-10T18:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

t('shows when never dismissed or the stamp is unreadable', () => {
  assert.equal(nudgeAllowed(null, NOW), true);
  assert.equal(nudgeAllowed(undefined, NOW), true);
  assert.equal(nudgeAllowed('', NOW), true);
  assert.equal(nudgeAllowed('not a date', NOW), true);
});

t('"Not now" quiets it for 30 days, then it can show again', () => {
  assert.equal(NUDGE_QUIET_DAYS, 30);
  assert.equal(nudgeAllowed(daysAgo(0), NOW), false);
  assert.equal(nudgeAllowed(daysAgo(29.9), NOW), false);
  assert.equal(nudgeAllowed(daysAgo(30), NOW), true);
  assert.equal(nudgeAllowed(daysAgo(90), NOW), true);
});

t('links to the free VSL application, and the copy has no em dash or emoji', () => {
  assert.equal(REFER_URL, 'https://freevsl.podlablv.com/apply');
  for (const [k, v] of Object.entries(NUDGE_COPY)) {
    assert.ok(!/—/.test(v), `${k} has an em dash`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(v), `${k} has an emoji`);
  }
  assert.match(NUDGE_COPY.how, /freevsl\.podlablv\.com\/apply/);
});
