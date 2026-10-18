import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDIT_PACKS,
  EDIT_TYPES,
  dueDate,
  editCost,
  expiryFor,
  packFor,
  walletState,
  type LedgerRow,
} from '@/lib/portal/credits';
import { assetKind, assetState, countByState, reviewRef, scriptState, sortItems, type ProjectItem } from '@/lib/portal/projects';
import { cardDescription, cleanLinks } from '@/lib/portal/submissions-server';

let n = 0;
const row = (delta: number, at: string, extra: Partial<LedgerRow> = {}): LedgerRow => ({
  id: `r${++n}`,
  delta,
  reason: delta > 0 ? 'purchase' : 'submission',
  ref: null,
  expires_on: null,
  note: null,
  created_at: at,
  ...extra,
});

test('packs: the spec prices, per-credit math, one key each', () => {
  assert.deepEqual(
    CREDIT_PACKS.map((p) => [p.credits, p.price, p.kind]),
    [
      [1, 250, 'one_time'],
      [3, 600, 'one_time'],
      [8, 1400, 'one_time'],
      [10, 1500, 'monthly'],
    ],
  );
  for (const p of CREDIT_PACKS) assert.equal(p.perCredit, Math.round(p.price / p.credits));
  assert.equal(new Set(CREDIT_PACKS.map((p) => p.key)).size, CREDIT_PACKS.length);
  assert.equal(packFor('credits-8')?.credits, 8);
  assert.equal(packFor('nope'), null);
});

test('expiry: packs 90 days, monthly two months (one month of rollover)', () => {
  const from = new Date('2026-10-18T15:00:00Z');
  assert.equal(expiryFor(packFor('credits-3')!, from), '2027-01-16');
  assert.equal(expiryFor(packFor('credits-monthly-10')!, from), '2026-12-18');
});

test('edit cost: 1 / 2 / 4, rush +1, each extra round +1, nonsense refused', () => {
  assert.deepEqual(EDIT_TYPES.map((t) => t.credits), [1, 2, 4]);
  assert.equal(editCost({ type: 'short' }), 1);
  assert.equal(editCost({ type: 'long' }), 2);
  assert.equal(editCost({ type: 'premium' }), 4);
  assert.equal(editCost({ type: 'short', rush: true }), 2);
  assert.equal(editCost({ type: 'long', rush: true, extraRounds: 2 }), 5);
  assert.equal(editCost({ type: 'short', extraRounds: -1 }), null);
  assert.equal(editCost({ type: 'short', extraRounds: 4 }), null);
  assert.equal(editCost({ type: 'mega' as never }), null);
});

test('due date: business days skip weekends; rush is 48 hours', () => {
  // Fri Oct 16 2026 + 5 business days = Fri Oct 23.
  assert.equal(dueDate({ type: 'short' }, new Date('2026-10-16T18:00:00Z')), '2026-10-23');
  assert.equal(dueDate({ type: 'premium' }, new Date('2026-10-16T18:00:00Z')), '2026-10-27');
  assert.equal(dueDate({ type: 'short', rush: true }, new Date('2026-10-16T18:00:00Z')), '2026-10-18');
});

test('wallet: balance is the sum; spends take from the lot that expires first', () => {
  const a = row(3, '2026-07-01T00:00:00Z', { expires_on: '2026-09-29' });
  const b = row(8, '2026-08-01T00:00:00Z', { expires_on: '2026-10-30' });
  const spend = row(-2, '2026-08-05T00:00:00Z');
  const w = walletState([a, b, spend], '2026-09-01');
  assert.equal(w.balance, 9);
  assert.equal(w.lots.find((l) => l.id === a.id)!.remaining, 1);
  assert.equal(w.lots.find((l) => l.id === b.id)!.remaining, 8);
  assert.deepEqual(w.nextExpiry, { on: '2026-09-29', credits: 1 });
  assert.equal(w.pendingExpiry.length, 0);
});

test('wallet: a lapsed lot leaves the spendable balance before its expired row exists, and the row settles it', () => {
  const a = row(3, '2026-06-01T00:00:00Z', { expires_on: '2026-08-30' });
  const b = row(1, '2026-08-01T00:00:00Z', { expires_on: '2026-10-30' });
  const spend = row(-1, '2026-08-10T00:00:00Z');
  const before = walletState([a, b, spend], '2026-09-15');
  assert.equal(before.ledgerBalance, 3);
  assert.equal(before.balance, 1, 'lot a (2 left) lapsed on Aug 30');
  assert.deepEqual(before.pendingExpiry, [{ lotId: a.id, delta: -2, ref: `expire:${a.id}`, expires_on: '2026-08-30' }]);

  const settled = walletState([a, b, spend, row(-2, '2026-09-15T00:00:00Z', { reason: 'expired', ref: `expire:${a.id}` })], '2026-09-15');
  assert.equal(settled.ledgerBalance, 1);
  assert.equal(settled.balance, 1);
  assert.equal(settled.pendingExpiry.length, 0, 'never expires the same lot twice');
});

test('wallet: a spend never takes from a lot that had already expired that day', () => {
  const old = row(2, '2026-01-01T00:00:00Z', { expires_on: '2026-03-31' });
  const fresh = row(3, '2026-04-02T00:00:00Z', { expires_on: '2026-07-01' });
  const spend = row(-1, '2026-04-05T00:00:00Z');
  const w = walletState([old, fresh, spend], '2026-04-05');
  assert.equal(w.lots.find((l) => l.id === fresh.id)!.remaining, 2);
  assert.equal(w.lots.find((l) => l.id === old.id)!.remaining, 2);
  assert.equal(w.balance, 2, 'the old lot (2) is lapsed, fresh has 2 left');
});

test('wallet: a refund is a new lot; empty ledger is zero', () => {
  assert.equal(walletState([]).balance, 0);
  const w = walletState([row(2, '2026-10-01T00:00:00Z', { expires_on: '2026-12-30' }), row(-2, '2026-10-02T00:00:00Z'), row(2, '2026-10-02T00:00:01Z', { reason: 'refund', expires_on: '2026-12-31' })], '2026-10-03');
  assert.equal(w.balance, 2);
});

test('projects: script, deliverable and landing-page rules', () => {
  assert.equal(scriptState('in review').state, 'needs_you');
  assert.equal(scriptState('changes requested').state, 'in_progress');
  assert.equal(scriptState('draft').state, 'in_progress');
  assert.equal(scriptState('shot').state, 'approved');

  assert.equal(assetState({ status: 'in review', current_version: 2 }).state, 'needs_you');
  assert.equal(assetState({ status: 'approved', current_version: 2 }).state, 'approved');
  assert.equal(assetState({ status: 'Ready', current_version: 0 }).state, 'approved');
  assert.equal(assetState({ status: 'In Progress', current_version: 0 }).state, 'in_progress');
  // A legacy row can't be approved in the portal, so it never asks the client.
  assert.equal(assetState({ status: 'in review', current_version: 0 }).state, 'in_progress');

  assert.equal(assetKind({ file_type: 'VIDEO', url: null, title: 'Hero cut' }), 'video');
  assert.equal(assetKind({ file_type: 'PDF', url: null, title: 'AssetsLab' }), 'doc');
  assert.equal(assetKind({ file_type: 'LINK', url: 'https://drive.google.com/x', title: 'VSL pack' }), 'doc');
  assert.equal(assetKind({ file_type: 'LINK', url: 'https://client-site.vercel.app', title: 'Preview' }), 'page');
  assert.equal(assetKind({ file_type: 'LINK', url: null, title: 'Landing page v2' }), 'page');
});

test('projects: needs-you first, then newest', () => {
  const item = (key: string, state: ProjectItem['state'], updatedAt: string): ProjectItem => ({ key, kind: 'doc', title: key, status: '', state, meta: null, href: null, updatedAt });
  const sorted = sortItems([item('a', 'approved', '2026-10-10'), item('b', 'needs_you', '2026-10-01'), item('c', 'in_progress', '2026-10-05'), item('d', 'needs_you', '2026-10-09')]);
  assert.deepEqual(sorted.map((i) => i.key), ['d', 'b', 'c', 'a']);
  assert.deepEqual(countByState(sorted), { needs_you: 2, in_progress: 1, approved: 1 });
  assert.equal(reviewRef.script('s1', 3), 'review:script:s1:v3');
  assert.equal(reviewRef.card('c1', null), 'review:card:c1:0');
});

test('submission links: https only, deduped, capped', () => {
  assert.deepEqual(cleanLinks(['https://drive.google.com/a', 'https://drive.google.com/a', ' ']), ['https://drive.google.com/a']);
  assert.deepEqual(cleanLinks('https://a.com/x https://b.com/y'), ['https://a.com/x', 'https://b.com/y']);
  assert.equal(cleanLinks(['http://insecure.com']), null);
  assert.equal(cleanLinks(['javascript:alert(1)']), null);
  assert.equal(cleanLinks(Array.from({ length: 11 }, (_, i) => `https://x.com/${i}`)), null);
  assert.deepEqual(cleanLinks(undefined), []);
});

test('card description: every line starts with a word, so no line reads as a video chapter', () => {
  const d = cardDescription({
    by: 'Jane Doe',
    business: 'Acme',
    typeLabel: 'Short-form edit',
    cost: 2,
    rush: true,
    extraRounds: 0,
    due: '2026-10-20',
    folderUrl: 'https://drive.google.com/drive/folders/abc',
    files: [{ name: 'a.mp4', size: 1_500_000_000 }],
    links: ['https://dropbox.com/x'],
    notes: '0:30 cut the pause\nend on the logo',
    submissionId: 'sub-1',
  });
  for (const line of d.split('\n')) assert.ok(!/^\s*\d{1,2}:\d{2}/.test(line), line);
  assert.match(d, /Rush \(48h\)/);
  assert.match(d, /2 credits paid/);
  assert.match(d, /- 0:30 cut the pause/);
});
