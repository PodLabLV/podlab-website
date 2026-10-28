'use client';

/**
 * Shown inline right after a client approves an edit, the moment they're
 * happiest with us. One calm card, no modal. "Not now" hides it on every
 * approval for 30 days (lib/portal/referral-nudge).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, X } from 'lucide-react';
import { NUDGE_COPY, NUDGE_KEY, REFER_URL, nudgeAllowed } from '@/lib/portal/referral-nudge';

const STROKE = 1.5;

export default function ReferralNudge({ className = '' }: { className?: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let dismissed: string | null = null;
    try {
      dismissed = localStorage.getItem(NUDGE_KEY);
    } catch {
      // Private mode or blocked storage: show it; "Not now" still hides it for this visit.
    }
    setShow(nudgeAllowed(dismissed));
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(NUDGE_KEY, new Date().toISOString());
    } catch {
      // Nothing to do; it's hidden for this visit.
    }
  }

  function copy() {
    navigator.clipboard
      ?.writeText(REFER_URL)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <div role="status" className={`relative border border-p-line border-l-2 border-l-p-brandink bg-p-card px-5 py-4 ${className}`}>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 p-1 text-p-ink/50 transition hover:text-p-ink"
      >
        <X size={16} strokeWidth={STROKE} />
      </button>
      <p className="pr-8 text-base leading-relaxed text-p-ink/90">{NUDGE_COPY.line}</p>
      <p className="mt-1 text-sm text-p-ink/65">{NUDGE_COPY.how}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="portal-label inline-flex items-center gap-2 bg-p-brand px-4 py-2.5 !text-[12px] text-black transition hover:bg-p-pop"
        >
          {copied ? <Check size={14} strokeWidth={STROKE} /> : <Copy size={14} strokeWidth={STROKE} />}
          {copied ? NUDGE_COPY.copied : NUDGE_COPY.copy}
        </button>
        <Link
          href="/portal/referrals"
          className="portal-label inline-flex items-center gap-2 border border-p-line px-4 py-2.5 !text-[12px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink"
        >
          {NUDGE_COPY.refer}
          <ArrowUpRight size={14} strokeWidth={STROKE} />
        </Link>
        <button type="button" onClick={dismiss} className="px-2 py-2.5 text-sm text-p-ink/60 transition hover:text-p-ink">
          {NUDGE_COPY.dismiss}
        </button>
      </div>
    </div>
  );
}
