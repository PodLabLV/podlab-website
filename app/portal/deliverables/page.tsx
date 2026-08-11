'use client';

import { useState } from 'react';
import { usePortal } from '@/lib/portal-data';
import {
  PageHeader,
  Card,
  EmptyState,
  StatusBadge,
  FileMark,
} from '@/components/portal/Shared';

export default function DeliverablesPage() {
  const { loading, client, assets } = usePortal();
  const [lab, setLab] = useState<string>('All');

  if (loading) return <p className="text-white/40 text-sm">Loading...</p>;

  if (!client || assets.length === 0) {
    return (
      <>
        <PageHeader title="Deliverables" />
        <EmptyState
          title="No deliverables yet"
          body="Every file we produce for you lands here — strategy documents, video files, and brand assets. Nothing has been published to your account yet."
          cta={{ label: 'Email PodLab', href: 'mailto:info@podlablv.com' }}
        />
      </>
    );
  }

  const labs = ['All', ...Array.from(new Set(assets.map((a) => a.lab).filter(Boolean) as string[]))];
  const shown = lab === 'All' ? assets : assets.filter((a) => a.lab === lab);

  return (
    <>
      <PageHeader
        title="Deliverables"
        subtitle="Everything we have produced for you. Files stay available here."
      />

      {labs.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {labs.map((l) => (
            <button
              key={l}
              onClick={() => setLab(l)}
              className={`px-4 py-2 rounded-xl text-xs font-display uppercase tracking-wider transition ${
                lab === l
                  ? 'bg-[#2ADD1B]/10 text-[#2ADD1B] border border-[#2ADD1B]/20'
                  : 'text-white/50 border border-white/10 hover:text-white hover:bg-white/5'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {shown.map((a) => {
          const isReady = (a.status || '').toLowerCase() === 'ready' && a.url;
          return (
            <Card key={a.id} className="p-5 flex flex-col">
              <div className="flex items-start gap-4">
                <FileMark type={a.file_type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-white text-sm font-semibold leading-snug">{a.title}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.lab && (
                    <p className="font-display text-[10px] uppercase tracking-widest text-white/30 mt-2">
                      {a.lab}
                      {a.size_label ? ` · ${a.size_label}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {a.description && (
                <p className="text-white/50 text-sm mt-4 leading-relaxed">{a.description}</p>
              )}

              {isReady && (
                <a
                  href={a.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2ADD1B] text-black text-sm font-semibold hover:bg-[#2ADD1B]/90 transition"
                >
                  Open
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
