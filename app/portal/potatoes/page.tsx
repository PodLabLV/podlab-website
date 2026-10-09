'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import { PotatoIcon } from '@/components/portal/HotPotato';
import { HEAT_LABEL, type Heat, type Potato } from '@/lib/portal/potato';

const HEATS: Heat[] = ['smoke', 'fire', 'hot', 'warm'];

function group(list: Potato[], by: (p: Potato) => string): Array<[string, Potato[]]> {
  const m = new Map<string, Potato[]>();
  for (const p of list) m.set(by(p), [...(m.get(by(p)) ?? []), p]);
  // Whoever holds the hottest potato goes first.
  return [...m].sort((a, b) => b[1][0].days - a[1][0].days || b[1].length - a[1].length);
}

function Rows({ list, showClient }: { list: Potato[]; showClient: boolean }) {
  return (
    <ul className="divide-y divide-p-line">
      {list.map((p) => (
        <li key={`${p.clientId}-${p.key}`} className="flex items-center gap-3 px-4 py-3">
          <PotatoIcon heat={p.heat} size={24} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-p-ink">{p.title}</p>
            <p className="truncate text-xs text-p-ink/40">
              {showClient && p.clientName ? `${p.clientName} · ` : ''}
              {p.why}
            </p>
          </div>
          <span className={`portal-label shrink-0 !text-[8.5px] ${p.heat === 'smoke' || p.heat === 'fire' ? 'text-[#ff8a1f]' : 'text-p-ink/40'}`}>
            {HEAT_LABEL[p.heat]} · day {p.days}
          </span>
          {p.clientId && (
            <Link href={`/portal/clients/${p.clientId}`} className="portal-label shrink-0 !text-[8.5px] text-p-brandink hover:text-p-ink">
              Client
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function PotatoBoard() {
  const { accessToken, loading } = usePortal();
  const [list, setList] = useState<Potato[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/portal/potatoes', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok || !j.staff) throw new Error('staff');
        setList(j.potatoes as Potato[]);
      })
      .catch(() => setError('staff'));
  }, [accessToken]);

  if (loading || (!list && !error)) return <p className="portal-label !text-[9px] text-p-ink/40">Heating up</p>;
  if (error) return <EmptyState title="Staff only" body="This page is for the PodLab team." />;

  const team = list!.filter((p) => p.holder === 'team');
  const clients = list!.filter((p) => p.holder === 'client');
  const count = (h: Heat) => list!.filter((p) => p.heat === h).length;

  return (
    <div>
      <PageHeader
        eyebrow="Staff"
        title="Hot potatoes,"
        accent="who's holding."
        subtitle="Whoever's turn it is holds the potato. It heats up every day: warm, glowing, on fire, then it smokes out the client's portal. Clients see the potatoes we hold for them too."
      />

      <div className="grid grid-cols-2 gap-px border border-p-line bg-p-line sm:grid-cols-4">
        {HEATS.map((h) => (
          <div key={h} className="flex items-center gap-3 bg-p-paper p-4">
            <PotatoIcon heat={h} size={28} />
            <div>
              <p className="portal-label !text-[8.5px] text-p-ink/40">{HEAT_LABEL[h]}</p>
              <p className="text-2xl font-bold text-p-ink">{count(h)}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <span className="portal-label block text-p-brandink">On the team · {team.length}</span>
        {team.length ? (
          <div className="mt-4 space-y-4">
            {group(team, (p) => p.who).map(([who, ps]) => (
              <div key={who} className="border border-p-line">
                <p className="portal-label border-b border-p-line bg-p-card px-4 py-2.5 !text-[9px] text-p-ink/70">
                  {who} · {ps.length}
                </p>
                <Rows list={ps} showClient />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-p-ink/50">The team isn&apos;t holding anything. Every open item is on a client.</p>
        )}
      </section>

      <section className="mt-12">
        <span className="portal-label block text-p-brandink">On clients · {clients.length}</span>
        <div className="mt-4 space-y-4">
          {group(clients, (p) => p.clientName ?? 'Client').map(([name, ps]) => (
            <div key={name} className="border border-p-line">
              <p className="portal-label border-b border-p-line bg-p-card px-4 py-2.5 !text-[9px] text-p-ink/70">
                {name} · {ps.length}
              </p>
              <Rows list={ps} showClient={false} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
