interface DiagnosisItem {
  category: string;
  headline: string;
  narrative: string;
}

interface Props {
  diagnoses?: DiagnosisItem[];
  firstName: string;
}

export default function AIDiagnosisCard({ diagnoses, firstName }: Props) {
  const isLoading = !diagnoses || diagnoses.length === 0;

  return (
    <section className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <h2 className="font-display text-sm text-white uppercase tracking-wider">
          🧠 What your answers actually say
        </h2>
        <span className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-2">
          {isLoading && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ADD1B] animate-pulse" />
          )}
          {isLoading ? 'Analyzing...' : 'Personalized read'}
        </span>
      </div>
      <p className="text-xs text-white/40 mb-5">
        {isLoading
          ? 'Reading your specific answer patterns and writing your diagnosis. Should land in a few seconds.'
          : `${firstName ? `${firstName}, ` : ''}your three weakest areas — diagnosed from your specific answers.`}
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/5 border-l-2 border-[#2ADD1B]/40 rounded-r-lg p-4 overflow-hidden relative"
            >
              <div className="space-y-2.5">
                <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-11/12 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-4/5 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {diagnoses!.map((d, i) => (
            <div
              key={d.category}
              className="bg-white/5 border-l-2 border-[#2ADD1B] rounded-r-lg p-4 animate-fade-in"
            >
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[10px] text-[#2ADD1B] font-bold tracking-wider uppercase flex-shrink-0">
                  #{i + 1} · {d.category}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight mb-2">
                {d.headline}
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">{d.narrative}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
