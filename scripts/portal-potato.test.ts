// Hot Potato unit tests: heat, the launch clock floor, who holds a cut, the Slack scoreboard.
//
//   npm run test:potato

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POTATO_EPOCH, cutHolder, daysHeld, heatFor, makePotato, scoreboard, type Potato } from '@/lib/portal/potato';

const DAY = 86_400_000;
const T = POTATO_EPOCH + 30 * DAY; // a month after launch

test('heat climbs: warm, hot day 2, fire day 4, smoke day 7', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 6, 7, 30].map(heatFor), ['warm', 'warm', 'hot', 'hot', 'fire', 'fire', 'smoke', 'smoke']);
});

test('clocks never start before launch (old items start warm)', () => {
  assert.equal(daysHeld('2026-08-01T00:00:00Z', POTATO_EPOCH + 3600_000), 0);
  assert.equal(daysHeld('2026-08-01T00:00:00Z', POTATO_EPOCH + 8 * DAY), 8);
  assert.equal(daysHeld(new Date(T - 3 * DAY).toISOString(), T), 3);
});

test('a fresh cut with no notes is the client\'s, since the cut landed', () => {
  const h = cutHolder({ hasCut: true, cutAt: T - 2 * DAY, dueOn: null, clientNotes: [], now: T });
  assert.equal(h?.holder, 'client');
  assert.equal(h?.since, T - 2 * DAY);
});

test('unresolved client notes put it on the editor, from the oldest note', () => {
  const h = cutHolder({
    hasCut: true,
    cutAt: T - 5 * DAY,
    dueOn: null,
    clientNotes: [
      { at: T - 4 * DAY, resolved: false, looksGood: false },
      { at: T - 1 * DAY, resolved: false, looksGood: false },
      { at: T - 6 * DAY, resolved: true, looksGood: false },
    ],
    now: T,
  });
  assert.deepEqual(h && { holder: h.holder, since: h.since }, { holder: 'team', since: T - 4 * DAY });
});

test('notes fixed and a newer cut posted: back to the client', () => {
  const h = cutHolder({ hasCut: true, cutAt: T - 1 * DAY, dueOn: null, clientNotes: [{ at: T - 3 * DAY, resolved: true, looksGood: false }], now: T });
  assert.equal(h?.holder, 'client');
});

test('notes fixed but no newer cut yet: still the editor\'s', () => {
  const h = cutHolder({ hasCut: true, cutAt: T - 5 * DAY, dueOn: null, clientNotes: [{ at: T - 3 * DAY, resolved: true, looksGood: false }], now: T });
  assert.equal(h?.holder, 'team');
  assert.equal(h?.why, 'Posting the new cut');
});

test('"Looks good" passes it to the team to move along', () => {
  const h = cutHolder({ hasCut: true, cutAt: T - 5 * DAY, dueOn: null, clientNotes: [{ at: T - 2 * DAY, resolved: true, looksGood: true }], now: T });
  assert.equal(h?.holder, 'team');
  assert.match(h!.why, /approved/i);
});

test('no cut: past due is the editor\'s; not due yet is nobody\'s', () => {
  assert.equal(cutHolder({ hasCut: false, cutAt: null, dueOn: '2026-10-01', clientNotes: [], now: T })?.holder, 'team');
  assert.equal(cutHolder({ hasCut: false, cutAt: null, dueOn: '2099-01-01', clientNotes: [], now: T }), null);
  assert.equal(cutHolder({ hasCut: false, cutAt: null, dueOn: null, clientNotes: [], now: T }), null);
});

test('scoreboard: team first by holder, then a line per client', () => {
  const p = (x: Partial<Potato> & Pick<Potato, 'holder' | 'who' | 'since'>): Potato =>
    makePotato({ key: Math.random().toString(36), title: 'E01', why: 'Fixing your notes', href: '/portal/production', clientName: 'The Collected View', ...x }, T);
  const text = scoreboard(
    [
      p({ holder: 'team', who: 'Gio', since: new Date(T - 5 * DAY).toISOString() }),
      p({ holder: 'team', who: 'Gio', since: new Date(T - 1 * DAY).toISOString() }),
      p({ holder: 'client', who: 'Sharlene', since: new Date(T - 8 * DAY).toISOString(), title: 'Your intake' }),
    ],
    'https://podlablv.com',
  );
  assert.match(text, /team holding 2, clients holding 1/);
  assert.match(text, /\*Gio\* · 2/);
  assert.match(text, /\*ON FIRE\* day 5/);
  assert.match(text, /The Collected View: 1 · hottest \*SMOKING\* day 8 \(Your intake\)/);
  assert.ok(text.trim().endsWith('https://podlablv.com/portal/potatoes'));
});
