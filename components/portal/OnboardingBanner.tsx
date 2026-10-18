'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { viewAsClientId } from '@/lib/portal/view-as';

/**
 * Onboarding hooks any portal page can include (track C owns /portal/welcome).
 *
 *   <OnboardingBanner />            a "finish setting up" strip while onboarding is open
 *   <OnboardingBanner redirect />   also sends a client there once per browser session
 *                                   (first login lands on /portal/welcome)
 *
 * Renders nothing for staff, in View as client, or once onboarding is complete.
 */

const SEEN_KEY = 'portal:welcome-redirected';

export function useOnboardingOpen(): boolean {
  const { client, isStaff, loading } = usePortal();
  if (loading || isStaff || !client) return false;
  const completed = (client as { onboarding_completed_at?: string | null }).onboarding_completed_at;
  // undefined = the column isn't there yet (migration not applied): say nothing.
  return completed === null;
}

export default function OnboardingBanner({ redirect = false }: { redirect?: boolean }) {
  const open = useOnboardingOpen();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!redirect || !open || path?.startsWith('/portal/welcome') || viewAsClientId()) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      return;
    }
    router.replace('/portal/welcome');
  }, [redirect, open, path, router]);

  if (!open || path?.startsWith('/portal/welcome')) return null;
  return (
    <Link
      href="/portal/welcome"
      className="mb-8 flex items-center justify-between gap-4 border-l-2 border-p-brandink bg-p-brand/5 px-5 py-4 transition hover:bg-p-brand/10"
    >
      <span>
        <span className="portal-label block !text-[11px] text-p-brandink">Finish setting up</span>
        <span className="mt-1 block text-base text-p-ink">Three short steps, and we start building your AssetsLab.</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-p-brandink" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
