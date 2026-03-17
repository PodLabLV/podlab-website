'use client';

import Link from 'next/link';
import { useState } from 'react';

const MOCK_CLIENT = {
  name: 'Marcus',
  company: 'Simonian Law Group',
  plan: 'ExpansionLab',
  monthlyInvestment: 3500,
};

const stats = [
  { label: 'Active Projects', value: '3', sub: 'Across 2 Labs', icon: '🔬' },
  { label: 'Deliverables Ready', value: '7', sub: '2 new this week', icon: '📦' },
  { label: "This Month's ROI", value: '4.2x', sub: '$14,700 attributed', icon: '📈' },
  { label: 'Next Milestone', value: 'Mar 22', sub: 'Video Series v2 Review', icon: '🎯' },
];

const recentActivity = [
  { time: '2 hours ago', text: 'Monthly KPI Report — March 2026 is ready', type: 'report' },
  { time: '1 day ago', text: 'LinkedIn Ad Set B launched — 3 creatives live', type: 'campaign' },
  { time: '2 days ago', text: 'Blog post "5 Signs You Need a Sales Video" published', type: 'content' },
  { time: '4 days ago', text: 'Invoice #PL-2026-031 paid — $3,500.00', type: 'payment' },
  { time: '1 week ago', text: 'Founder Authority Video — final edit delivered', type: 'deliverable' },
];

const quickLinks = [
  { href: '/portal/deliverables', label: 'Download Deliverables', desc: 'Access your latest assets', icon: '📦' },
  { href: '/portal/progress', label: 'Track Progress', desc: 'See where your projects stand', icon: '🚀' },
  { href: '/portal/reports', label: 'View Reports', desc: 'Monthly KPI dashboard', icon: '📈' },
  { href: '/portal/invoices', label: 'Invoices & Billing', desc: 'Payment history & receipts', icon: '💰' },
];

const typeColors: Record<string, string> = {
  report: 'bg-blue-500/20 text-blue-400',
  campaign: 'bg-purple-500/20 text-purple-400',
  content: 'bg-emerald-500/20 text-emerald-400',
  payment: 'bg-[#2ADD1B]/20 text-[#2ADD1B]',
  deliverable: 'bg-orange-500/20 text-orange-400',
};

export default function PortalDashboard() {
  const [isDemo] = useState(true);

  return (
    <div className="space-y-8">
      {/* Demo banner */}
      {isDemo && (
        <div className="bg-[#2ADD1B]/10 border border-[#2ADD1B]/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-[#2ADD1B] text-sm">🧪</span>
          <p className="text-sm text-[#2ADD1B]/80">
            <span className="font-semibold text-[#2ADD1B]">Demo Mode</span> — Viewing sample data for Simonian Law Group.
          </p>
        </div>
      )}

      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
          Welcome back, {MOCK_CLIENT.name}
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          {MOCK_CLIENT.company} • {MOCK_CLIENT.plan} — ${MOCK_CLIENT.monthlyInvestment.toLocaleString()}/mo
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-[#2ADD1B]/20 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">{s.label}</p>
                <p className="mt-2 text-3xl font-display text-white">{s.value}</p>
                <p className="mt-1 text-xs text-white/40">{s.sub}</p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-3 bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="font-display text-sm text-white uppercase tracking-wider mb-5">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  a.type === 'payment' ? 'bg-[#2ADD1B]' : 'bg-white/20'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">{a.text}</p>
                  <p className="text-xs text-white/30 mt-0.5">{a.time}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColors[a.type]}`}>
                  {a.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-display text-sm text-white uppercase tracking-wider mb-2 px-1">Quick Links</h2>
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="block bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-[#2ADD1B]/20 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{q.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-[#2ADD1B] transition-colors">
                    {q.label}
                  </p>
                  <p className="text-xs text-white/40">{q.desc}</p>
                </div>
                <svg className="w-4 h-4 text-white/20 ml-auto group-hover:text-[#2ADD1B] transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
