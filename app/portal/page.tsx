'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import WebsiteAudit from '@/components/WebsiteAudit';
import LabTeaserCard from '@/components/LabTeaserCard';
import CostOfInactionCard from '@/components/CostOfInactionCard';
import AIDiagnosisCard from '@/components/AIDiagnosisCard';
import { rankLabsForCategoryScores } from '@/lib/labs';

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
  primary_bottleneck?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw_responses?: any;
}

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string;
}

interface RoadmapPhase {
  phase: number;
  lab: string;
  name: string;
  focus: string;
  duration: string;
  actions: { week: string; title: string; description: string; outcome: string }[];
}

interface RoadmapData {
  id: string;
  roadmap_name: string;
  lab_sequence: string[];
  phases: RoadmapPhase[];
  quick_wins: { title: string; timeframe: string; description: string }[];
  roi_multiple: number;
}

const CATEGORIES = [
  'Founder Dependency',
  'Brand & Perception',
  'Marketing Systems',
  'Sales Infrastructure',
  'Strategic Clarity',
];

const BOOK_HREF = 'https://calendly.com/podlablv/strategy-call';

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
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const userEmail = session.user.email;
        const userMeta = session.user.user_metadata;

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
            if (assessmentData.zone) {
              assessmentData.zone = assessmentData.zone.charAt(0).toUpperCase() + assessmentData.zone.slice(1).toLowerCase();
            }
            setAssessment(assessmentData);

            const { data: roadmapData } = await supabase
              .from('roadmaps')
              .select('*')
              .eq('assessment_id', assessmentData.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (roadmapData) setRoadmap(roadmapData);
          }
        } else {
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

  if (!assessment) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
            Welcome{client?.first_name ? `, ${client.first_name}` : ''}
          </h1>
          <p className="mt-2 text-white/50 text-sm">{client?.company_name || 'Your Portal'}</p>
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

  const zoneColor = getZoneColor(assessment.zone);
  const sortedCats = [...CATEGORIES].sort(
    (a, b) => (assessment.category_scores[a] || 0) - (assessment.category_scores[b] || 0)
  );
  const weakestCat = sortedCats[0];

  const rankedLabs = rankLabsForCategoryScores(assessment.category_scores);
  const priorityLab = rankedLabs[0];
  const otherLabs = rankedLabs.slice(1);

  const top3Moves = roadmap?.quick_wins?.slice(0, 3) ?? [];

  const assessmentDate = new Date(assessment.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-10 pb-12">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
          Welcome back, {client?.first_name || 'there'}
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          {client?.company_name || ''}
          {client?.company_name ? ' • ' : ''}Assessment taken {assessmentDate}
        </p>
      </div>

      {/* Score */}
      <section
        className="bg-[#1A1A1A]/80 backdrop-blur-sm border-2 rounded-2xl p-8 text-center"
        style={{ borderColor: `${zoneColor}40` }}
      >
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">Your Bottleneck Score</p>
        <div className="text-6xl sm:text-7xl font-black mb-2" style={{ color: zoneColor }}>
          {assessment.total_score}
        </div>
        <p className="text-white/40 text-sm mb-4">out of 100</p>
        <div
          className="inline-block px-6 py-2 rounded-lg border-2"
          style={{ borderColor: zoneColor, backgroundColor: `${zoneColor}15` }}
        >
          <span className="font-bold" style={{ color: zoneColor }}>
            {getZoneLabel(assessment.zone)}
          </span>
          <span className="text-white/50 text-sm ml-2">— {assessment.zone} Zone</span>
        </div>
      </section>

      {/* Cost of Inaction */}
      <CostOfInactionCard
        categoryScores={assessment.category_scores}
        bookHref={BOOK_HREF}
      />

      {/* AI Diagnosis (only renders if Claude analysis exists in raw_responses) */}
      {assessment.raw_responses?.aiDiagnoses && (
        <AIDiagnosisCard
          diagnoses={assessment.raw_responses.aiDiagnoses}
          firstName={client?.first_name || ''}
        />
      )}

      {/* 5-Category Dependency Breakdown */}
      <section className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-sm text-white uppercase tracking-wider">5-Category Dependency Score</h2>
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Weakest first</span>
        </div>
        <div className="space-y-4">
          {sortedCats.map((cat) => {
            const score = assessment.category_scores[cat] || 0;
            const pct = Math.round((score / 20) * 100);
            const catZone = getCategoryZone(score);
            const catColor = getCatColor(score);

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white/80">{cat}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ color: catColor, backgroundColor: `${catColor}15` }}
                    >
                      {catZone}
                    </span>
                    <span className="text-sm font-bold" style={{ color: catColor }}>
                      {score}/20
                    </span>
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
      </section>

      {/* Top 3 Highest-Leverage Moves */}
      {top3Moves.length > 0 && (
        <section className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="font-display text-sm text-white uppercase tracking-wider mb-1">
            🎯 Top 3 Highest-Leverage Moves
          </h2>
          <p className="text-xs text-white/40 mb-5">Start these this week. Each one breaks a bottleneck immediately.</p>
          <div className="space-y-3">
            {top3Moves.map((move, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-white/5 border border-white/5 rounded-xl p-4"
              >
                <div className="w-8 h-8 rounded-full bg-[#2ADD1B]/15 flex items-center justify-center flex-shrink-0 text-[#2ADD1B] font-black text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{move.title}</p>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">{move.description}</p>
                  <p className="text-[10px] text-[#2ADD1B] font-bold tracking-wider uppercase mt-2">
                    ⏱ {move.timeframe}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 90-Day Roadmap */}
      {roadmap && roadmap.phases?.length > 0 && (
        <section className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-display text-sm text-white uppercase tracking-wider">
              📅 Your Custom 90-Day Roadmap
            </h2>
            {roadmap.roi_multiple ? (
              <span className="text-[10px] text-[#2ADD1B] font-bold uppercase tracking-wider">
                {roadmap.roi_multiple.toFixed(1)}× ROI target
              </span>
            ) : null}
          </div>
          <p className="text-xs text-white/40 mb-5">{roadmap.roadmap_name}</p>

          <div className="space-y-4">
            {roadmap.phases.map((phase) => (
              <div key={phase.phase} className="bg-white/5 border border-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] text-[#2ADD1B] font-bold tracking-wider uppercase">
                      Phase {phase.phase} · {phase.duration}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {phase.lab} — {phase.name}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-4">{phase.focus}</p>
                <div className="space-y-2">
                  {phase.actions.slice(0, 3).map((action, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#2ADD1B] mt-0.5 flex-shrink-0 text-xs">→</span>
                      <div className="text-xs">
                        <span className="text-white/80 font-medium">{action.title}</span>
                        <span className="text-white/40 ml-1">· {action.week}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Website Audit */}
      {assessment.raw_responses?.websiteAudit && (
        <WebsiteAudit audit={assessment.raw_responses.websiteAudit} />
      )}

      {/* The 5 Labs */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-sm text-white uppercase tracking-wider">🧪 The 5 Labs</h2>
          <p className="text-xs text-white/40 mt-1">
            Sorted for you. Your priority lab is based on{' '}
            <span className="text-[#2ADD1B] font-medium">{weakestCat}</span> being your weakest category.
          </p>
        </div>

        {priorityLab && (
          <LabTeaserCard
            lab={priorityLab}
            variant="priority"
            reason={`This is your priority lab. You scored ${
              assessment.category_scores[weakestCat] || 0
            }/20 on ${weakestCat} — ${priorityLab.name} is engineered to fix exactly that.`}
            bookHref={BOOK_HREF}
          />
        )}

        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-3">Other Labs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherLabs.map((lab) => (
              <LabTeaserCard key={lab.slug} lab={lab} variant="locked" bookHref={BOOK_HREF} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-[#2ADD1B]/10 via-[#1A1A1A] to-[#1A1A1A] border-2 border-[#2ADD1B]/30 rounded-2xl p-8 text-center">
        <p className="text-[10px] text-[#2ADD1B] font-bold tracking-[0.2em] uppercase mb-2">
          Your next step
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
          30 minutes with Hiram.
        </h2>
        <p className="text-sm text-white/60 max-w-lg mx-auto mb-6">
          Diagnostic, not a pitch. We map your roadmap to specific labs, walk through the math,
          and tell you in the first 15 minutes whether it&apos;s a fit. You leave with your plan
          either way.
        </p>
        <a
          href={BOOK_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-10 py-5 bg-[#2ADD1B] text-black text-base font-black rounded-xl hover:bg-[#85FF78] transition-all uppercase tracking-wider"
        >
          Get my custom plan →
        </a>
        <p className="text-[10px] text-white/40 mt-3 italic">
          Founder-to-founder. No SDR, no slide deck.
        </p>
        <div className="mt-6 pt-6 border-t border-white/5">
          <p className="text-xs text-white/40 italic">
            &ldquo;PodLab took us from $3.1M to $4.72M in 12 months — the assets do the selling now.&rdquo;
          </p>
          <p className="text-[10px] text-white/30 mt-1">Simonian, Capital MBS</p>
        </div>
      </section>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/portal/deliverables', label: 'Deliverables', icon: '📦', desc: 'Access your assets' },
          { href: '/portal/progress', label: 'Progress', icon: '🚀', desc: 'Track your projects' },
          { href: `/assessment/results/${assessment.id}`, label: 'Share Results', icon: '🔗', desc: 'Public link' },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-[#2ADD1B]/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{q.icon}</span>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-[#2ADD1B] transition-colors">
                  {q.label}
                </p>
                <p className="text-xs text-white/40">{q.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
