// Build level unit tests: missions, score, levels, next mission.
//
//   npm run test:game

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gameFor, levelFor } from '@/lib/portal/game';
import type { Overview } from '@/lib/tiptop/overview';

function overview(patch: Partial<Overview> = {}): Overview {
  return {
    client: { firstName: 'Sam', lastName: null, businessName: 'Test Co', email: 't@x.com', phone: null, website: null, timezone: null, plan: null, stage: null },
    chain: { available: true, answered: 0, unlocked: 0, constraint: null, elements: [], foundation: 'locked', owned: [] },
    phases: [],
    production: { available: true, videos: [] },
    scripts: { available: true, items: [] },
    deliverables: { available: true, items: [] },
    actionItems: { open: [], done: 0 },
    intake: { total: 10, answered: 0, requiredLeft: 5, submitted: false },
    invoices: { open: [], paidCount: 0 },
    document: { has: false, editable: false, historyReady: false, versions: 0 },
    brand: { available: true, logos: [], colors: [], fonts: [], guide: false, broll: { files: 0, links: 0 }, gaps: [] },
    potatoes: [],
    plans: { available: false, items: [] },
    content: { available: false, items: [] },
    accountability: [],
    ...patch,
  };
}

test('a new client starts at level 1 with the intake as the next mission', () => {
  const g = gameFor(overview());
  assert.equal(g.score, 0);
  assert.equal(g.level.n, 1);
  assert.equal(g.level.name, 'Kickoff');
  assert.equal(g.nextMission?.key, 'intake');
});

test('intake + Growth Chain check + main logo reach level 2 and point at the logo set', () => {
  const g = gameFor(
    overview({
      intake: { total: 10, answered: 10, requiredLeft: 0, submitted: true },
      chain: { available: true, answered: 8, unlocked: 0, constraint: null, elements: [], foundation: 'locked', owned: [] },
      brand: { available: true, logos: ['primary'], colors: [], fonts: [], guide: false, broll: { files: 0, links: 0 }, gaps: [] },
    }),
  );
  assert.equal(g.score, 100 + 50 + 60);
  assert.equal(g.level.name, 'Foundation');
  assert.equal(g.nextMission?.key, 'logo-set');
  assert.equal(g.pct, Math.round(((210 - 100) / (250 - 100)) * 100));
});

test('repeatable missions score per item; a waiting script becomes the next mission', () => {
  const g = gameFor(
    overview({
      intake: { total: 0, answered: 0, requiredLeft: 0, submitted: false },
      brand: { available: false, logos: [], colors: [], fonts: [], guide: false, broll: { files: 0, links: 0 }, gaps: [] },
      chain: { available: true, answered: 8, unlocked: 2, constraint: null, elements: [], foundation: 'locked', owned: [] },
      scripts: {
        available: true,
        items: [
          { id: 'a', title: 'VSL', status: 'approved', label: 'Approved', version: 2, waitingOnYou: false, unsentNotes: 0 },
          { id: 'b', title: 'Hook 1', status: 'in review', label: 'In review', version: 1, waitingOnYou: true, unsentNotes: 0 },
        ],
      },
      actionItems: { open: [], done: 3 },
    }),
  );
  assert.equal(g.score, 50 + 30 + 2 * 100 + 3 * 15);
  assert.equal(g.nextMission?.key, 'scripts');
  assert.equal(g.nextMission?.title, 'Review your script');
});

test('element unlocks are never the client\'s next mission', () => {
  const g = gameFor(
    overview({
      intake: { total: 0, answered: 0, requiredLeft: 0, submitted: false },
      chain: { available: true, answered: 8, unlocked: 1, constraint: null, elements: [], foundation: 'locked', owned: [] },
      brand: { available: true, logos: ['primary', 'icon', 'white'], colors: ['#000'], fonts: ['Inter'], guide: true, broll: { files: 2, links: 0 }, gaps: [] },
    }),
  );
  assert.equal(g.nextMission, null);
});

test('delivered work scores but is never the next mission', () => {
  const g = gameFor(
    overview({
      intake: { total: 0, answered: 0, requiredLeft: 0, submitted: false },
      brand: { available: false, logos: [], colors: [], fonts: [], guide: false, broll: { files: 0, links: 0 }, gaps: [] },
      chain: { available: false, answered: 0, unlocked: 0, constraint: null, elements: [], foundation: 'locked', owned: [] },
      document: { has: true, editable: true, historyReady: true, versions: 1 },
      phases: [
        { title: 'Kickoff', status: 'done', owner: null, due: null },
        { title: 'Shoot', status: 'in progress', owner: null, due: null },
      ],
      production: {
        available: true,
        videos: [
          { id: 'v1', title: 'E01', board: 'B', stage: 'Posted', done: true, dueOn: null, hasVideo: true, lastNoteByYou: false },
          { id: 'v2', title: 'E02', board: 'B', stage: 'Editing', done: false, dueOn: null, hasVideo: false, lastNoteByYou: false },
        ],
      },
    }),
  );
  assert.equal(g.score, 100 + 25 + 10);
  assert.equal(g.nextMission, null);
});

test('levelFor boundaries and the top level', () => {
  assert.equal(levelFor(99).n, 1);
  assert.equal(levelFor(100).n, 2);
  assert.equal(levelFor(2500).name, 'Legacy');
  assert.equal(levelFor(9999).next, null);
});
