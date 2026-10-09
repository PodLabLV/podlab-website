'use client';

import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  accent,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Trailing words set in green Playfair italic, the site's headline signature. */
  accent?: string;
}) {
  return (
    <div className="mb-10">
      {eyebrow && <span className="portal-label block text-p-brandink">{eyebrow}</span>}
      <h1 className={`${eyebrow ? 'mt-4' : ''} text-3xl font-bold leading-[1.05] tracking-tight text-p-ink md:text-4xl`}>
        {title} {accent && <em className="portal-drama text-p-brandink">{accent}</em>}
      </h1>
      {subtitle && <p className="mt-4 max-w-2xl text-base leading-relaxed text-p-ink/60">{subtitle}</p>}
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
  return <div className={`border border-p-line bg-p-card ${className}`}>{children}</div>;
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
      <p className="portal-label !text-[9px] text-p-ink/40">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-p-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-p-ink/40">{sub}</p>}
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
    <Card className="p-8 md:p-10">
      <p className="portal-label text-p-ink">{title}</p>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-p-ink/50">{body}</p>
      {cta && (
        <a
          href={cta.href}
          target={cta.href.startsWith('http') ? '_blank' : undefined}
          rel={cta.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="portal-label mt-6 inline-flex items-center gap-3 bg-p-brand px-5 py-3 !text-[10px] text-black transition hover:bg-p-pop"
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
    s === 'ready' || s === 'paid' || s === 'done'
      ? 'text-p-brandink border-p-brandink/40'
      : s === 'in progress' || s === 'pending'
        ? 'text-p-warn border-p-warn/30'
        : s === 'overdue' || s === 'blocked'
          ? 'text-p-bad border-p-bad/40'
          : 'text-p-ink/40 border-p-ink/15';
  return (
    <span className={`portal-label inline-block border px-2 py-1 !text-[9px] ${tone}`}>
      {status || 'Pending'}
    </span>
  );
}

/** File-type marks. SVG, not emoji — these sit in front of clients. */
export function FileMark({ type }: { type: string | null }) {
  const t = (type || 'LINK').toUpperCase();
  const label = t === 'VIDEO' ? 'MP4' : t === 'FOLDER' ? 'DIR' : t === 'PDF' ? 'PDF' : 'WEB';
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-p-brandink/30">
      <span className="portal-label !text-[9px] !tracking-[0.12em] text-p-brandink">
        {label}
      </span>
    </span>
  );
}
