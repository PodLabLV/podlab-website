'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import WebsiteAudit from '@/components/WebsiteAudit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AssessmentData {
  id: string;
  total_score: number;
  zone: string;
  category_scores: Record<string, number>;
  created_at: string;
  founder_dependency_score?: number;
  brand_perception_score?: number;
  marketing_systems_score?: number;
  sales_infrastructure_score?: number;
  strategic_clarity_score?: number;
  raw_responses?: any;
}

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string;
}

const CATEGORIES = [
  'Founder Dependency',
  'Brand & Perception',
  'Marketing Systems',
  'Sales Infrastructure',
  'Strategic Clarity',
];

const QUICK_WINS: Record<string, string[]> = {
  'Founder Dependency': [
    'Record your next 3 sales calls and extract your sales DNA.',
    'Write your "Only I Can Answer This" list this week.',
  ],
  'Brand & Perception': [
    'Screenshot your site next to your top competitor\'s — which one wins?',
    'Collect 3 client quotes this week for social proof.',
  ],
  'Marketing Systems': [
    'Track where your last 10 clients came from.',
    'Post your hottest industry take on LinkedIn.',
  ],
  'Sales Infrastructure': [
    'Record a 90-second "Why Us" video on your phone.',
    'List your top 5 objections and how you handle them.',
  ],
  'Strategic Clarity': [
    'Write your ICP in exactly 2 sentences.',
    'Name your methodology — make your process a product.',
  ],
};

const LAB_RECOMMENDATIONS: Record<string, { name: string; price: string; description: string }> = {
  'Founder Dependency': { name: 'AssetsLab', price: '$1,500', description: 'Extract your positioning, messaging, and sales DNA.' },
  'Brand & Perception': { name: 'BrandLab', price: '$3,500', description: 'Professional visual identity that commands premium pricing.' },
  'Marketing Systems': { name: 'ExpansionLab', price: '$5,000/mo', description: 'Ongoing marketing execution — content, ads, campaigns.' },
  'Sales Infrastructure': { name: 'VideoSalesLab', price: '$10,000', description: '5 strategic videos that sell for you 24/7.' },
  'Strategic Clarity': { name: 'AssetsLab', price: '$1,500', description: 'Define exactly who you serve and how you say it.' },
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

function getCategoryZone(score: number): string {
  if (score <= 9) return 'Critical';
  if (score <= 14) return 'Developing';
  return 'Strong';
}

function getCatColor(score: number): string {
  if (score <= 9) return '#FF4444';
  if (score <= 14) return '#FFB800';
  return '#2ADD1B';
}

export default function PortalDashboard() {
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return;

        const userEmail = session.user.email;
        const userMeta = session.user.user_metadata;

        // Fetch client record by email
        const { data: clientData, error: clientErr } = await supabase
          .from('clients')
          .select('*')
          .eq('email', userEmail?.toLowerCase())
          .single();

        if (clientErr && clientErr.code !== 'PGRST116') {
          console.error('Client fetch error:', clientErr);
        }

        if (clientData) {
          setClient(clientData);

          // Fetch latest assessment for this client
          const { data: assessmentData, error: assessmentErr } = await supabase
            .from('assessments')
            .select('*')
            .eq('client_id', clientData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (assessmentErr && assessmentErr.code !== 'PGRST116') {
            console.error('Assessment fetch error:', assessmentErr);
          }

          if (assessmentData) {
            // Build category_scores: try individual columns first, then raw_responses fallback
            const hasIndividualScores = assessmentData.founder_dependency_score != null;
            const rawCatScores = assessmentData.raw_responses?.categoryScores as Record<string, number> | undefined;

            if (hasIndividualScores) {
              assessmentData.category_scores = {
                'Founder Dependency': assessmentData.founder_dependency_score ?? 0,
                'Brand & Perception': assessmentData.brand_perception_score ?? 0,
                'Marketing Systems': assessmentData.marketing_systems_score ?? 0,
                'Sales Infrastructure': assessmentData.sales_infrastructure_score ?? 0,
                'Strategic Clarity': assessmentData.strategic_clarity_score ?? 0,
              };
            } else if (rawCatScores && Object.keys(rawCatScores).length > 0) {
              assessmentData.category_scores = rawCatScores;
            } else {
              assessmentData.category_scores = {
                'Founder Dependency': 0,
                'Brand & Perception': 0,
                'Marketing Systems': 0,
                'Sales Infrastructure': 0,
                'Strategic Clarity': 0,
              };
            }
            // Normalize zone to title case for display
            if (assessmentData.zone) {
              assessmentData.zone = assessmentData.zone.charAt(0).toUpperCase() + assessmentData.zone.slice(1).toLowerCase();
            }
            setAssessment(assessmentData);
          }
        } else {
          // No client record yet — use auth metadata
          setClient({
            id: '',
            first_name: userMeta?.first_name || '',
            last_name: userMeta?.last_name || '',
            company_name: userMeta?.company || null,
            email: userEmail || '',
          });
        }
      } catch (err) {
        console.error('Portal data load error:', err);
        setError('Failed to load your data. Please try refreshing.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#2ADD1B] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white/40 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // No assessment — show CTA
  if (!assessment) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
            Welcome{client?.first_name ? `, ${client.first_name}` : ''}
          </h1>
          <p className="mt-2 text-white/50 text-sm">
            {client?.company_name || 'Your Portal'}
          </p>
        </div>

        <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">No Assessment Found</h2>
          <p className="text-white/50 text-sm mb-6">
            Take the Founder Bottleneck Assessment to see your score, category breakdown, and personalized roadmap.
          </p>
          <Link
            href="/assessment/start"
            className="inline-block px-8 py-4 bg-[#2ADD1B] text-black font-black rounded-xl hover:bg-[#25c418] transition-all uppercase tracking-wider"
          >
            Take Your Assessment →
          </Link>
        </div>
      </div>
    );
  }

  // Has assessment — show real data
  const zoneColor = getZoneColor(assessment.zone);
  const sortedCats = [...CATEGORIES].sort(
    (a, b) => (assessment.category_scores[a] || 0) - (assessment.category_scores[b] || 0)
  );
  const weakest2 = sortedCats.slice(0, 2);

  // Deduplicated recommended labs
  const seenLabs = new Set<string>();
  const recommendedLabs = weakest2
    .map((cat) => ({ cat, ...LAB_RECOMMENDATIONS[cat] }))
    .filter((lab) => {
      if (seenLabs.has(lab.name)) return false;
      seenLabs.add(lab.name);
      return true;
    });

  const assessmentDate = new Date(assessment.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
          Welcome back, {client?.first_name || 'there'}
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          {client?.company_name || ''}{client?.company_name ? ' • ' : ''}Assessment taken {assessmentDate}
        </p>
      </div>

      {/* Score Card */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center"
        style={{ borderColor: `${zoneColor}30` }}>
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">Your Bottleneck Score</p>
        <div className="text-6xl sm:text-7xl font-black mb-2" style={{ color: zoneColor }}>
          {assessment.total_score}
        </div>
        <p className="text-white/40 text-sm mb-4">out of 100</p>
        <div className="inline-block px-6 py-2 rounded-lg border-2" style={{ borderColor: zoneColor, backgroundColor: `${zoneColor}15` }}>
          <span className="font-bold" style={{ color: zoneColor }}>{getZoneLabel(assessment.zone)}</span>
          <span className="text-white/50 text-sm ml-2">— {assessment.zone} Zone</span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h2 className="font-display text-sm text-white uppercase tracking-wider mb-5">Category Breakdown</h2>
        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const score = assessment.category_scores[cat] || 0;
            const pct = Math.round((score / 20) * 100);
            const catZone = getCategoryZone(score);
            const catColor = getCatColor(score);

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
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: catColor }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Website Audit */}
      {assessment.raw_responses?.websiteAudit && (
        <WebsiteAudit audit={assessment.raw_responses.websiteAudit} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Wins */}
        <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="font-display text-sm text-white uppercase tracking-wider mb-4">🎯 Quick Wins</h2>
          <p className="text-xs text-white/40 mb-4">Based on your two weakest areas</p>
          <div className="space-y-4">
            {weakest2.map((cat) => (
              <div key={cat}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: getCatColor(assessment.category_scores[cat] || 0) }}>
                  {cat} ({assessment.category_scores[cat]}/20)
                </p>
                <div className="space-y-2">
                  {(QUICK_WINS[cat] || []).map((win, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#2ADD1B] mt-0.5 flex-shrink-0">→</span>
                      <p className="text-sm text-white/70">{win}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Labs */}
        <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="font-display text-sm text-white uppercase tracking-wider mb-4">🧪 Recommended Labs</h2>
          <p className="text-xs text-white/40 mb-4">Based on your biggest bottlenecks</p>
          <div className="space-y-4">
            {recommendedLabs.map((lab, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-[#2ADD1B]/20 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] text-[#2ADD1B] font-bold uppercase tracking-wider">
                      {i === 0 ? 'Start Here' : 'Then'}
                    </span>
                    <h3 className="text-white font-bold">{lab.name}</h3>
                  </div>
                  <span className="text-[#2ADD1B] font-bold">{lab.price}</span>
                </div>
                <p className="text-xs text-white/50">{lab.description}</p>
              </div>
            ))}
          </div>

          {/* Strategy Call CTA */}
          <a
            href="https://calendly.com/podlablv/strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#2ADD1B] text-black font-bold rounded-xl hover:bg-[#25c418] transition-all uppercase tracking-wider text-sm"
          >
            Book Strategy Call →
          </a>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: '/portal/deliverables', label: 'Deliverables', icon: '📦', desc: 'Access your assets' },
          { href: '/portal/progress', label: 'Progress', icon: '🚀', desc: 'Track your projects' },
          { href: '/portal/reports', label: 'Reports', icon: '📈', desc: 'Monthly KPIs' },
          { href: `/assessment/results/${assessment.id}`, label: 'Share Results', icon: '🔗', desc: 'Shareable link' },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-[#2ADD1B]/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{q.icon}</span>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-[#2ADD1B] transition-colors">{q.label}</p>
                <p className="text-xs text-white/40">{q.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
