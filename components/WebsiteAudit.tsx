'use client'

interface AuditCategory {
  score: number
  maxScore: number
  label: string
  checks: {
    name: string
    passed: boolean
    value: string | null
    impact: 'high' | 'medium' | 'low'
    recommendation?: string
  }[]
}

interface AuditData {
  url: string
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  categories: {
    seo: AuditCategory
    conversion: AuditCategory
    performance: AuditCategory
    trust: AuditCategory
    technical: AuditCategory
  }
  recommendations: {
    priority: number
    category: string
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
    effort: 'quick' | 'moderate' | 'significant'
  }[]
  auditedAt: string
  error?: string
}

interface WebsiteAuditProps {
  audit: AuditData
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#2ADD1B'
    case 'B': return '#85FF78'
    case 'C': return '#FFB800'
    case 'D': return '#FF8800'
    case 'F': return '#FF4444'
    default: return '#888'
  }
}

function getImpactBadge(impact: string): { color: string; bg: string; label: string } {
  switch (impact) {
    case 'high': return { color: '#FF4444', bg: 'rgba(255,68,68,0.1)', label: 'High Impact' }
    case 'medium': return { color: '#FFB800', bg: 'rgba(255,184,0,0.1)', label: 'Medium' }
    default: return { color: '#888', bg: 'rgba(136,136,136,0.1)', label: 'Low' }
  }
}

function getEffortBadge(effort: string): string {
  switch (effort) {
    case 'quick': return '⚡ Quick Fix'
    case 'moderate': return '🔧 Moderate Effort'
    default: return '🏗️ Significant'
  }
}

export default function WebsiteAudit({ audit }: WebsiteAuditProps) {
  if (audit.error) {
    return (
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
        <h2 className="font-display text-sm text-white uppercase tracking-wider mb-3">🌐 Website Audit</h2>
        <p className="text-red-400 text-sm">{audit.error}</p>
      </div>
    )
  }

  const gradeColor = getGradeColor(audit.grade)
  const categoryOrder = ['conversion', 'seo', 'trust', 'performance', 'technical'] as const
  const categoryEmojis: Record<string, string> = {
    seo: '🔍',
    conversion: '🎯',
    performance: '⚡',
    trust: '🤝',
    technical: '⚙️',
  }

  const auditDate = new Date(audit.auditedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
        style={{ borderColor: `${gradeColor}30` }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-sm text-white uppercase tracking-wider mb-1">🌐 Website Audit</h2>
            <a href={audit.url} target="_blank" rel="noopener noreferrer" 
               className="text-sm text-[#2ADD1B] hover:underline">{audit.url}</a>
          </div>
          <p className="text-xs text-white/30">Audited {auditDate}</p>
        </div>

        <div className="flex items-center gap-8">
          {/* Grade Circle */}
          <div className="flex-shrink-0 w-24 h-24 rounded-2xl border-3 flex items-center justify-center"
            style={{ borderColor: gradeColor, backgroundColor: `${gradeColor}10` }}>
            <div>
              <div className="text-4xl font-black text-center" style={{ color: gradeColor }}>{audit.grade}</div>
              <div className="text-[10px] text-white/40 text-center uppercase tracking-wider">Grade</div>
            </div>
          </div>

          {/* Score + Category Bars */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-black" style={{ color: gradeColor }}>{audit.overallScore}</span>
              <span className="text-white/40 text-sm">/100</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {categoryOrder.map((key) => {
                const cat = audit.categories[key]
                const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0
                const barColor = pct >= 70 ? '#2ADD1B' : pct >= 40 ? '#FFB800' : '#FF4444'
                return (
                  <div key={key} className="text-center">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full transition-all" 
                        style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-[10px] text-white/40">{categoryEmojis[key]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Category Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {categoryOrder.map((key) => {
          const cat = audit.categories[key]
          const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0
          const catColor = pct >= 70 ? '#2ADD1B' : pct >= 40 ? '#FFB800' : '#FF4444'

          return (
            <div key={key} className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{categoryEmojis[key]}</span>
                  {cat.label}
                </h3>
                <span className="text-sm font-bold px-2 py-0.5 rounded"
                  style={{ color: catColor, backgroundColor: `${catColor}15` }}>
                  {cat.score}/{cat.maxScore}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: catColor }} />
              </div>
              <div className="space-y-2">
                {cat.checks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={check.passed ? 'text-[#2ADD1B]' : 'text-red-400'}>
                      {check.passed ? '✓' : '✗'}
                    </span>
                    <span className={check.passed ? 'text-white/60' : 'text-white/80'}>
                      {check.name}
                    </span>
                    {check.value && (
                      <span className="text-white/30 truncate max-w-[120px]" title={check.value}>
                        {check.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Top Recommendations */}
      {audit.recommendations.length > 0 && (
        <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="font-display text-sm text-white uppercase tracking-wider mb-4">
            🎯 Top Recommendations
          </h3>
          <div className="space-y-3">
            {audit.recommendations.slice(0, 5).map((rec, i) => {
              const badge = getImpactBadge(rec.impact)
              return (
                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-[#2ADD1B]/20 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[#2ADD1B] font-bold text-sm">#{rec.priority}</span>
                      <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ color: badge.color, backgroundColor: badge.bg }}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-white/40">{getEffortBadge(rec.effort)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{rec.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
