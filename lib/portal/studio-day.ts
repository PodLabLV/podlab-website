// The ELITE Studio Day: who gets the booking link, whether they've booked, and
// the words around it. Pure, so scripts/portal-studio-day.test.ts can run it
// without a database, React or a browser.
//
// Standard EssentialsLab clients film everything in the Free VSL session, so
// only ELITE gets this. The link goes in the welcome email (deliver el_welcome)
// and stays on the portal home until a booking shows up in crm.bookings.

/** One place for the link. ELITE_STUDIO_DAY_URL overrides it (server-side). */
export const DEFAULT_STUDIO_DAY_URL = 'https://calendly.com/podlablv/essentialslab-elite-studio-day';

export function studioDayBaseUrl(): string {
  const env = typeof process !== 'undefined' ? process.env.ELITE_STUDIO_DAY_URL?.trim() : undefined;
  return env && /^https:\/\/[^\s"<>]+$/i.test(env) ? env : DEFAULT_STUDIO_DAY_URL;
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The booking link with name and email prefilled, so the booking comes back
 * under the email we match on. Keeps any query the base already has.
 */
export function studioDayUrl(name?: string | null, email?: string | null, base: string = studioDayBaseUrl()): string {
  const u = new URL(base);
  const n = name?.trim();
  const e = email?.trim().toLowerCase();
  if (n && !u.searchParams.has('name')) u.searchParams.set('name', n);
  if (e && EMAIL_OK.test(e) && !e.endsWith('.invalid') && !u.searchParams.has('email')) u.searchParams.set('email', e);
  return u.toString();
}

/**
 * ELITE when any source says so: the deliver payload's tier, the portal plan
 * label ("EssentialsLab ELITE ..."), a portal product, or a CRM payment
 * (lab_key essentialslab-elite, -elite-pmt-1 ...). The plan label alone isn't
 * enough: some ELITE buyers were set up as plain "EssentialsLab".
 */
export function isElite(s: {
  tier?: string | null;
  planLabel?: string | null;
  products?: (string | null | undefined)[];
  labKeys?: (string | null | undefined)[];
}): boolean {
  if ((s.tier ?? '').trim().toLowerCase() === 'elite') return true;
  if (/essentials\s*lab.*\belite\b|\belite\b.*essentials\s*lab/i.test(s.planLabel ?? '')) return true;
  const keys = [...(s.products ?? []), ...(s.labKeys ?? [])];
  return keys.some((k) => /^essentialslab-elite/i.test((k ?? '').trim()));
}

/**
 * The ELITE Studio Day event in Calendly ("EssentialsLab ELITE Studio Day").
 * Not the Free VSL studio session, not the Google-reviews studio session.
 */
export function isStudioDayEvent(eventName: string | null | undefined): boolean {
  return /\belite\b.*\bstudio\b/i.test(eventName ?? '');
}

export interface BookingRow {
  event_name: string | null;
  status: string | null;
  start_at: string | null;
  event_deleted_at?: string | null;
}

/**
 * The Studio Day booking that counts, or null. Canceled and deleted rows don't
 * count (a reschedule cancels the old row and adds a new one). The next
 * upcoming one wins; if they're all in the past, the latest (they've filmed).
 */
export function pickStudioBooking(rows: BookingRow[], now: Date = new Date()): BookingRow | null {
  const live = rows.filter(
    (r) => isStudioDayEvent(r.event_name) && (r.status ?? '').toLowerCase() !== 'canceled' && !r.event_deleted_at,
  );
  if (!live.length) return null;
  const t = (r: BookingRow) => (r.start_at ? Date.parse(r.start_at) : NaN);
  const upcoming = live.filter((r) => t(r) >= now.getTime()).sort((a, b) => t(a) - t(b));
  if (upcoming.length) return upcoming[0];
  return [...live].sort((a, b) => (t(b) || 0) - (t(a) || 0))[0];
}

/** The tag the EL pipeline (Hermes) puts on the CRM lead when it sees the booking. */
export const STUDIO_BOOKED_TAG = 'el-studio-booked';

export interface StudioDayState {
  /** ELITE, so the Studio Day applies at all. */
  eligible: boolean;
  booked: boolean;
  /** ISO start time when we know it. */
  startAt: string | null;
  /** Prefilled booking link; null once booked or when not eligible. */
  url: string | null;
}

export function studioDayState(s: {
  elite: boolean;
  booking: BookingRow | null;
  tags?: (string | null)[] | null;
  name?: string | null;
  email?: string | null;
  base?: string;
}): StudioDayState {
  if (!s.elite) return { eligible: false, booked: false, startAt: null, url: null };
  const booked = Boolean(s.booking) || (s.tags ?? []).includes(STUDIO_BOOKED_TAG);
  return {
    eligible: true,
    booked,
    startAt: s.booking?.start_at ?? null,
    url: booked ? null : studioDayUrl(s.name, s.email, s.base),
  };
}

/** "Tuesday, November 4 at 10:00 AM" in Las Vegas time, where the studio is. */
export function formatStudioDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
  return `${day} at ${time}`;
}

/** Client-facing words. Plain, short, no em dashes. */
export const STUDIO_COPY = {
  kicker: 'Your Studio Day',
  title: 'Book your Studio Day',
  body: 'Your ELITE plan includes a Studio Day at our Las Vegas studio. Pick the date that works for you. It takes about a minute.',
  button: 'Book your Studio Day',
  bookedTitle: 'Studio Day booked',
  bookedBody: 'You are on the calendar. Questions before the day? Email info@podlablv.com.',
  // The email (deliver el_welcome, ELITE).
  emailLine:
    'Your ELITE plan includes a Studio Day at our Las Vegas studio. You can book it now so it is on the calendar.',
  emailButton: 'Book your Studio Day',
  // The email when the intake is already on file.
  intakeOnFile:
    "Your intake is already on file, so there's nothing to fill out. Your AssetsLab is next, and we'll email you when it's in your portal.",
} as const;
