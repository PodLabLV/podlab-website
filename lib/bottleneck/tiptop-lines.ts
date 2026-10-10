/**
 * TipTop's static banter.
 *
 * Ring throws have no content to react to, so they pull from these banks.
 * Question reactions do have content and are generated per-answer by
 * /api/tiptop — these only stand in when that call is slow or fails, because a
 * silent host is worse than a generic one.
 */

export const MAKE_LINES = [
  "THAT'S what I'm talking about.",
  'Money. Do it again.',
  "Okay, hotshot. I see you.",
  'Clean. Keep that arm warm.',
  "Nothing but glass. Let's go.",
  'You practiced. Admit it.',
  "That's the sound of a prize getting closer.",
  'Textbook. Next one.',
];

export const MISS_LINES = [
  'Missed it. Pay the toll.',
  'Ooh. Not even close, hotshot.',
  "That's a miss. You owe me an honest answer.",
  'Rim out. Talk to me.',
  'Wide. Question time.',
  "The rings are fine. It's you. Answer this.",
  'Air ball. Let me ask you something.',
  'Nope. Tell me about your business instead.',
];

export const NEAR_MISS_LINES = [
  'Ohh, that was RIGHT there.',
  'Half an inch. Half an inch!',
  'That one hurt me too.',
  'So close I felt it.',
];

/** Shown while the AI reaction is still in flight. */
export const THINKING_LINES = [
  'Hmm.',
  'Interesting.',
  'Alright...',
  'Noted.',
];

export const STREAK_LINES: Record<number, string> = {
  2: 'Two in a row. Warming up.',
  3: 'Three straight. Somebody has done this before.',
  4: "Four. One more and you're getting paid.",
};

export function pick(lines: string[], exclude?: string): string {
  const pool = exclude ? lines.filter((l) => l !== exclude) : lines;
  return pool[Math.floor(Math.random() * pool.length)] ?? lines[0];
}
