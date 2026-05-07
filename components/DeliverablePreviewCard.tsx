'use client';

import { useState } from 'react';

interface PreviewData {
  icp: {
    twoSentenceStatement: string;
    revenueRange: string;
    teamSize: string;
    coreProblem: string;
    desiredOutcome: string;
  };
  positioning: {
    statement: string;
    whyDifferent: string;
    commodityTrap: string;
  };
  hooks: { hook: string; whyItWorks: string }[];
  objections: { objection: string; response: string }[];
}

interface Props {
  preview?: PreviewData;
  firstName: string;
  bookHref: string;
}

type TabKey = 'icp' | 'positioning' | 'hooks' | 'objections';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'icp', label: 'ICP' },
  { key: 'positioning', label: 'Positioning' },
  { key: 'hooks', label: 'Hooks' },
  { key: 'objections', label: 'Objections' },
];

export default function DeliverablePreviewCard({ preview, firstName, bookHref }: Props) {
  const [tab, setTab] = useState<TabKey>('icp');
  const isLoading = !preview;

  return (
    <section className="bg-gradient-to-br from-[#1A1A1A] via-[#1A1A1A] to-[#0F1F0F] border-2 border-[#2ADD1B]/30 rounded-2xl p-6 sm:p-8">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <div>
          <p className="text-[10px] text-[#2ADD1B] font-bold tracking-[0.2em] uppercase">
            ✨ AssetsLab — sample of week 1
          </p>
          <h2 className="font-display text-base sm:text-lg text-white uppercase tracking-wider mt-1">
            What you&apos;d be holding in 7 days
          </h2>
        </div>
        <span className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-2">
          {isLoading && <span className="w-1.5 h-1.5 rounded-full bg-[#2ADD1B] animate-pulse" />}
          {isLoading ? 'Drafting...' : 'Generated from your site'}
        </span>
      </div>
      <p className="text-xs text-white/40 mb-5">
        {isLoading
          ? `Reading your site and drafting a sample deliverable. This is a 30-second teaser of what AssetsLab actually produces. ~${firstName ? `${firstName}, ` : ''}give it a moment.`
          : `30-second teaser of the actual deliverable. The full Lab includes 50+ hooks, complete customer journey, content roadmap, brand voice, and sales DNA.`}
      </p>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <div key={t.key} className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="bg-white/5 border border-white/5 rounded-lg p-5 h-40 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Tabs */}
          <div className="flex gap-1.5 sm:gap-2 flex-wrap border-b border-white/5 pb-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                  tab === t.key
                    ? 'bg-[#2ADD1B] text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'icp' && (
            <div className="space-y-4">
              <div className="bg-[#2ADD1B]/5 border border-[#2ADD1B]/20 rounded-lg p-5">
                <p className="text-[10px] text-[#2ADD1B] font-bold tracking-wider uppercase mb-2">
                  Your ICP — drop-in ready
                </p>
                <p className="text-base sm:text-lg text-white leading-relaxed font-medium">
                  &ldquo;{preview!.icp.twoSentenceStatement}&rdquo;
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Revenue Range</p>
                  <p className="text-sm text-white/80">{preview!.icp.revenueRange}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Team Size</p>
                  <p className="text-sm text-white/80">{preview!.icp.teamSize}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Core Problem</p>
                  <p className="text-sm text-white/80">{preview!.icp.coreProblem}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Desired Outcome</p>
                  <p className="text-sm text-white/80">{preview!.icp.desiredOutcome}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'positioning' && (
            <div className="space-y-4">
              <div className="bg-[#2ADD1B]/5 border border-[#2ADD1B]/20 rounded-lg p-5">
                <p className="text-[10px] text-[#2ADD1B] font-bold tracking-wider uppercase mb-2">
                  Positioning Statement
                </p>
                <p className="text-base text-white leading-relaxed">
                  {preview!.positioning.statement}
                </p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                  Why You&apos;re Different
                </p>
                <p className="text-sm text-white/80 leading-relaxed">
                  {preview!.positioning.whyDifferent}
                </p>
              </div>
              <div className="bg-[#FFB800]/5 border border-[#FFB800]/20 rounded-lg p-4">
                <p className="text-[10px] text-[#FFB800] font-bold tracking-wider uppercase mb-1.5">
                  ⚠ Commodity Trap to Avoid
                </p>
                <p className="text-sm text-white/80 leading-relaxed italic">
                  {preview!.positioning.commodityTrap}
                </p>
              </div>
            </div>
          )}

          {tab === 'hooks' && (
            <div className="space-y-3">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                {preview!.hooks.length} hooks (full Lab includes 50+)
              </p>
              {preview!.hooks.map((h, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/5 rounded-lg p-4 hover:border-[#2ADD1B]/30 transition-colors"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-[#2ADD1B] font-black text-sm flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-white font-semibold leading-snug">{h.hook}</p>
                      <p className="text-xs text-white/50 mt-1.5 italic">{h.whyItWorks}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'objections' && (
            <div className="space-y-3">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                Objection handling — drop these into sales calls
              </p>
              {preview!.objections.map((o, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <p className="text-[10px] text-[#FF8800] font-bold tracking-wider uppercase mb-1">
                    They say:
                  </p>
                  <p className="text-sm text-white/90 mb-3 italic">&ldquo;{o.objection}&rdquo;</p>
                  <p className="text-[10px] text-[#2ADD1B] font-bold tracking-wider uppercase mb-1">
                    You say:
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">{o.response}</p>
                </div>
              ))}
            </div>
          )}

          {/* Footer CTA */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="text-xs text-white/50 mb-3 leading-relaxed">
              This is 30 seconds of work. AssetsLab builds the full strategy doc — 50+ hooks,
              complete customer journey, content roadmap, brand voice guide, sales DNA — in 7 days
              for $1,000.
            </p>
            <a
              href={bookHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-[#2ADD1B] text-black text-sm font-black rounded-xl hover:bg-[#85FF78] transition-all uppercase tracking-wider"
            >
              See what the full doc looks like →
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
