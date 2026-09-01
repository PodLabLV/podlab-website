'use client';

/**
 * Discoveries.
 *
 * Rare by design. Locked ones are stated plainly — what would unlock them —
 * and never nag; a founder who went quiet for three weeks was closing a deal,
 * not failing a streak.
 *
 * Spec: PORTAL-EXPERIENCE.md §5.5
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { Discovery } from '@/lib/portal/discoveries';

function whenLabel(unlockedAt: string | null): string | null {
  if (!unlockedAt) return null;
  if (unlockedAt === 'reported') return 'Earned';
  const d = new Date(unlockedAt);
  if (Number.isNaN(d.getTime())) return 'Earned';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Discoveries({ discoveries }: { discoveries: Discovery[] }) {
  const reduce = useReducedMotion();
  const earned = discoveries.filter((d) => d.unlockedAt);

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-sm uppercase tracking-wider text-white">Discoveries</h2>
        <p className="portal-num font-mono text-[10px] uppercase tracking-wider text-white/30">
          {earned.length} of {discoveries.length}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {discoveries.map((d, i) => {
          const when = whenLabel(d.unlockedAt);
          const unlocked = Boolean(d.unlockedAt);

          return (
            <motion.div
              key={d.key}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 260, damping: 26, delay: i * 0.04 }
              }
              className={`rounded-2xl border p-4 ${
                unlocked
                  ? 'border-[#2ADD1B]/30 bg-[#2ADD1B]/[0.06]'
                  : 'border-white/10 bg-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`font-display text-[11px] uppercase leading-tight tracking-wider ${
                    unlocked ? 'text-[#2ADD1B]' : 'text-white/30'
                  }`}
                >
                  {d.name}
                </p>
                {unlocked && (
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2ADD1B]" />
                )}
              </div>

              <p
                className={`mt-2 text-[11px] leading-relaxed ${
                  unlocked ? 'text-white/60' : 'text-white/30'
                }`}
              >
                {unlocked ? d.earned : d.pending}
              </p>

              {when && when !== 'Earned' && (
                <p className="portal-num mt-2 font-mono text-[9px] uppercase tracking-wider text-white/25">
                  {when}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
