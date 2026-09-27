// Beaker referral cookie — the website half of attribution.
//
// A visitor who lands on a Beaker link (?ref=<beakerId>, or the
// utm_source=beaker&utm_campaign=<beakerId> links /affiliate/utm builds) gets
// `beaker_ref` for 90 days on .podlablv.com. Last Beaker link wins. Because
// it lives on the parent domain, crm.podlablv.com reads it too: that's how a
// Buy button (crm.podlablv.com/api/buy/<offer>) hands the visitor that
// affiliate's own checkout. The CRM decides whether the ID is a real,
// approved affiliate; this file only carries it.
//
// Rules the CRM applies live in podlab-crm src/lib/attribution.ts.

import type { NextRequest } from 'next/server';

export const REF_COOKIE = 'beaker_ref';
export const REF_MAX_AGE = 60 * 60 * 24 * 90; // 90 days — what the dashboard promises
const BEAKER_ID = /^[a-z0-9][a-z0-9-]{1,59}$/;

export function cleanBeakerId(v: string | null | undefined): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  return BEAKER_ID.test(s) ? s : null;
}

/** The Beaker ID a URL carries, if any. */
export function refFromUrl(url: URL): string | null {
  const ref = cleanBeakerId(url.searchParams.get('ref'));
  if (ref) return ref;
  if ((url.searchParams.get('utm_source') || '').toLowerCase() === 'beaker') {
    return cleanBeakerId(url.searchParams.get('utm_campaign'));
  }
  return null;
}

/** For API routes: the cookie, or a ref on the request URL itself. */
export function readBeakerRef(request: NextRequest): string | null {
  return refFromUrl(new URL(request.url)) || cleanBeakerId(request.cookies.get(REF_COOKIE)?.value);
}

/** Spread into a leads insert. Empty when there's no referral, so an upsert
 *  never erases one that an earlier visit recorded. */
export function beakerColumn(request: NextRequest): { beaker_id?: string } {
  const ref = readBeakerRef(request);
  return ref ? { beaker_id: ref } : {};
}
