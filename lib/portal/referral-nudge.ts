// The referral card that shows once a client approves an edit. Pure, so
// scripts/referral-nudge.test.ts can run it without React or a browser.
//
// Points don't need Beaker: a referral applies at REFER_URL, picks "A PodLab
// client" and types the client's name (Founders Room lesson 3.1).

export const REFER_URL = 'https://freevsl.podlablv.com/apply';

export const NUDGE_COPY = {
  line: 'Glad it landed. Know an owner who should have one? Every one who films earns you a point toward a free edit.',
  how: 'Send them to freevsl.podlablv.com/apply and have them type your name under "Who sent you."',
  copy: 'Copy the link',
  copied: 'Copied',
  refer: 'See your referrals',
  dismiss: 'Not now',
} as const;

// One "Not now" quiets the card on every approval for this long.
export const NUDGE_KEY = 'portal:referral-nudge-dismissed';
export const NUDGE_QUIET_DAYS = 30;

/** True when the card may show: never dismissed, a broken stamp, or the quiet window has passed. */
export function nudgeAllowed(dismissedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!dismissedAt) return true;
  const at = Date.parse(dismissedAt);
  if (Number.isNaN(at)) return true;
  return now.getTime() - at >= NUDGE_QUIET_DAYS * 86_400_000;
}
