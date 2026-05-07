import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CATEGORIES = [
  'Founder Dependency',
  'Brand & Perception',
  'Marketing Systems',
  'Sales Infrastructure',
  'Strategic Clarity',
];

const QUICK_WINS_FIRST: Record<string, string> = {
  'Founder Dependency': 'Record your next 3 sales calls and extract your sales DNA.',
  'Brand & Perception': 'Screenshot your site next to your top competitor\'s.',
  'Marketing Systems': 'Track where your last 10 clients came from.',
  'Sales Infrastructure': 'Record a 90-second "Why Us" video on your phone.',
  'Strategic Clarity': 'Write your ICP in exactly 2 sentences.',
};

const LAB_MAP: Record<string, { name: string; price: string }> = {
  'Founder Dependency': { name: 'AssetsLab', price: '$1,500' },
  'Brand & Perception': { name: 'BrandLab', price: '$3,500' },
  'Marketing Systems': { name: 'ExpansionLab', price: '$5,000/mo' },
  'Sales Infrastructure': { name: 'VideoSalesLab', price: '$10,000' },
  'Strategic Clarity': { name: 'AssetsLab', price: '$1,500' },
};

function getZoneColor(zone: string): string {
  if (zone === 'Red') return '#FF4444';
  if (zone === 'Yellow') return '#FFB800';
  return '#2ADD1B';
}

function getZoneLabel(zone: string): string {
  if (zone === 'Red') return 'Founder-Dependent';
  if (zone === 'Yellow') return 'Building Momentum';
  return 'Scaling Smart';
}

function getCatColor(score: number): string {
  if (score <= 9) return '#FF4444';
  if (score <= 14) return '#FFB800';
  return '#2ADD1B';
}

function getCategoryZone(score: number): string {
  if (score <= 9) return 'Critical';
  if (score <= 14) return 'Developing';
  return 'Strong';
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssessmentResultsPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*, clients(first_name, last_name, company_name)')
    .eq('id', id)
    .single();

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-2">Assessment Not Found</h1>
          <p className="text-white/50 text-sm mb-6">This assessment link may be invalid or expired.</p>
          <Link href="/assessment" className="inline-block px-8 py-4 bg-[#2ADD1B] text-black font-bold rounded-xl hover:bg-[#25c418] transition-all uppercase tracking-wider">
            Take Assessment →
          </Link>
        </div>
      </div>
    );
  }

  const createdAt = new Date(assessment.created_at);
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation > 30) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-white mb-2">Results Expired</h1>
          <p className="text-white/50 text-sm mb-6">This assessment was completed over 30 days ago. Take a fresh assessment to get your current bottleneck score.</p>
          <Link href="/assessment" className="inline-block px-8 py-4 bg-[#2ADD1B] text-black font-bold rounded-xl hover:bg-[#25c418] transition-all uppercase tracking-wider">
            Retake Assessment →
          </Link>
        </div>
      </div>
    );
  }

  // Build category_scores: try individual columns first, then raw_responses fallback
  let categoryScores: Record<string, number> = {};
  const hasIndividualScores = assessment.founder_dependency_score != null;
  const rawCatScores = assessment.raw_responses?.categoryScores as Record<string, number> | undefined;

  if (hasIndividualScores) {
    categoryScores = {
      'Founder Dependency': assessment.founder_dependency_score ?? 0,
      'Brand & Perception': assessment.brand_perception_score ?? 0,
      'Marketing Systems': assessment.marketing_systems_score ?? 0,
      'Sales Infrastructure': assessment.sales_infrastructure_score ?? 0,
      'Strategic Clarity': assessment.strategic_clarity_score ?? 0,
    };
  } else if (rawCatScores && Object.keys(rawCatScores).length > 0) {
    categoryScores = rawCatScores;
  } else {
    categoryScores = {
      'Founder Dependency': 0, 'Brand & Perception': 0, 'Marketing Systems': 0,
      'Sales Infrastructure': 0, 'Strategic Clarity': 0,
    };
  }
  const totalScore = assessment.total_score;
  const rawZone = assessment.zone;
  const zone = rawZone ? rawZone.charAt(0).toUpperCase() + rawZone.slice(1).toLowerCase() : 'Yellow';
  const zoneColor = getZoneColor(zone);
  const clientData = assessment.clients as { first_name: string; last_name: string; company_name: string | null } | null;

  const sortedCats = [...CATEGORIES].sort(
    (a, b) => (categoryScores[a] || 0) - (categoryScores[b] || 0)
  );
  const weakest2 = sortedCats.slice(0, 2);

  const seenLabs = new Set<string>();
  const recommendedLabs = weakest2
    .map((cat) => ({ cat, ...LAB_MAP[cat] }))
    .filter((lab) => {
      if (!lab.name || seenLabs.has(lab.name)) return false;
      seenLabs.add(lab.name);
      return true;
    });

  const assessmentDate = new Date(assessment.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-white/5 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2ADD1B] flex items-center justify-center text-black font-bold text-xs">P</div>
            <span className="text-white text-sm font-bold uppercase tracking-wider">PodLab</span>
          </Link>
          <Link href="/login" className="text-sm text-[#2ADD1B] hover:underline">
            Log In →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
            {clientData?.first_name ? `${clientData.first_name}'s` : ''} Bottleneck Assessment • {assessmentDate}
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-2">
            Bottleneck <span style={{ color: zoneColor }}>Score</span>
          </h1>
        </div>

        {/* Score Card */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 text-center mb-8"
          style={{ borderColor: `${zoneColor}30` }}>
          <div className="text-7xl md:text-8xl font-black mb-2" style={{ color: zoneColor }}>
            {totalScore}
          </div>
          <p className="text-white/40 text-sm mb-4">out of 100</p>
          <div className="inline-block px-6 py-2 rounded-lg border-2" style={{ borderColor: zoneColor, backgroundColor: `${zoneColor}15` }}>
            <span className="font-bold" style={{ color: zoneColor }}>{getZoneLabel(zone)}</span>
            <span className="text-white/50 text-sm ml-2">— {zone} Zone</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-5 uppercase tracking-wider">Category Breakdown</h2>
          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
              const score = categoryScores[cat] || 0;
              const pct = Math.round((score / 20) * 100);
              const catColor = getCatColor(score);
              const catZone = getCategoryZone(score);

              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-white/80">{cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: catColor, backgroundColor: `${catColor}15` }}>
                        {catZone}
                      </span>
                      <span className="text-sm font-bold" style={{ color: catColor }}>{score}/20</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: catColor }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Wins */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider"> Quick Wins</h2>
          <div className="space-y-3">
            {weakest2.map((cat) => (
              <div key={cat} className="flex items-start gap-2">
                <span className="text-[#2ADD1B] mt-0.5 flex-shrink-0">→</span>
                <p className="text-sm text-white/70">
                  <strong className="text-white">{cat}:</strong> {QUICK_WINS_FIRST[cat]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Labs */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">🧪 Recommended Labs</h2>
          <div className="space-y-3">
            {recommendedLabs.map((lab, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                <div>
                  <span className="text-[10px] text-[#2ADD1B] font-bold uppercase tracking-wider">
                    {i === 0 ? 'Start Here' : 'Then'}
                  </span>
                  <h3 className="text-white font-bold">{lab.name}</h3>
                </div>
                <span className="text-[#2ADD1B] font-bold">{lab.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="text-center space-y-4">
          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-10 py-5 bg-[#2ADD1B] text-black text-lg font-black rounded-xl hover:bg-[#25c418] transition-all uppercase tracking-wider"
          >
            Book a Strategy Call →
          </a>
          <div>
            <Link
              href="/login"
              className="inline-block px-8 py-3 border-2 border-[#2ADD1B]/30 text-[#2ADD1B] font-bold rounded-xl hover:bg-[#2ADD1B]/10 transition-all text-sm"
            >
              Log In to Your Portal
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-white/5">
          <p className="text-xs text-white/30">PodLab LV · Las Vegas, NV · <a href="https://podlablv.com" className="text-[#2ADD1B] hover:underline">podlablv.com</a></p>
        </div>
      </div>
    </div>
  );
}
