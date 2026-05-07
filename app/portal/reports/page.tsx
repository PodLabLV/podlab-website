'use client';

import { useState } from 'react';

const months = ['March 2026', 'February 2026', 'January 2026'];

const funnel = [
  { stage: 'Impressions', value: 48200, pct: 100 },
  { stage: 'Clicks', value: 2410, pct: 5.0 },
  { stage: 'Leads', value: 186, pct: 7.7 },
  { stage: 'Calls Booked', value: 42, pct: 22.6 },
  { stage: 'Deals Closed', value: 8, pct: 19.0 },
];

const topContent = [
  { title: '"Why Your Sales Process Is Broken" — LinkedIn Video', views: 12400, ctr: '6.2%', leads: 34 },
  { title: '"5 Signs You Need a Sales Video" — Blog Post', views: 8900, ctr: '4.8%', leads: 22 },
  { title: 'Founder Authority Video — YouTube', views: 6200, ctr: '3.1%', leads: 18 },
];

const campaigns = [
  { name: 'LinkedIn — Founder Authority Ads', spend: 1200, impressions: 22400, clicks: 1120, cpl: 14.12, ctr: '5.0%' },
  { name: 'Google — "Law Firm Marketing"', spend: 800, impressions: 18600, clicks: 890, cpl: 18.60, ctr: '4.8%' },
  { name: 'Meta — Retargeting Warm Audience', spend: 500, impressions: 7200, clicks: 400, cpl: 22.73, ctr: '5.6%' },
];

const recommendations = [
  'Double down on LinkedIn video ads — 6.2% CTR is 3x industry avg. Increasing budget from $1,200 → $1,800.',
  'Launch a new blog series: "Legal Marketing Playbook" — SEO keyword gap identified.',
  'Test short-form vertical video (Reels/Shorts) using Founder Authority footage clips.',
  'A/B test landing page headline — current conversion 7.7% → target 10%.',
  'Implement email nurture sequence for the 144 unconverted leads.',
];

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(months[0]);

  const pipelineValue = 14700;
  const revenueAttributed = 14700;
  const adSpend = 2500;
  const roas = (revenueAttributed / adSpend).toFixed(1);
  const cpa = (adSpend / 8).toFixed(0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
            Monthly Report
          </h1>
          <p className="mt-2 text-white/50 text-sm">ExpansionLab KPI Dashboard</p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:border-[#2ADD1B]/50 focus:outline-none focus:ring-1 focus:ring-[#2ADD1B]/20 appearance-none cursor-pointer"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Hero stat */}
      <div className="bg-gradient-to-br from-[#2ADD1B]/10 via-[#1A1A1A] to-[#1A1A1A] border border-[#2ADD1B]/20 rounded-2xl p-6 sm:p-8 text-center">
        <p className="text-xs text-[#2ADD1B]/60 uppercase tracking-widest font-medium">
          PodLab generated
        </p>
        <p className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-display text-white">
          ${pipelineValue.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-white/40">in attributed pipeline this month</p>
      </div>

      {/* Money row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Revenue Attributed', value: `$${revenueAttributed.toLocaleString()}`, sub: '+18% vs last month' },
          { label: 'ROAS', value: `${roas}x`, sub: `$${adSpend.toLocaleString()} ad spend` },
          { label: 'Cost Per Acquisition', value: `$${cpa}`, sub: '8 deals closed' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center hover:border-[#2ADD1B]/20 transition-all duration-300"
          >
            <p className="text-xs text-white/40 uppercase tracking-wider">{card.label}</p>
            <p className="mt-2 text-3xl font-display text-white">{card.value}</p>
            <p className="mt-1 text-xs text-[#2ADD1B]/60">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-sm text-white uppercase tracking-wider mb-6">Conversion Funnel</h2>
        <div className="space-y-3">
          {funnel.map((step, i) => {
            const widthPct = Math.max((step.value / funnel[0].value) * 100, 8);
            const convRate = i > 0 ? step.pct : null;
            return (
              <div key={step.stage}>
                {i > 0 && (
                  <div className="flex items-center justify-center my-1">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5">
                      <svg className="w-3 h-3 text-white/20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span className="text-[10px] text-white/40">{convRate}% conversion</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/50 w-24 sm:w-32 text-right flex-shrink-0">{step.stage}</span>
                  <div className="flex-1 relative">
                    <div
                      className="h-8 sm:h-10 rounded-lg bg-gradient-to-r from-[#2ADD1B] to-[#2ADD1B]/40 flex items-center justify-end pr-3 transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    >
                      <span className="text-xs font-bold text-black whitespace-nowrap">
                        {step.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content scoreboard */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-sm text-white uppercase tracking-wider mb-5">Top Performing Content</h2>
        <div className="space-y-3">
          {topContent.map((c, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg font-display text-[#2ADD1B]/40 w-6 text-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-white/80 truncate">{c.title}</p>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 text-xs text-white/40 flex-shrink-0 ml-9 sm:ml-0">
                <span><span className="text-white/70 font-medium">{c.views.toLocaleString()}</span> views</span>
                <span><span className="text-white/70 font-medium">{c.ctr}</span> CTR</span>
                <span><span className="text-[#2ADD1B] font-medium">{c.leads}</span> leads</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ad performance */}
      <div className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-sm text-white uppercase tracking-wider mb-2">Ad Performance</h2>
        <div className="flex flex-wrap gap-4 mb-5 mt-4">
          {[
            { label: 'Total Spend', value: '$2,500' },
            { label: 'Avg CPL', value: '$13.44' },
            { label: 'Impressions', value: '48.2K' },
            { label: 'Avg CTR', value: '5.0%' },
          ].map((m) => (
            <div key={m.label} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[10px] text-white/30 uppercase">{m.label}</p>
              <p className="text-sm font-display text-white mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Campaign table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider pb-3 pr-4">Campaign</th>
                <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-3 px-3">Spend</th>
                <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-3 px-3">Impr.</th>
                <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-3 px-3">Clicks</th>
                <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-3 px-3">CPL</th>
                <th className="text-right text-[10px] text-white/30 uppercase tracking-wider pb-3 pl-3">CTR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr key={i} className="border-b border-white/[0.03] last:border-0">
                  <td className="py-3 pr-4 text-white/70 whitespace-nowrap">{c.name}</td>
                  <td className="py-3 px-3 text-right text-white/60">${c.spend.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-white/60">{c.impressions.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-white/60">{c.clicks.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-white/60">${c.cpl.toFixed(2)}</td>
                  <td className="py-3 pl-3 text-right text-[#2ADD1B]">{c.ctr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2ADD1B]/[0.03] border border-[#2ADD1B]/10 rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-sm text-[#2ADD1B] uppercase tracking-wider mb-4">
           What We&apos;re Doing Next Month
        </h2>
        <ul className="space-y-3">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2ADD1B] flex-shrink-0" />
              <p className="text-sm text-white/70 leading-relaxed">{rec}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
