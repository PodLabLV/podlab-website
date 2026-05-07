'use client';

interface Fix {
  priority: number;
  title: string;
  observation: string;
  fix: string;
}

interface AnalysisData {
  positioningClarity: number;
  premiumness: number;
  targetMarketFit: number;
  heroVerdict: string;
  fixes: Fix[];
  premiumPriceCeiling: string;
}

interface Props {
  analysis?: AnalysisData;
  url: string;
}

function scoreColor(score: number): string {
  if (score <= 3) return '#FF4444';
  if (score <= 6) return '#FFB800';
  return '#2ADD1B';
}

function scoreLabel(score: number): string {
  if (score <= 3) return 'Critical';
  if (score <= 6) return 'Needs Work';
  return 'Strong';
}

export default function WebsiteAiPanel({ analysis, url }: Props) {
  const isLoading = !analysis;

  return (
    <section className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <h2 className="font-display text-sm text-white uppercase tracking-wider">
          🔬 What your site actually says
        </h2>
        <span className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-2">
          {isLoading && <span className="w-1.5 h-1.5 rounded-full bg-[#2ADD1B] animate-pulse" />}
          {isLoading ? 'Reading your site...' : 'AI brand audit'}
        </span>
      </div>
      <p className="text-xs text-white/40 mb-5">
        {isLoading
          ? `Reading ${url} and grading your positioning, premium feel, and target-market fit. Should land in a few seconds.`
          : `An honest read on what ${url} communicates to a $1M-$8M-revenue prospect.`}
      </p>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-4 h-24 animate-pulse" />
            ))}
          </div>
          <div className="bg-white/5 border-l-2 border-[#2ADD1B]/40 rounded-r-lg p-4 h-20 animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 rounded-lg p-4 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in">
          {/* Three score cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Positioning Clarity', value: analysis.positioningClarity },
              { label: 'Premium Feel', value: analysis.premiumness },
              { label: 'Buyer-Match', value: analysis.targetMarketFit },
            ].map((m) => {
              const c = scoreColor(m.value);
              return (
                <div
                  key={m.label}
                  className="bg-white/5 border border-white/5 rounded-lg p-3 text-center"
                  style={{ borderColor: `${c}30` }}
                >
                  <div className="text-2xl font-black" style={{ color: c }}>
                    {m.value}<span className="text-sm text-white/40">/10</span>
                  </div>
                  <div className="text-[10px] text-white/60 uppercase tracking-wider mt-1">{m.label}</div>
                  <div className="text-[10px] font-bold mt-0.5" style={{ color: c }}>
                    {scoreLabel(m.value)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hero Verdict */}
          <div className="bg-[#2ADD1B]/5 border-l-2 border-[#2ADD1B] rounded-r-lg p-4">
            <div className="text-[10px] text-[#2ADD1B] font-bold tracking-wider uppercase mb-2">
              What your hero says right now
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{analysis.heroVerdict}</p>
          </div>

          {/* Premium Ceiling */}
          <div className="bg-[#FFB800]/5 border border-[#FFB800]/20 rounded-lg p-4">
            <div className="text-[10px] text-[#FFB800] font-bold tracking-wider uppercase mb-2">
              💰 Pricing ceiling your site is creating
            </div>
            <p className="text-sm text-white/80 leading-relaxed italic">{analysis.premiumPriceCeiling}</p>
          </div>

          {/* Fixes */}
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-3">
              Top fixes (priority order)
            </div>
            <div className="space-y-3">
              {analysis.fixes
                .sort((a, b) => a.priority - b.priority)
                .map((f) => (
                  <div
                    key={f.title}
                    className="bg-white/5 border border-white/5 rounded-lg p-4"
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-[10px] text-[#2ADD1B] font-bold tracking-wider uppercase flex-shrink-0">
                        #{f.priority} · Priority
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-tight mb-2">{f.title}</h3>
                    <div className="space-y-1.5">
                      <p className="text-xs text-white/60">
                        <span className="text-white/40 font-bold uppercase tracking-wider mr-1.5">
                          Saw:
                        </span>
                        {f.observation}
                      </p>
                      <p className="text-xs text-[#2ADD1B]/90">
                        <span className="text-[#2ADD1B] font-bold uppercase tracking-wider mr-1.5">
                          Fix:
                        </span>
                        {f.fix}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
