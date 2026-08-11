'use client';

import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-white text-lg sm:text-xl uppercase tracking-wider">
        {title}
      </h1>
      {subtitle && <p className="text-white/40 text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <p className="font-display text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p className="text-2xl text-white mt-2 font-semibold">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </Card>
  );
}

/**
 * Used wherever a section has no data yet. Says plainly why it's empty and what
 * fills it — a thin section reads as unfinished, an explained one reads as honest.
 */
export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <Card className="p-10 text-center">
      <p className="font-display text-white text-sm uppercase tracking-wider">
        {title}
      </p>
      <p className="text-white/40 text-sm mt-3 max-w-md mx-auto leading-relaxed">
        {body}
      </p>
      {cta && (
        <a
          href={cta.href}
          target={cta.href.startsWith('http') ? '_blank' : undefined}
          rel={cta.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-[#2ADD1B] text-black text-sm font-semibold hover:bg-[#2ADD1B]/90 transition"
        >
          {cta.label}
        </a>
      )}
    </Card>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  const s = (status || '').toLowerCase();
  const tone =
    s === 'ready' || s === 'paid'
      ? 'bg-[#2ADD1B]/10 text-[#2ADD1B] border-[#2ADD1B]/20'
      : s === 'in progress' || s === 'pending'
        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        : s === 'overdue'
          ? 'bg-red-500/10 text-red-400 border-red-500/20'
          : 'bg-white/5 text-white/40 border-white/10';
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-lg border text-[10px] font-display uppercase tracking-widest ${tone}`}
    >
      {status || 'Pending'}
    </span>
  );
}

/** File-type marks. SVG, not emoji — these sit in front of clients. */
export function FileMark({ type }: { type: string | null }) {
  const t = (type || 'LINK').toUpperCase();
  const label = t === 'VIDEO' ? 'MP4' : t === 'FOLDER' ? 'DIR' : t === 'PDF' ? 'PDF' : 'WEB';
  return (
    <span className="shrink-0 w-11 h-11 rounded-xl bg-[#2ADD1B]/10 border border-[#2ADD1B]/20 flex items-center justify-center">
      <span className="font-display text-[9px] tracking-wider text-[#2ADD1B]">
        {label}
      </span>
    </span>
  );
}
