'use client';

import { useState } from 'react';

type DeliverableStatus = 'Ready' | 'In Progress' | 'Pending';

interface Deliverable {
  id: string;
  lab: string;
  title: string;
  fileType: string;
  date: string;
  status: DeliverableStatus;
  size?: string;
}

const deliverables: Deliverable[] = [
  { id: '1', lab: 'AssetsLab', title: 'Brand DNA Document', fileType: 'PDF', date: 'Jan 15, 2026', status: 'Ready', size: '2.4 MB' },
  { id: '2', lab: 'AssetsLab', title: 'Hook Bank — 50 Hooks', fileType: 'PDF', date: 'Jan 18, 2026', status: 'Ready', size: '1.1 MB' },
  { id: '3', lab: 'AssetsLab', title: 'Content Roadmap Q1', fileType: 'PDF', date: 'Jan 22, 2026', status: 'Ready', size: '3.8 MB' },
  { id: '4', lab: 'VideoSalesLab', title: 'Founder Authority Video — Final', fileType: 'MP4', date: 'Mar 10, 2026', status: 'Ready', size: '248 MB' },
  { id: '5', lab: 'VideoSalesLab', title: 'Client Testimonial Reel', fileType: 'MP4', date: 'Mar 8, 2026', status: 'Ready', size: '185 MB' },
  { id: '6', lab: 'VideoSalesLab', title: 'Sales Objection Crusher #1', fileType: 'MP4', date: '', status: 'In Progress' },
  { id: '7', lab: 'VideoSalesLab', title: 'Case Study Walkthrough', fileType: 'MP4', date: '', status: 'Pending' },
  { id: '8', lab: 'ExpansionLab', title: 'March 2026 KPI Report', fileType: 'PDF', date: 'Mar 15, 2026', status: 'Ready', size: '4.2 MB' },
  { id: '9', lab: 'ExpansionLab', title: 'LinkedIn Ad Creatives — Set B', fileType: 'ZIP', date: 'Mar 12, 2026', status: 'Ready', size: '18 MB' },
  { id: '10', lab: 'ExpansionLab', title: 'Blog: 5 Signs You Need a Sales Video', fileType: 'DOC', date: 'Mar 14, 2026', status: 'Ready', size: '45 KB' },
  { id: '11', lab: 'ExpansionLab', title: 'April Campaign Brief', fileType: 'PDF', date: '', status: 'In Progress' },
];

const labs = ['All', 'AssetsLab', 'VideoSalesLab', 'ExpansionLab'];

const statusStyles: Record<DeliverableStatus, string> = {
  Ready: 'bg-[#2ADD1B]/15 text-[#2ADD1B]',
  'In Progress': 'bg-yellow-500/15 text-yellow-400',
  Pending: 'bg-white/10 text-white/40',
};

const fileIcons: Record<string, string> = {
  PDF: 'PDF',
  MP4: 'VIDEO',
  ZIP: 'ZIP',
  DOC: 'DOC',
};

const labColors: Record<string, string> = {
  AssetsLab: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  VideoSalesLab: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  ExpansionLab: 'bg-[#2ADD1B]/15 text-[#2ADD1B] border-[#2ADD1B]/20',
};

export default function DeliverablesPage() {
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? deliverables : deliverables.filter((d) => d.lab === filter);
  const readyCount = deliverables.filter((d) => d.status === 'Ready').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-white uppercase tracking-wide">
          Deliverables
        </h1>
        <p className="mt-2 text-white/50 text-sm">
          {readyCount} files ready for download • {deliverables.length} total deliverables
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {labs.map((lab) => (
          <button
            key={lab}
            onClick={() => setFilter(lab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === lab
                ? 'bg-[#2ADD1B]/15 text-[#2ADD1B] border border-[#2ADD1B]/30'
                : 'bg-white/5 text-white/50 border border-white/5 hover:border-white/10 hover:text-white/70'
            }`}
          >
            {lab === 'All' ? 'All Labs' : lab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-[#2ADD1B]/20 transition-all duration-300 flex flex-col"
          >
            {/* Lab badge */}
            <span className={`inline-flex self-start px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${labColors[d.lab]}`}>
              {d.lab}
            </span>

            {/* Title */}
            <div className="mt-3 flex items-start gap-3">
              <span className="text-[10px] font-black tracking-wider text-[#2ADD1B] bg-[#2ADD1B]/10 border border-[#2ADD1B]/20 rounded px-2 py-1 self-start">{fileIcons[d.fileType] || 'FILE'}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white leading-tight">{d.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-white/30">
                  <span>{d.fileType}</span>
                  {d.size && (
                    <>
                      <span>•</span>
                      <span>{d.size}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyles[d.status]}`}>
                  {d.status}
                </span>
                {d.date && <span className="text-[10px] text-white/25">{d.date}</span>}
              </div>
              {d.status === 'Ready' ? (
                <a
                  href="#"
                  className="text-xs text-[#2ADD1B] hover:text-[#2ADD1B]/80 font-medium flex items-center gap-1 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Download
                </a>
              ) : (
                <span className="text-[10px] text-white/20">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
