'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import { ELEMENTS, FOUNDATION, PRODUCTS, chainStatus, type ElementRow, type ElementState, type LayerKey } from '@/lib/growth-chain';
import type { StaffClientDetail } from '@/app/api/portal/admin/client/route';

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

const STATE_TONE: Record<ElementState, string> = {
  unlocked: 'border-[#2add1b] bg-[#2add1b] text-black',
  building: 'border-[#2add1b]/50 text-[#2add1b]',
  locked: 'border-[#eeeeee]/15 text-[#eeeeee]/45',
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-12">
      <span className="portal-label block text-[#2add1b]">{title}</span>
      {hint && <p className="mt-2 max-w-2xl text-sm text-[#eeeeee]/50">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function StaffClientPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, loading } = usePortal();
  const [d, setD] = useState<StaffClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [gen, setGen] = useState<{ generated: number; published: number } | null>(null);
  const [driveDraft, setDriveDraft] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch(`/api/portal/admin/client?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) setError(res.status === 401 ? 'staff' : json.error || 'Could not load this client.');
    else setD(json as StaffClientDetail);
    const g = await fetch(`/api/portal/admin/publish-scripts?clientId=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    if (g.ok) setGen(await g.json());
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function call(key: string, url: string, method: string, body: object, ok: string) {
    setBusy(key);
    setFlash(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save that.');
      await load();
      setFlash(ok);
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(null);
    }
  }

  const chain = useMemo(
    () => (d ? chainStatus(d.products, d.elements as ElementRow[], d.phases) : null),
    [d],
  );

  if (loading || (!d && !error)) return <p className="portal-label !text-[9px] text-[#eeeeee]/40">Loading client</p>;
  if (error || !d || !chain) {
    return (
      <>
        <PageHeader title="Client" />
        <EmptyState title={error === 'staff' ? 'Staff only' : 'Could not load this client'} body={error === 'staff' ? 'This page is for the PodLab team.' : error ?? ''} />
      </>
    );
  }

  const layers: Array<{ key: LayerKey; name: string; state: ElementState; score: number | null }> = [
    { key: 'br', name: FOUNDATION.name, state: chain.foundation.state, score: null },
    ...chain.elements.map((e) => ({ key: e.key as LayerKey, name: `${e.element.symbol} · ${e.element.name}`, state: e.state, score: e.score })),
  ];
  const rowFor = (k: LayerKey) => d.elements.find((e) => e.element === k);

  return (
    <div>
      <Link href="/portal/clients" className="portal-label !text-[9px] text-[#eeeeee]/40 transition hover:text-[#2add1b]">
        ← All clients
      </Link>
      <div className="mt-6">
        <PageHeader
          eyebrow={d.client.planLabel ?? 'Client'}
          title={d.client.businessName}
          subtitle={[d.client.name, d.client.email, d.client.hasLogin ? 'has a login' : 'no login yet'].filter(Boolean).join(' · ')}
        />
      </div>

      {d.missing.length > 0 && (
        <p className="border-l-2 border-yellow-300 bg-yellow-300/5 px-4 py-3 text-sm text-[#eeeeee]/80">
          Waiting on a migration: {d.missing.join(', ')}. Saving those sections will fail until it runs.
        </p>
      )}
      <Section title="Drive folder" hint="Their folder in the PodLab OS Shared Drive: Clarity Doc, brand kit, pictures, raw footage and finished projects.">
        {d.client.driveFolderUrl && driveDraft === null ? (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={d.client.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-label inline-flex items-center gap-2 bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee]"
            >
              Open in Drive ↗
            </a>
            <button onClick={() => setDriveDraft(d.client.driveFolderUrl ?? '')} className="portal-label !text-[9px] text-[#eeeeee]/40 transition hover:text-[#2add1b]">
              Change link
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={driveDraft ?? ''}
              onChange={(e) => setDriveDraft(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/…"
              aria-label="Drive folder link"
              className="min-w-0 flex-1 border border-[#1a1a1a] bg-black px-3 py-2.5 text-sm text-[#eeeeee] placeholder:text-[#eeeeee]/25 focus:border-[#2add1b] focus:outline-none"
            />
            <button
              disabled={busy !== null}
              onClick={async () => {
                await call('drive', '/api/portal/admin/client', 'PATCH', { id: d.client.id, driveFolderUrl: driveDraft ?? '' }, 'Drive folder saved.');
                setDriveDraft(null);
              }}
              className="portal-label bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee] disabled:opacity-40"
            >
              Save
            </button>
            {d.client.driveFolderUrl && (
              <button onClick={() => setDriveDraft(null)} className="portal-label px-3 !text-[9px] text-[#eeeeee]/40 hover:text-[#eeeeee]">
                Cancel
              </button>
            )}
          </div>
        )}
      </Section>

      {flash && <p role="status" className="mt-4 border-l-2 border-[#2add1b] bg-[#2add1b]/5 px-4 py-3 text-sm text-[#eeeeee]/85">{flash}</p>}

      <Section title="What they bought" hint="Drives their Growth Chain: a product moves the elements it unlocks to Building. Edits and recordings show under what they have but unlock nothing.">
        <ul className="grid gap-px border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => {
            const owned = d.products.includes(p.key);
            return (
              <li key={p.key}>
                <button
                  disabled={busy !== null}
                  onClick={() =>
                    call(`p-${p.key}`, '/api/portal/growth-chain', 'PATCH', { clientId: d.client.id, product: p.key, remove: owned }, owned ? `Removed ${p.name}.` : `Recorded ${p.name}.`)
                  }
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition disabled:opacity-60 ${owned ? 'bg-[#2add1b]/[0.08]' : 'bg-black hover:bg-white/[0.03]'}`}
                >
                  <span>
                    <span className="block text-sm text-[#eeeeee]">{p.name}</span>
                    <span className="portal-label mt-1 block !text-[8.5px] text-[#eeeeee]/35">
                      {p.unlocks.length ? p.unlocks.map((k) => (k === 'br' ? 'Brand' : ELEMENTS.find((e) => e.key === k)!.symbol)).join(' · ') : 'Production'}
                    </span>
                  </span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center border text-[11px] ${owned ? 'border-[#2add1b] bg-[#2add1b] text-black' : 'border-[#eeeeee]/20'}`}>
                    {owned ? <Check /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Growth Chain" hint="States work themselves out: bought → Building, delivered → Unlocked (when all of an element's delivery phases are done, or when you mark it delivered here). Override only when the automatic state is wrong.">
        <ul className="divide-y divide-[#1a1a1a] border border-[#1a1a1a]">
          {layers.map((l) => {
            const row = rowFor(l.key);
            return (
              <li key={l.key} className="flex flex-col gap-3 bg-black px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className={`portal-label border px-2 py-1 !text-[8.5px] ${STATE_TONE[l.state]}`}>{l.state}</span>
                  <span className="text-sm text-[#eeeeee]">{l.name}</span>
                  {l.score !== null && <span className="text-xs text-[#eeeeee]/40">score {l.score}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      call(`d-${l.key}`, '/api/portal/growth-chain', 'PATCH', { clientId: d.client.id, element: l.key, delivered: !row?.delivered_at }, row?.delivered_at ? 'Marked not delivered.' : 'Marked delivered.')
                    }
                    className={`portal-label border px-3 py-2 !text-[9px] transition disabled:opacity-50 ${row?.delivered_at ? 'border-[#2add1b] text-[#2add1b]' : 'border-[#1a1a1a] text-[#eeeeee]/60 hover:border-[#2add1b] hover:text-[#2add1b]'}`}
                  >
                    {row?.delivered_at ? 'Delivered' : 'Mark delivered'}
                  </button>
                  <select
                    aria-label={`Override ${l.name}`}
                    disabled={busy !== null}
                    value={row?.state_override ?? ''}
                    onChange={(e) =>
                      call(`o-${l.key}`, '/api/portal/growth-chain', 'PATCH', { clientId: d.client.id, element: l.key, override: e.target.value || null }, 'Override saved.')
                    }
                    className="border border-[#1a1a1a] bg-black px-2 py-2 text-xs text-[#eeeeee]/70 focus:border-[#2add1b] focus:outline-none"
                  >
                    <option value="">Automatic</option>
                    <option value="locked">Force locked</option>
                    <option value="building">Force building</option>
                    <option value="unlocked">Force unlocked</option>
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Production boards" hint="Linked boards show on their Production page, and their revision notes land on these boards' cards.">
        <ul className="grid gap-px border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-2">
          {d.boards.map((b) => (
            <li key={b.id}>
              <button
                disabled={busy !== null}
                onClick={() =>
                  call(`b-${b.id}`, '/api/portal/production', 'PATCH', { clientId: d.client.id, boardId: b.id, remove: b.linked }, b.linked ? `Unlinked ${b.name}.` : `Linked ${b.name}.`)
                }
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition disabled:opacity-60 ${b.linked ? 'bg-[#2add1b]/[0.08]' : 'bg-black hover:bg-white/[0.03]'}`}
              >
                <span>
                  <span className="block text-sm text-[#eeeeee]">{b.name}</span>
                  <span className="portal-label mt-1 block !text-[8.5px] text-[#eeeeee]/35">{b.type}</span>
                </span>
                <span className={`portal-label shrink-0 !text-[8.5px] ${b.linked ? 'text-[#2add1b]' : 'text-[#eeeeee]/30'}`}>{b.linked ? 'Linked' : 'Link'}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      {d.videoAssets.length > 0 && (
        <Section
          title="Video deliverables and editor cards"
          hint="Tie a video deliverable to the card the editor works from. When the client sends notes on it, they land on that card with time and chapter, and a card past review goes back to Revising."
        >
          {d.cards.length === 0 ? (
            <p className="text-sm text-[#eeeeee]/50">Link a production board above first; its cards show up here.</p>
          ) : (
            <ul className="divide-y divide-[#1a1a1a] border border-[#1a1a1a]">
              {d.videoAssets.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 bg-black px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <span className="text-sm text-[#eeeeee]">{a.title}</span>
                  <select
                    aria-label={`Editor card for ${a.title}`}
                    disabled={busy !== null}
                    value={a.crmCardId ?? ''}
                    onChange={(e) =>
                      call(`a-${a.id}`, '/api/portal/deliverables', 'POST', { intent: 'link-card', assetId: a.id, crmCardId: e.target.value || null }, e.target.value ? 'Tied to the editor card.' : 'Untied.')
                    }
                    className="w-full border border-[#1a1a1a] bg-black px-2 py-2 text-xs text-[#eeeeee]/75 focus:border-[#2add1b] focus:outline-none md:w-80"
                  >
                    <option value="">Not tied to a card</option>
                    {d.cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.board} · {c.title}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {gen && gen.generated > 0 && (
        <Section
          title="Scripts from their application"
          hint="The CRM drafted these from their free-VSL application. Edit them in the CRM first; publishing sends them to the client's Scripts page as v1 for review. Already-published titles are skipped."
        >
          <div className="flex flex-wrap items-center gap-4">
            <button
              disabled={busy !== null || gen.published >= gen.generated}
              onClick={() => call('publish', '/api/portal/admin/publish-scripts', 'POST', { clientId: d.client.id }, 'Scripts published to their portal.')}
              className="portal-label bg-[#2add1b] px-5 py-3 !text-[10px] text-black transition hover:bg-[#eeeeee] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {gen.published >= gen.generated ? 'All published' : `Publish ${gen.generated - gen.published} script${gen.generated - gen.published === 1 ? '' : 's'}`}
            </button>
            <span className="text-xs text-[#eeeeee]/40">
              {gen.published} of {gen.generated} already in their portal
            </span>
          </div>
        </Section>
      )}

      <Section title="Access">
        <Link
          href="/portal/clients"
          className="portal-label inline-flex border border-[#1a1a1a] px-5 py-3 !text-[10px] text-[#eeeeee]/70 transition hover:border-[#2add1b] hover:text-[#2add1b]"
        >
          {d.client.hasLogin ? 'Send a new sign-in link' : 'Send their invite'} from the client list →
        </Link>
      </Section>
    </div>
  );
}
