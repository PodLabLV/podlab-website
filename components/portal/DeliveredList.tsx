'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal, formatDate } from '@/lib/portal-data';
import { EmptyState } from '@/components/portal/Shared';
import type { DeliveredItem } from '@/lib/delivered-server';

const KIND: Record<DeliveredItem['kind'], string> = {
  video: 'Video',
  file: 'File',
  script: 'Script',
  phase: 'Build',
};

/** What PodLab has shipped for this client, newest first. `limit` trims it for the dashboard. */
export default function DeliveredList({ limit }: { limit?: number }) {
  const { accessToken, client } = usePortal();
  const [items, setItems] = useState<DeliveredItem[] | null>(null);

  useEffect(() => {
    if (!accessToken || !client) return;
    fetch('/api/portal/delivered', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setItems((j.items as DeliveredItem[]) ?? []))
      .catch(() => setItems([]));
  }, [accessToken, client]);

  if (items === null) return <p className="portal-label !text-[9px] text-p-ink/35">Loading</p>;
  if (items.length === 0) {
    return <EmptyState title="Nothing delivered yet" body="Every finished video, approved file and completed phase lands here with its date." />;
  }

  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div>
      <ol className="divide-y divide-p-line border-y border-p-line">
        {shown.map((it, i) => (
          <li key={`${it.kind}-${it.title}-${i}`} className="flex items-center gap-4 py-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-p-brandink bg-p-brand text-black" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            <Link href={it.href} className="group min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-p-ink transition group-hover:text-p-brandink">{it.title}</span>
              <span className="portal-label mt-1 block !text-[8.5px] text-p-ink/35">
                {KIND[it.kind]} · {it.detail}
              </span>
            </Link>
            <span className="portal-label shrink-0 !text-[8.5px] text-p-ink/35">{it.at ? formatDate(it.at) : ''}</span>
          </li>
        ))}
      </ol>
      {limit && items.length > limit && (
        <Link href="/portal/progress" className="portal-label mt-3 inline-block !text-[9px] text-p-ink/40 transition hover:text-p-brandink">
          All {items.length} deliveries
        </Link>
      )}
    </div>
  );
}
