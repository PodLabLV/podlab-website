'use client';

import { useState, useMemo } from 'react';
import { calculateCostOfInaction, formatMoneyShort } from '@/lib/cost-of-inaction';

interface Props {
  categoryScores: Record<string, number>;
  bookHref: string;
}

const REVENUE_OPTIONS = [
  { value: 1_000_000, label: '$1M' },
  { value: 2_000_000, label: '$2M' },
  { value: 3_000_000, label: '$3M' },
  { value: 5_000_000, label: '$5M' },
  { value: 8_000_000, label: '$8M' },
];

export default function CostOfInactionCard({ categoryScores, bookHref }: Props) {
  const [revenue, setRevenue] = useState(3_000_000);
  const [expanded, setExpanded] = useState(false);

  const result = useMemo(
    () => calculateCostOfInaction(categoryScores, revenue),
    [categoryScores, revenue]
  );

  const sortedBreakdown = [...result.breakdown].sort((a, b) => b.cost - a.cost);

  return (
    <section className="bg-gradient-to-br from-[#1A0E0E] via-[#1A1A1A] to-[#1A1A1A] border-2 border-[#FF4444]/40 rounded-2xl p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <p className="text-[10px] text-[#FF4444] font-black tracking-[0.2em] uppercase">
          ⚠ The cost of staying where you are
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/40">Your revenue:</span>
          <select
            value={revenue}
            onChange={(e) => setRevenue(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white font-bold focus:outline-none focus:border-[#2ADD1B]"
          >
            {REVENUE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-center my-2">
        <p className="text-xs text-white/50 mb-1">Estimated annual opportunity cost</p>
        <div className="text-5xl sm:text-6xl font-black text-[#FF4444] drop-shadow-[0_0_30px_rgba(255,68,68,0.4)]">
          {formatMoneyShort(result.total)}
        </div>
        <p className="text-xs text-white/40 mt-2">per year, conservatively</p>
      </div>

      <p className="text-sm text-white/70 leading-relaxed text-center max-w-xl mx-auto mt-4">
        This is what your bottlenecks are quietly costing you every year — in lost revenue,
        underpricing, founder hours, and pipeline you don&apos;t have.
      </p>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-5 w-full text-xs text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2 py-2 border-t border-white/5"
      >
        {expanded ? 'Hide breakdown' : 'See the math'}
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {sortedBreakdown.map((item) => (
            <div key={item.category} className="bg-white/5 border border-white/5 rounded-lg p-4">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h4 className="text-sm font-bold text-white">{item.category}</h4>
                <span className="text-base font-black text-[#FF4444] flex-shrink-0">
                  {formatMoneyShort(item.cost)}
                </span>
              </div>
              <p className="text-xs text-white/70 font-medium">{item.headline}</p>
              <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{item.reasoning}</p>
            </div>
          ))}

          <p className="text-[10px] text-white/30 text-center pt-2 italic">
            Math is conservative — based on your category scores at $
            {result.assumptions.revenue.toLocaleString()} revenue, $
            {result.assumptions.founderHourlyValue.toLocaleString()}/hr founder value.
          </p>
        </div>
      )}

      <a
        href={bookHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block w-full px-6 py-4 bg-[#2ADD1B] text-black text-center text-sm font-black rounded-xl hover:bg-[#85FF78] transition-all uppercase tracking-wider"
      >
        Get your custom plan — 30 min with Hiram →
      </a>
      <p className="text-[10px] text-white/40 text-center mt-2 italic">
        Diagnostic, not a pitch. You leave with your plan whether you buy or not.
      </p>
    </section>
  );
}
