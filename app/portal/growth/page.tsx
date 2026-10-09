'use client';

import { useMemo, useState } from 'react';
import { usePortal, type PortalElementRow } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import {
  ELEMENTS,
  FOUNDATION,
  chainStatus,
  productByKey,
  productCta,
  type Answer,
  type ElementKey,
  type ElementState,
  type LayerStatus,
} from '@/lib/growth-chain';

const STATE_LABEL: Record<ElementState, string> = {
  locked: 'Locked',
  building: 'Building',
  unlocked: 'Unlocked',
};

function Lock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function StateTag({ state }: { state: ElementState }) {
  const tone =
    state === 'unlocked'
      ? 'border-p-brandink bg-p-brand text-black'
      : state === 'building'
        ? 'border-p-brandink/50 text-p-brandink'
        : 'border-p-ink/15 text-p-ink/45';
  return (
    <span className={`portal-label inline-flex items-center gap-1.5 border px-2 py-1 !text-[8.5px] ${tone}`}>
      {state === 'locked' && <Lock />}
      {STATE_LABEL[state]}
    </span>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <p className="portal-label !text-[8.5px] text-p-ink/25">Not measured yet</p>;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="portal-label !text-[8.5px] text-p-ink/40">Your score</span>
        <span className="text-sm font-semibold text-p-ink">{score}</span>
      </div>
      <div className="mt-1.5 h-0.5 bg-p-line">
        <div className={`h-0.5 ${score >= 70 ? 'bg-p-brand' : score >= 40 ? 'bg-p-warn' : 'bg-p-bad'}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/** What to do about a layer that isn't unlocked yet. */
function NextMove({ s }: { s: LayerStatus }) {
  if (s.state === 'building') {
    return (
      <p className="text-xs text-p-ink/55">
        {s.phasesTotal > 0 ? `In delivery · ${s.phasesDone} of ${s.phasesTotal} phases done` : 'In delivery with your PodLab team'}
      </p>
    );
  }
  const best = s.unlockers[0];
  if (!best) return null;
  const cta = productCta(best);
  return (
    <a
      href={cta.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-2 text-xs text-p-ink/70 transition hover:text-p-brandink"
    >
      Unlocked by <span className="font-semibold text-p-ink group-hover:text-p-brandink">{best.name}</span>
      <span aria-hidden="true">→</span>
    </a>
  );
}

// ── the eight-question check ────────────────────────────────────────────

type Draft = { value: string; unit?: string; idk: boolean };

function Check({ onSaved }: { onSaved: (rows: PortalElementRow[]) => void }) {
  const { accessToken } = usePortal();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(
    Object.fromEntries(ELEMENTS.map((e) => [e.key, { value: '', unit: e.units?.[0].key, idk: false }])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = ELEMENTS.every((e) => drafts[e.key].idk || drafts[e.key].value.trim() !== '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const answers: Record<string, Answer> = {};
    for (const el of ELEMENTS) {
      const d = drafts[el.key];
      answers[el.key] = d.idk ? { mode: 'idk' } : { mode: 'number', value: Number(d.value), unit: d.unit };
    }
    try {
      const res = await fetch('/api/portal/growth-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save that.');
      onSaved(json.elements as PortalElementRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <ol className="divide-y divide-p-line border-y border-p-line">
        {ELEMENTS.map((el, i) => {
          const d = drafts[el.key];
          const set = (patch: Partial<Draft>) => setDrafts((prev) => ({ ...prev, [el.key]: { ...prev[el.key], ...patch } }));
          return (
            <li key={el.key} className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <span className="portal-label !text-[9px] text-p-ink/35">
                  {String(i + 1).padStart(2, '0')} · {el.name}
                </span>
                <label htmlFor={`q-${el.key}`} className="mt-1.5 block text-[15px] font-medium text-p-ink">
                  {el.question}
                </label>
                <p className="mt-1 text-xs text-p-ink/45">{el.hint}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id={`q-${el.key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  disabled={d.idk}
                  value={d.value}
                  onChange={(e) => set({ value: e.target.value })}
                  className="w-28 border border-p-line bg-p-card px-3 py-2.5 text-base text-p-ink focus:border-p-brandink focus:outline-none disabled:opacity-30"
                />
                {el.units ? (
                  <select
                    aria-label="Unit"
                    disabled={d.idk}
                    value={d.unit}
                    onChange={(e) => set({ unit: e.target.value })}
                    className="border border-p-line bg-p-card px-3 py-2.5 text-sm text-p-ink focus:border-p-brandink focus:outline-none disabled:opacity-30"
                  >
                    {el.units.map((u) => (
                      <option key={u.key} value={u.key}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="w-14 text-sm text-p-ink/45">{el.unit}</span>
                )}
                <label className="flex cursor-pointer items-center gap-2 text-xs text-p-ink/55">
                  <input
                    type="checkbox"
                    checked={d.idk}
                    onChange={(e) => set({ idk: e.target.checked })}
                    className="h-4 w-4 accent-p-brand"
                  />
                  I don&apos;t know
                </label>
              </div>
            </li>
          );
        })}
      </ol>
      {error && <p role="alert" className="mt-4 border-l-2 border-red-500 bg-red-500/5 px-4 py-3 text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={!ready || saving}
        className="portal-label mt-6 inline-flex items-center gap-3 bg-p-brand px-6 py-4 !text-[11px] text-black transition hover:bg-p-pop disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? 'Scoring' : 'Score my chain'}
      </button>
      <p className="mt-3 text-xs text-p-ink/40">&ldquo;I don&apos;t know&rdquo; is a real answer: an element you can&apos;t measure is one you aren&apos;t running yet.</p>
    </form>
  );
}

// ── page ────────────────────────────────────────────────────────────────

export default function GrowthChainPage() {
  const { loading, client, products, elementRows, phases, setElementRows } = usePortal();
  const [checking, setChecking] = useState(false);

  const owned = useMemo(() => products.map((p) => p.product), [products]);
  const chain = useMemo(() => chainStatus(owned, elementRows, phases), [owned, elementRows, phases]);

  if (loading) return <p className="portal-label !text-[9px] text-p-ink/40">Loading</p>;

  if (!client) {
    return (
      <>
        <PageHeader title="Growth Chain" />
        <EmptyState title="No client record yet" body="Your Growth Chain appears once your workspace is set up." />
      </>
    );
  }

  const constraint = chain.elements.find((e) => e.key === chain.constraint);
  const counts = {
    unlocked: chain.unlocked,
    building: chain.elements.filter((e) => e.state === 'building').length,
    locked: chain.elements.filter((e) => e.state === 'locked').length,
  };
  const ownedProducts = owned.map((k) => productByKey(k)).filter(Boolean);

  return (
    <div>
      <PageHeader
        eyebrow="Growth Chain"
        title="Where you stand,"
        accent="and what's next."
        subtitle="Eight elements every business runs on, in the order they feed each other. Each one unlocks as we build it with you. Until then, it shows you what the gap is costing."
      />

      <div className="grid grid-cols-3 gap-px border border-p-line bg-p-line">
        {(['unlocked', 'building', 'locked'] as const).map((k) => (
          <div key={k} className="bg-p-paper p-5">
            <p className="portal-label !text-[9px] text-p-ink/40">{STATE_LABEL[k]}</p>
            <p className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${k === 'unlocked' ? 'text-p-brandink' : 'text-p-ink'}`}>
              {counts[k]}
              <span className="text-base font-normal text-p-ink/30">/8</span>
            </p>
          </div>
        ))}
      </div>

      {constraint && (
        <section className="mt-10 border-l-2 border-p-brandink pl-6">
          <span className="portal-label block text-p-brandink">
            {chain.answered > 0 ? 'Your constraint' : 'Next in the chain'}
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-p-ink md:text-3xl">
            {constraint.element.name}{' '}
            <em className="portal-drama font-normal text-p-brandink">{constraint.element.symbol}</em>
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-p-ink/70">{constraint.element.without}</p>
          <p className="mt-2 max-w-2xl text-sm text-p-ink/50">What fixes it: {constraint.element.build}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {constraint.state === 'locked' && constraint.unlockers[0] && (
              <a
                href={productCta(constraint.unlockers[0]).href}
                target="_blank"
                rel="noopener noreferrer"
                className="portal-label inline-flex items-center gap-3 bg-p-brand px-5 py-3 !text-[10px] text-black transition hover:bg-p-pop"
              >
                {productCta(constraint.unlockers[0]).label}
                {constraint.unlockers[0].price && <span className="opacity-60">· {constraint.unlockers[0].price}</span>}
              </a>
            )}
            {constraint.state === 'building' && <NextMove s={constraint} />}
          </div>
        </section>
      )}

      {(chain.answered < ELEMENTS.length || checking) && (
        <section className="mt-12">
          <span className="portal-label block text-p-brandink">The eight-question check</span>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-p-ink/60">
            {chain.answered === 0
              ? 'Two minutes. Your answers score each element the same way our diagnostic does, so your constraint is the real one, not a guess.'
              : 'Update your numbers whenever they change. Your chain re-scores straight away.'}
          </p>
          <div className="mt-6">
            <Check
              onSaved={(rows) => {
                setElementRows(rows);
                setChecking(false);
              }}
            />
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <span className="portal-label block text-p-brandink">The chain</span>
          {chain.answered === ELEMENTS.length && !checking && (
            <button onClick={() => setChecking(true)} className="portal-label !text-[9px] text-p-ink/40 transition hover:text-p-brandink">
              Update my numbers
            </button>
          )}
        </div>
        <ol className="mt-4 grid gap-px border border-p-line bg-p-line sm:grid-cols-2 xl:grid-cols-4">
          {chain.elements.map((e, i) => (
            <li
              key={e.key}
              className={`flex flex-col gap-4 bg-p-paper p-5 ${e.key === chain.constraint ? 'outline outline-1 -outline-offset-1 outline-p-brandink/60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center border text-sm font-bold ${
                      e.state === 'unlocked'
                        ? 'border-p-brandink bg-p-brand text-black'
                        : e.state === 'building'
                          ? 'border-p-brandink/60 text-p-brandink'
                          : 'border-p-ink/15 text-p-ink/35'
                    }`}
                  >
                    {e.element.symbol}
                  </span>
                <StateTag state={e.state} />
              </div>
              <div>
                <span className="portal-label block !text-[8.5px] text-p-ink/30">{String(i + 1).padStart(2, '0')}</span>
                <p className={`mt-1 text-[15px] font-semibold ${e.state === 'locked' ? 'text-p-ink/60' : 'text-p-ink'}`}>
                  {e.element.name}
                </p>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-p-ink/55">
                {e.state === 'unlocked' ? e.element.running : e.state === 'building' ? e.element.build : e.element.without}
              </p>
              <ScoreBar score={e.score} />
              <div className="border-t border-p-line pt-3">
                {e.state === 'unlocked' ? (
                  <p className="text-xs text-p-ink/45">
                    Built with {e.ownedBy.map((p) => p.name).join(', ') || 'PodLab'}
                  </p>
                ) : (
                  <NextMove s={e} />
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3 border border-t-0 border-p-line bg-p-card px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="portal-label !text-[9px] text-p-ink/35">Foundation</span>
            <span className="text-sm font-semibold text-p-ink">{FOUNDATION.name}</span>
            <StateTag state={chain.foundation.state} />
          </div>
          <div className="text-xs text-p-ink/55">
            {chain.foundation.state === 'unlocked' ? FOUNDATION.build : <NextMove s={chain.foundation} />}
          </div>
        </div>
      </section>

      {ownedProducts.length > 0 && (
        <section className="mt-12">
          <span className="portal-label block text-p-brandink">What you have with PodLab</span>
          <Card className="mt-4 divide-y divide-p-line">
            {ownedProducts.map((p) => (
              <div key={p!.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm text-p-ink">{p!.name}</span>
                <span className="portal-label !text-[8.5px] text-p-ink/35">
                  {p!.unlocks.filter((k) => k !== 'br').length > 0
                    ? `Unlocks ${p!.unlocks
                        .filter((k): k is ElementKey => k !== 'br')
                        .map((k) => ELEMENTS.find((el) => el.key === k)!.symbol)
                        .join(' · ')}`
                    : 'Production'}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
