'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import { PageHeader, EmptyState } from '@/components/portal/Shared';
import { ELEMENTS, FOUNDATION, PRODUCTS, chainStatus, type ElementRow, type ElementState, type LayerKey } from '@/lib/growth-chain';
import SharedCards from '@/components/portal/SharedCards';
import TeamAccess from '@/components/portal/TeamAccess';
import type { StaffClientDetail } from '@/app/api/portal/admin/client/route';

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

const STATE_TONE: Record<ElementState, string> = {
  unlocked: 'border-p-brandink bg-p-brand text-black',
  building: 'border-p-brandink/50 text-p-brandink',
  locked: 'border-p-ink/15 text-p-ink/70',
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-12">
      <span className="portal-label block text-p-brandink">{title}</span>
      {hint && <p className="mt-2 max-w-2xl text-base text-p-ink/75">{hint}</p>}
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

  if (loading || (!d && !error)) return <p className="portal-label !text-[12px] text-p-ink/70">Loading client</p>;
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
      <Link href="/portal/clients" className="portal-label !text-[12px] text-p-ink/70 transition hover:text-p-brandink">
        ← All clients
      </Link>
      <div className="mt-6">
        <a
          href={`/portal?viewAs=${d.client.id}`}
          className="portal-label float-right ml-4 inline-flex items-center gap-2 bg-p-brand px-5 py-3 !text-[12px] text-black transition hover:bg-p-pop"
        >
          View as client
        </a>
        <PageHeader
          eyebrow={d.client.planLabel ?? 'Client'}
          title={d.client.businessName}
          subtitle={[d.client.name, d.client.email, d.client.hasLogin ? 'has a login' : 'no login yet'].filter(Boolean).join(' · ')}
        />
      </div>

      {d.missing.length > 0 && (
        <p className="border-l-2 border-p-warn bg-p-warn/5 px-4 py-3 text-base text-p-ink/90">
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
              className="portal-label inline-flex items-center gap-2 bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop"
            >
              Open in Drive ↗
            </a>
            <button onClick={() => setDriveDraft(d.client.driveFolderUrl ?? '')} className="portal-label !text-[12px] text-p-ink/70 transition hover:text-p-brandink">
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
              className="min-w-0 flex-1 border border-p-line bg-p-paper px-3 py-2.5 text-base text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none"
            />
            <button
              disabled={busy !== null}
              onClick={async () => {
                await call('drive', '/api/portal/admin/client', 'PATCH', { id: d.client.id, driveFolderUrl: driveDraft ?? '' }, 'Drive folder saved.');
                setDriveDraft(null);
              }}
              className="portal-label bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:opacity-40"
            >
              Save
            </button>
            {d.client.driveFolderUrl && (
              <button onClick={() => setDriveDraft(null)} className="portal-label px-3 !text-[12px] text-p-ink/70 hover:text-p-ink">
                Cancel
              </button>
            )}
          </div>
        )}
      </Section>

      {flash && <p role="status" className="mt-4 border-l-2 border-p-brandink bg-p-brand/5 px-4 py-3 text-base text-p-ink/90">{flash}</p>}

      <Section title="Brand, content and game plan" hint="Their brand kit (add files, make the editors' link), their content calendar (send recorded pieces to the editors), and their 90-day game plan.">
        <Link
          href={`/portal/brand?client=${d.client.id}`}
          className="portal-label inline-flex items-center gap-2 border border-p-line px-5 py-3 !text-[13px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink"
        >
          Open their brand page
        </Link>
        <Link
          href={`/portal/content?client=${d.client.id}`}
          className="portal-label ml-2 inline-flex items-center gap-2 border border-p-line px-5 py-3 !text-[13px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink"
        >
          Content plan
        </Link>
        <Link
          href={`/portal/plan?client=${d.client.id}`}
          className="portal-label ml-2 inline-flex items-center gap-2 border border-p-line px-5 py-3 !text-[13px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink"
        >
          Game plan
        </Link>
      </Section>

      <Section title="What they bought" hint="Drives their Growth Chain: a product moves the elements it unlocks to Building. Edits and recordings show under what they have but unlock nothing.">
        <ul className="grid gap-px border border-p-line bg-p-line sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => {
            const owned = d.products.includes(p.key);
            return (
              <li key={p.key}>
                <button
                  disabled={busy !== null}
                  onClick={() =>
                    call(`p-${p.key}`, '/api/portal/growth-chain', 'PATCH', { clientId: d.client.id, product: p.key, remove: owned }, owned ? `Removed ${p.name}.` : `Recorded ${p.name}.`)
                  }
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition disabled:opacity-60 ${owned ? 'bg-p-brand/[0.08]' : 'bg-p-paper hover:bg-p-ink/[0.03]'}`}
                >
                  <span>
                    <span className="block text-base text-p-ink">{p.name}</span>
                    <span className="portal-label mt-1 block !text-[11px] text-p-ink/65">
                      {p.unlocks.length ? p.unlocks.map((k) => (k === 'br' ? 'Brand' : ELEMENTS.find((e) => e.key === k)!.symbol)).join(' · ') : 'Production'}
                    </span>
                  </span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center border text-[14px] ${owned ? 'border-p-brandink bg-p-brand text-black' : 'border-p-ink/20'}`}>
                    {owned ? <Check /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Growth Chain" hint="States work themselves out: bought → Building, delivered → Unlocked (when all of an element's delivery phases are done, or when you mark it delivered here). Override only when the automatic state is wrong.">
        <ul className="divide-y divide-p-line border border-p-line">
          {layers.map((l) => {
            const row = rowFor(l.key);
            return (
              <li key={l.key} className="flex flex-col gap-3 bg-p-paper px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className={`portal-label border px-2 py-1 !text-[11px] ${STATE_TONE[l.state]}`}>{l.state}</span>
                  <span className="text-base text-p-ink">{l.name}</span>
                  {l.score !== null && <span className="text-sm text-p-ink/70">score {l.score}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      call(`d-${l.key}`, '/api/portal/growth-chain', 'PATCH', { clientId: d.client.id, element: l.key, delivered: !row?.delivered_at }, row?.delivered_at ? 'Marked not delivered.' : 'Marked delivered.')
                    }
                    className={`portal-label border px-3 py-2 !text-[12px] transition disabled:opacity-50 ${row?.delivered_at ? 'border-p-brandink text-p-brandink' : 'border-p-line text-p-ink/80 hover:border-p-brandink hover:text-p-brandink'}`}
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
                    className="border border-p-line bg-p-paper px-2 py-2 text-sm text-p-ink/85 focus:border-p-brandink focus:outline-none"
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
        <ul className="grid gap-px border border-p-line bg-p-line sm:grid-cols-2">
          {d.boards.map((b) => (
            <li key={b.id}>
              <button
                disabled={busy !== null}
                onClick={() =>
                  call(`b-${b.id}`, '/api/portal/production', 'PATCH', { clientId: d.client.id, boardId: b.id, remove: b.linked }, b.linked ? `Unlinked ${b.name}.` : `Linked ${b.name}.`)
                }
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition disabled:opacity-60 ${b.linked ? 'bg-p-brand/[0.08]' : 'bg-p-paper hover:bg-p-ink/[0.03]'}`}
              >
                <span>
                  <span className="block text-base text-p-ink">{b.name}</span>
                  <span className="portal-label mt-1 block !text-[11px] text-p-ink/65">{b.type}</span>
                </span>
                <span className={`portal-label shrink-0 !text-[11px] ${b.linked ? 'text-p-brandink' : 'text-p-ink/65'}`}>{b.linked ? 'Linked' : 'Link'}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Shared cards" hint="Single cards from boards you don't want to link whole, like Deal Flow Radio episodes and clips. Shared cards show on their Production page, and they can watch, comment on and approve them.">
        {accessToken && <SharedCards clientId={d.client.id} accessToken={accessToken} />}
      </Section>

      {d.videoAssets.length > 0 && (
        <Section
          title="Video deliverables and editor cards"
          hint="Tie a video deliverable to the card the editor works from. When the client sends notes on it, they land on that card with time and chapter, and a card past review goes back to Revising."
        >
          {d.cards.length === 0 ? (
            <p className="text-base text-p-ink/75">Link a production board above first; its cards show up here.</p>
          ) : (
            <ul className="divide-y divide-p-line border border-p-line">
              {d.videoAssets.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 bg-p-paper px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <span className="text-base text-p-ink">{a.title}</span>
                  <select
                    aria-label={`Editor card for ${a.title}`}
                    disabled={busy !== null}
                    value={a.crmCardId ?? ''}
                    onChange={(e) =>
                      call(`a-${a.id}`, '/api/portal/deliverables', 'POST', { intent: 'link-card', assetId: a.id, crmCardId: e.target.value || null }, e.target.value ? 'Tied to the editor card.' : 'Untied.')
                    }
                    className="w-full border border-p-line bg-p-paper px-2 py-2 text-sm text-p-ink/85 focus:border-p-brandink focus:outline-none md:w-80"
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
              className="portal-label bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:cursor-not-allowed disabled:opacity-40"
            >
              {gen.published >= gen.generated ? 'All published' : `Publish ${gen.generated - gen.published} script${gen.generated - gen.published === 1 ? '' : 's'}`}
            </button>
            <span className="text-sm text-p-ink/70">
              {gen.published} of {gen.generated} already in their portal
            </span>
          </div>
        </Section>
      )}

      {d.drafts && d.drafts.length > 0 && (
        <Section
          title="TipTop's script drafts"
          hint="Scripts TipTop wrote with the client. They sit in the client's Scripts as Draft (our turn) until you send them for the client's review and approval."
        >
          <ul className="divide-y divide-p-line border border-p-line">
            {d.drafts.map((dr) => (
              <li key={dr.id} className="bg-p-paper p-4">
                <details>
                  <summary className="cursor-pointer list-none">
                    <span className="text-base font-semibold text-p-ink">{dr.title}</span>
                    <span className="ml-2 text-sm text-p-ink/70">
                      {[dr.kind, dr.words ? `${dr.words} words` : null, new Date(dr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })].filter(Boolean).join(' · ')}
                    </span>
                    {dr.note && <span className="mt-1 block text-sm text-p-ink/75">{dr.note}</span>}
                  </summary>
                  <p className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap border-l border-p-line pl-3 text-base leading-relaxed text-p-ink/90">{dr.body}</p>
                </details>
                <button
                  disabled={busy !== null}
                  onClick={() => call(`draft-${dr.id}`, '/api/portal/scripts', 'PATCH', { scriptId: dr.id, status: 'in review' }, `"${dr.title}" sent to the client for review.`)}
                  className="portal-label mt-3 bg-p-brand px-4 py-2.5 !text-[12px] text-black transition hover:bg-p-pop disabled:opacity-40"
                >
                  Send to client for review
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Access">
        <Link
          href="/portal/clients"
          className="portal-label inline-flex border border-p-line px-5 py-3 !text-[13px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink"
        >
          {d.client.hasLogin ? 'Send a new sign-in link' : 'Send their invite'} from the client list →
        </Link>
      </Section>

      <Section title="Team access" hint="An assistant or partner gets their own login to this portal. Their notes and approvals go out under their own name, tagged with their role. Remove them any time.">
        {accessToken && <TeamAccess clientId={d.client.id} accessToken={accessToken} />}
      </Section>
    </div>
  );
}
