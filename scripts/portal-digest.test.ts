// Daily digest unit tests: snapshot → changes, subject, email, eligibility.
//
//   npm run test:digest

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  diffDigest,
  digestEligible,
  digestEmail,
  digestSubject,
  hasChanges,
  parseSnapshot,
  snapshotOf,
  type LiveState,
} from '@/lib/portal/digest';

const BOARD = 'b1';
const SINCE = '2026-10-07T15:00:00.000Z';

function live(over: Partial<LiveState> = {}): LiveState {
  return {
    boards: [BOARD],
    cards: [
      { id: 'c1', boardId: BOARD, title: 'Episode 1', column: 'Editing', videoUrl: null, resolvedClientComments: [] },
      {
        id: 'c2',
        boardId: BOARD,
        title: 'Episode 2',
        column: 'Revising',
        videoUrl: 'https://youtu.be/aaaaaaaaaaa',
        resolvedClientComments: [],
      },
    ],
    scriptVersions: [],
    assetVersions: [],
    waiting: { scripts: 1, deliverables: 0, actions: 2 },
    ...over,
  };
}

const withCard = (s: LiveState, id: string, patch: Partial<LiveState['cards'][number]>): LiveState => ({
  ...s,
  cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
});

test('first run sends nothing', () => {
  assert.equal(diffDigest(null, live(), null), null);
  assert.equal(hasChanges(diffDigest(null, live(), null)), false);
  assert.equal(parseSnapshot({}), null, 'the column default {} counts as no snapshot');
});

test('no changes → no email, even with things waiting', () => {
  const s = live();
  const c = diffDigest(snapshotOf(s), s, SINCE);
  assert.ok(c);
  assert.equal(hasChanges(c), false);
  assert.equal(c!.waiting.actions, 2);
});

test('new video_url is a new cut (appeared, and replaced)', () => {
  const before = snapshotOf(live());
  const after = withCard(withCard(live(), 'c1', { videoUrl: 'https://youtu.be/bbbbbbbbbbb' }), 'c2', {
    videoUrl: 'https://youtu.be/ccccccccccc',
  });
  const c = diffDigest(before, after, SINCE)!;
  assert.deepEqual(c.cuts.map((x) => x.title), ['Episode 1', 'Episode 2']);
  assert.ok(hasChanges(c));
  // A removed link is not news.
  assert.equal(diffDigest(before, withCard(live(), 'c2', { videoUrl: null }), SINCE)!.cuts.length, 0);
});

test('resolved client note flips → note fixed, tag stripped', () => {
  const before = snapshotOf(live());
  const after = withCard(live(), 'c2', {
    resolvedClientComments: [{ id: 'm1', body: '[0:42 · The problem] cut the pause' }],
  });
  const c = diffDigest(before, after, SINCE)!;
  assert.deepEqual(c.fixed, [{ cardId: 'c2', title: 'Episode 2', note: 'cut the pause' }]);
  // Already resolved last time: not news again.
  assert.equal(diffDigest(snapshotOf(after), after, SINCE)!.fixed.length, 0);
});

test('column → Approved is announced once; Approved → Posted is announced', () => {
  const before = snapshotOf(live());
  const approved = withCard(live(), 'c2', { column: 'Approved' });
  const c = diffDigest(before, approved, SINCE)!;
  assert.deepEqual(c.done, [{ cardId: 'c2', title: 'Episode 2', stage: 'Approved' }]);
  assert.equal(diffDigest(snapshotOf(approved), approved, SINCE)!.done.length, 0);
  const posted = withCard(live(), 'c2', { column: 'Posted' });
  assert.equal(diffDigest(snapshotOf(approved), posted, SINCE)!.done[0].stage, 'Posted');
  // Moving within the editing ladder is not news.
  assert.equal(hasChanges(diffDigest(before, withCard(live(), 'c1', { column: 'Pending Quality Control' }), SINCE)), false);
});

test('a newly linked board is baselined, not announced', () => {
  const before = snapshotOf(live());
  const after = live({
    boards: [BOARD, 'b2'],
    cards: [
      ...live().cards,
      { id: 'x', boardId: 'b2', title: 'Old clip', column: 'Posted', videoUrl: 'https://youtu.be/ddddddddddd', resolvedClientComments: [] },
    ],
  });
  assert.equal(hasChanges(diffDigest(before, after, SINCE)), false);
});

test('a new card on a known board is news', () => {
  const after = live({
    cards: [...live().cards, { id: 'c3', boardId: BOARD, title: 'Trailer', column: 'Editing', videoUrl: 'https://youtu.be/eeeeeeeeeee', resolvedClientComments: [] }],
  });
  assert.deepEqual(diffDigest(snapshotOf(live()), after, SINCE)!.cuts.map((x) => x.title), ['Trailer']);
});

test('versions count only when created after last_sent_at', () => {
  const s = live({
    scriptVersions: [
      { id: 'v-old', parentId: 's1', title: 'VSL', versionNo: 1, createdAt: '2026-10-06T00:00:00Z' },
      { id: 'v-new', parentId: 's1', title: 'VSL', versionNo: 2, createdAt: '2026-10-08T00:00:00Z' },
    ],
    assetVersions: [{ id: 'a1', parentId: 'as1', title: 'Brand guide', versionNo: 3, createdAt: '2026-10-08T01:00:00Z' }],
  });
  const c = diffDigest(snapshotOf(s), s, SINCE)!;
  assert.deepEqual(c.scripts, [{ scriptId: 's1', title: 'VSL', versionNo: 2 }]);
  assert.deepEqual(c.deliverables, [{ assetId: 'as1', title: 'Brand guide', versionNo: 3 }]);
});

test('subject and email', () => {
  const before = snapshotOf(live());
  const after = withCard(
    withCard(live(), 'c1', { videoUrl: 'https://youtu.be/bbbbbbbbbbb' }),
    'c2',
    { resolvedClientComments: [{ id: 'm1', body: '[0:42] <b>cut</b> the pause' }, { id: 'm2', body: 'louder music' }] },
  );
  const c = diffDigest(before, after, SINCE)!;
  assert.equal(digestSubject(c), 'Your PodLab update: 1 new cut, 2 notes fixed');
  const mail = digestEmail(c, { firstName: 'Ana' });
  assert.ok(mail.html.includes('&lt;b&gt;cut&lt;/b&gt; the pause'), 'note text is escaped');
  assert.ok(!mail.html.includes('[0:42]'), 'tag is stripped');
  assert.ok(mail.html.includes('/portal/production'));
  assert.ok(mail.html.includes('/portal/profile') && mail.html.includes('Turn these off in your Profile'));
  assert.ok(mail.html.includes('podlab-portal-green.png'));
  assert.ok(mail.html.includes('Waiting on you'), 'waiting rides along with a real change');
  assert.ok(mail.text.includes('Hi Ana,'));
});

test('eligibility', () => {
  const ok = { user_id: 'u', email: 'a@b.com', digest_opt_out: false };
  assert.equal(digestEligible(ok), true);
  assert.equal(digestEligible({ ...ok, digest_opt_out: undefined }), true, 'before the migration');
  assert.equal(digestEligible({ ...ok, user_id: null }), false);
  assert.equal(digestEligible({ ...ok, digest_opt_out: true }), false);
  assert.equal(digestEligible({ ...ok, email: 'x@unassigned.invalid' }), false);
  assert.equal(digestEligible({ ...ok, email: 'zz@podlablv.invalid' }), false);
  assert.equal(digestEligible({ ...ok, email: 'not-an-email' }), false);
});
