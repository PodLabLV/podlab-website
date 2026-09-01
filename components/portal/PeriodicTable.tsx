'use client';

/**
 * The Periodic Table of Labs.
 *
 * A status board, a navigation surface, and the expansion path in one object.
 * The gap in the table IS the upsell — a client with four Labs lit and two dark
 * can read their own roadmap without anyone pitching them. So: no prices, no
 * buttons, no "upgrade" language on a locked tile. One line of what it unlocks
 * on hover, and nothing else.
 *
 * Spec: PORTAL-EXPERIENCE.md §5.1
 */

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { LabElement, LabState } from '@/lib/portal/labs-table';

const TONE: Record<LabState, { box: string; symbol: string; label: string; note: string }> = {
  complete: {
    box: 'border-[#2ADD1B]/40 bg-[#2ADD1B]/10 hover:border-[#2ADD1B]/70',
    symbol: 'text-[#2ADD1B]',
    label: 'text-white/70',
    note: 'Delivered',
  },
  running: {
    box: 'border-[#22D3EE]/40 bg-[#22D3EE]/5 hover:border-[#22D3EE]/70',
    symbol: 'text-[#22D3EE]',
    label: 'text-white/70',
    note: 'In progress',
  },
  waiting: {
    box: 'border-[#FFB020]/50 bg-[#FFB020]/10 hover:border-[#FFB020]/80',
    symbol: 'text-[#FFB020]',
    label: 'text-white/70',
    note: 'Needs you',
  },
  owned: {
    box: 'border-white/20 bg-white/[0.03] hover:border-white/40',
    symbol: 'text-white/70',
    label: 'text-white/50',
    note: 'Yours',
  },
  locked: {
    box: 'border-white/10 bg-transparent hover:border-white/25',
    symbol: 'text-white/20',
    label: 'text-white/25',
    note: '',
  },
};

function Tile({ el, index }: { el: LabElement; index: number }) {
  const reduce = useReducedMotion();
  const tone = TONE[el.state];
  const locked = el.state === 'locked';

  const body = (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26, delay: index * 0.04 }}
      className={`group relative h-full overflow-hidden rounded-2xl border p-4 transition-colors ${tone.box}`}
    >
      {/* Liquid fill, only while a reaction is actually running. A bar that
          moves because time passed is the fastest way to lose trust in every
          other number on the screen. */}
      {el.state === 'running' && (
        <motion.div
          initial={reduce ? false : { height: 0 }}
          animate={{ height: `${Math.min(100, Math.max(0, el.progress))}%` }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 18 }}
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#22D3EE]/10"
        />
      )}

      <div className="relative flex items-start justify-between">
        <span className="font-mono text-[10px] text-white/25 portal-num">{el.z}</span>
        {el.state === 'running' && (
          <span className="font-mono text-[10px] text-[#22D3EE] portal-num">{el.progress}%</span>
        )}
      </div>

      <p className={`relative font-display mt-2 text-2xl sm:text-3xl ${tone.symbol}`}>{el.symbol}</p>

      <p className={`relative mt-2 text-[11px] leading-tight ${tone.label}`}>{el.name}</p>

      {tone.note && (
        <p className="relative mt-1 font-mono text-[9px] uppercase tracking-wider text-white/30">
          {tone.note}
        </p>
      )}

      {/* Locked tiles say what they unlock, once, on hover. Never a price. */}
      {locked && (
        <p className="relative mt-2 max-h-0 overflow-hidden text-[10px] leading-snug text-white/40 opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:opacity-100">
          {el.unlocks}
        </p>
      )}
    </motion.div>
  );

  if (!el.href) return body;

  return (
    <Link
      href={el.href}
      className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2ADD1B]/60 rounded-2xl"
      aria-label={`${el.name} — ${tone.note || 'not included in your plan'}`}
    >
      {body}
    </Link>
  );
}

export default function PeriodicTable({ elements }: { elements: LabElement[] }) {
  const owned = elements.filter((e) => e.state !== 'locked').length;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-sm uppercase tracking-wider text-white">Your Labs</h2>
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/30 portal-num">
          {owned} of {elements.length} active
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {elements.map((el, i) => (
          <Tile key={el.name} el={el} index={i} />
        ))}
      </div>
    </section>
  );
}
