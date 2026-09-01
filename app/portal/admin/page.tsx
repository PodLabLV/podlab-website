'use client';

/**
 * Admin console.
 *
 * The surface PodLab works from, which has not existed until now — staff edits
 * were inline controls gated by a hardcoded email array.
 *
 * Reads come from /api/portal/admin on the service role, NOT from usePortal:
 * the portal reads through RLS as the client, and staff hold no membership
 * rows, so the browser client genuinely cannot see another client's data. That
 * is the correct security posture and this route is the sanctioned way around
 * it, after resolveStaff has proven who is asking.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal, formatMoney } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import ScriptStatusBadge from '@/components/portal/ScriptStatusBadge';

interface RosterClient {
  id: string;
  business_name: string;
  email: string;
  plan_label: string | null;
  stage: string | null;
  scriptsAwaitingClient: number;
  outstandingCents: number;
}

interface Detail {
  client: { id: string; business_name: string; plan_label: string | null };
  scripts: Array<{ id: string; title: string; status: string | null; current_version: number }>;
  openComments: Array<{ id: string; body: string; author_name: string; script_id: string }>;
  assets: Array<{ id: string; title: string; status: string | null }>;
  invoices: Array<{ id: string; description: string | null; amount_cents: number; status: string | null }>;
  phases: Array<{ id: string; title: string; status: string; owner: string | null }>;
  events: Array<{ id: string; title: string; created_at: string }>;
}

export default function AdminPage() {
  const { isStaff, accessToken, loading: portalLoading } = usePortal();
  const [roster, setRoster] = useState<RosterClient[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (clientId?: string) => {
      if (!accessToken) return;
      setErr(null);
      try {
        const res = await fetch(
          `/api/portal/admin${clientId ? `?clientId=${clientId}` : ''}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Could not load that.');
        if (clientId) setDetail(body as Detail);
        else setRoster(body.clients as RosterClient[]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not load that.');
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken, load]);

  useEffect(() => {
    if (selected) load(selected);
    else setDetail(null);
  }, [selected, load]);

  if (portalLoading) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/40">
        <span className="portal-stir inline-block h-4 w-4 rounded-full border border-white/10 border-t-[#2ADD1B]" />
        Loading...
      </div>
    );
  }

  // The route enforces this too. This is only so a client who guesses the URL
  // gets a sentence instead of a spinner that never resolves.
  if (!isStaff) {
    return (
      <>
        <PageHeader title="Admin" />
        <EmptyState
          title="Not available"
          body="This area is for the PodLab team."
          cta={{ label: 'Back to your portal', href: '/portal' }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Admin" subtitle="Every client, and what each one is waiting on." />

      {err && (
        <Card className="mb-6 border-[#F0483E]/30 bg-[#F0483E]/[0.06] p-4">
          <p className="text-sm text-[#F0483E]">{err}</p>
        </Card>
      )}

      {!selected ? (
        <>
          {roster === null ? (
            <p className="text-sm text-white/40">Loading clients...</p>
          ) : roster.length === 0 ? (
            <EmptyState
              title="No clients yet"
              body="Clients appear here when a CRM lead reaches CLOSED WON, or when one is created by hand."
            />
          ) : (
            <div className="space-y-3">
              {roster.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className="block w-full rounded-2xl border border-white/10 bg-[#1A1A1A]/80 p-5 text-left backdrop-blur-sm transition hover:border-[#2ADD1B]/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-white">{c.business_name}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
                        {[c.email, c.plan_label, c.stage].filter(Boolean).join('  ·  ')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {c.scriptsAwaitingClient > 0 && (
                        <span className="rounded-lg border border-[#FFB020]/25 bg-[#FFB020]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#FFB020]">
                          {c.scriptsAwaitingClient} awaiting them
                        </span>
                      )}
                      {c.outstandingCents > 0 && (
                        <span className="portal-num rounded-lg border border-[#F0483E]/25 bg-[#F0483E]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#F0483E]">
                          {formatMoney(c.outstandingCents)} due
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => setSelected(null)}
            className="mb-4 font-mono text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60"
          >
            ← All clients
          </button>

          {!detail ? (
            <p className="text-sm text-white/40">Loading...</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg uppercase tracking-wider text-white">
                  {detail.client.business_name}
                </h2>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
                  {detail.client.plan_label}
                </p>
              </div>

              {detail.openComments.length > 0 && (
                <Card className="border-[#FFB020]/25 bg-[#FFB020]/[0.05] p-5">
                  <p className="font-display text-[10px] uppercase tracking-widest text-[#FFB020]">
                    {detail.openComments.length} open note
                    {detail.openComments.length === 1 ? '' : 's'} on scripts
                  </p>
                  <div className="mt-3 space-y-2">
                    {detail.openComments.slice(0, 5).map((c) => (
                      <Link
                        key={c.id}
                        href={`/portal/scripts/${c.script_id}`}
                        className="block rounded-xl border border-white/5 bg-black/20 px-3 py-2 hover:border-white/20"
                      >
                        <p className="text-sm text-white/70">{c.body}</p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/25">
                          {c.author_name}
                        </p>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-white">
                    Scripts
                  </h3>
                  {detail.scripts.length === 0 ? (
                    <p className="text-sm text-white/30">None yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.scripts.map((s) => (
                        <Link
                          key={s.id}
                          href={`/portal/scripts/${s.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/5 px-3 py-2 hover:border-white/20"
                        >
                          <span className="min-w-0 truncate text-sm text-white/80">{s.title}</span>
                          <ScriptStatusBadge status={s.status} showPlain={false} />
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-white">
                    Delivery
                  </h3>
                  {detail.phases.length === 0 ? (
                    <p className="text-sm text-white/30">No plan seeded.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.phases.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/5 px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-sm text-white/80">{p.title}</span>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-white/40">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              <Card className="p-5">
                <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-white">
                  Recent activity
                </h3>
                {detail.events.length === 0 ? (
                  <p className="text-sm text-white/30">Nothing logged.</p>
                ) : (
                  <div className="space-y-1">
                    {detail.events.slice(0, 12).map((e) => (
                      <p key={e.id} className="font-mono text-xs text-white/60">
                        <span className="portal-num text-white/25">
                          {e.created_at.slice(0, 10)}
                        </span>{' '}
                        {e.title}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
}
