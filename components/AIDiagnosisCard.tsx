interface DiagnosisItem {
  category: string;
  headline: string;
  narrative: string;
}

interface Props {
  diagnoses: DiagnosisItem[];
  firstName: string;
}

export default function AIDiagnosisCard({ diagnoses, firstName }: Props) {
  if (!diagnoses || diagnoses.length === 0) return null;

  return (
    <section className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <h2 className="font-display text-sm text-white uppercase tracking-wider">
          🧠 What your answers actually say
        </h2>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Personalized read</span>
      </div>
      <p className="text-xs text-white/40 mb-5">
        {firstName ? `${firstName}, ` : ''}your three weakest areas — diagnosed from your specific answers.
      </p>

      <div className="space-y-4">
        {diagnoses.map((d, i) => (
          <div
            key={d.category}
            className="bg-white/5 border-l-2 border-[#2ADD1B] rounded-r-lg p-4"
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
    </section>
  );
}
