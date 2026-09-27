'use client';

/**
 * Deliverables.
 *
 * Every file we have made, with its version history, timestamped notes, and the
 * client's approval. Files live in a private bucket — every download is a
 * short-lived signed URL minted server-side after an ownership check, so a
 * shared link expires and a guessed path returns nothing.
 */

import { useMemo, useState } from 'react';
import { usePortal, formatDate } from '@/lib/portal-data';
import type { PortalAsset, PortalAssetComment } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState, FileMark } from '@/components/portal/Shared';

const TONE: Record<string, string> = {
  approved: '#2ADD1B',
  ready: '#2ADD1B',
  'pending review': '#FFB020',
  'changes requested': '#22D3EE',
  'in progress': '#22D3EE',
  pending: '#FFB020',
};

function tone(status: string | null): string {
  return TONE[(status || '').toLowerCase()] ?? '#FFFFFF40';
}

/** "0:42" — the form a note refers to, so it reads the same as the player. */
function clock(seconds: number | null): string {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function humanSize(bytes: number | null): string | null {
  if (!bytes) return null;
  const mb = bytes / 1_048_576;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

export default function DeliverablesPage() {
  const {
    loading, client, assets, assetVersions, assetComments, accessToken,
  } = usePortal();

  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [stamp, setStamp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [labFilter, setLabFilter] = useState<string>('All');

  const labs = useMemo(
    () => ['All', ...Array.from(new Set(assets.map((a) => a.lab).filter(Boolean) as string[]))],
    [assets],
  );

  const shown = labFilter === 'All' ? assets : assets.filter((a) => a.lab === labFilter);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/40">
        <span className="portal-stir inline-block h-4 w-4 rounded-full border border-white/10 border-t-[#2ADD1B]" />
        Loading...
      </div>
    );
  }

  if (!client || assets.length === 0) {
    return (
      <>
        <PageHeader title="Deliverables" />
        <EmptyState
          title="Nothing delivered yet"
          body="Every file we produce for you lands here — brand assets, cuts, documents. You will be able to watch it, leave a note at any moment in a video, and approve it."
        />
      </>
    );
  }

  async function call(path: string, method: string, payload: unknown) {
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.error || 'Something went wrong.');
    }
    return res.json();
  }

  /** Signed URLs are minted per click and expire in five minutes. */
  async function open(versionId: string) {
    setErr(null);
    try {
      const res = await fetch(`/api/portal/deliverables?versionId=${versionId}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error(body.error || 'Could not open that file.');
      window.open(body.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open that file.');
    }
  }

  async function decide(assetId: string, decision: 'approved' | 'changes requested') {
    setBusy(true);
    setErr(null);
    try {
      await call('/api/portal/deliverables', 'PATCH', { assetId, decision });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  async function note(versionId: string) {
    if (!draft.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      // "1:23" or plain seconds, both accepted — a client should not have to
      // work out what format we want.
      let timeSeconds: number | null = null;
      const raw = stamp.trim();
      if (raw) {
        const parts = raw.split(':').map(Number);
        if (parts.every((n) => Number.isFinite(n))) {
          timeSeconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
        }
      }
      await call('/api/portal/deliverables/comments', 'POST', {
        versionId,
        timeSeconds,
        body: draft.trim(),
      });
      setDraft('');
      setStamp('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  function Row({ asset }: { asset: PortalAsset }) {
    const versions = assetVersions
      .filter((v) => v.asset_id === asset.id)
      .sort((a, b) => b.version_no - a.version_no);
    const current = versions[0];
    const notes: PortalAssetComment[] = assetComments
      .filter((c) => c.version_id === current?.id)
      .sort((a, b) => (a.time_seconds ?? -1) - (b.time_seconds ?? -1));
    const expanded = openId === asset.id;
    const hex = tone(asset.status);
    const isVideo = (asset.file_type || '').toUpperCase() === 'VIDEO';

    return (
      <Card className="overflow-hidden">
        <div className="flex items-start gap-4 p-5">
          {/* The site's signature B&W→colour hover, brought into the portal. */}
          <span className="shrink-0 grayscale transition duration-300 hover:grayscale-0">
            <FileMark type={asset.file_type} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white">{asset.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
                  {[
                    asset.lab,
                    current ? `v${current.version_no}` : null,
                    humanSize(current?.size_bytes ?? null) ?? asset.size_label,
                    current ? formatDate(current.created_at) : null,
                  ]
                    .filter(Boolean)
                    .join('  ·  ')}
                </p>
              </div>
              <span
                className="rounded-lg border px-2.5 py-1 font-display text-[10px] uppercase tracking-widest"
                style={{ color: hex, borderColor: `${hex}33`, backgroundColor: `${hex}1A` }}
              >
                {asset.status || 'Pending'}
              </span>
            </div>

            {asset.description && (
              <p className="mt-2 text-sm leading-relaxed text-white/50">{asset.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {current && (
                <button
                  onClick={() => open(current.id)}
                  className="rounded-xl bg-[#2ADD1B] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#85FF78]"
                >
                  {isVideo ? 'Watch' : 'Open'}
                </button>
              )}
              {!current && asset.url && (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#2ADD1B] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#85FF78]"
                >
                  Open
                </a>
              )}
              <button
                onClick={() => {
                  setOpenId(expanded ? null : asset.id);
                  setDraft('');
                  setStamp('');
                }}
                className="font-mono text-[10px] uppercase tracking-wider text-white/40 hover:text-white"
              >
                {expanded ? 'Hide' : `Notes${notes.length ? ` (${notes.length})` : ''} & versions`}
              </button>
            </div>
          </div>
        </div>

        {expanded && current && (
          <div className="border-t border-white/5 bg-black/20 p-5">
            {notes.length > 0 && (
              <div className="mb-5 space-y-2">
                {notes.map((c) => (
                  <div key={c.id} className="flex gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                    {c.time_seconds !== null && (
                      <span className="portal-num shrink-0 rounded border border-[#22D3EE]/20 bg-[#22D3EE]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#22D3EE]">
                        {clock(c.time_seconds)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed text-white/70">{c.body}</p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-white/25">
                        {c.author_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {isVideo && (
                <input
                  value={stamp}
                  onChange={(e) => setStamp(e.target.value)}
                  placeholder="0:42"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder:text-white/25 focus:border-[#22D3EE]/40 focus:outline-none sm:w-24"
                />
              )}
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={isVideo ? 'What should change at that moment?' : 'Leave a note'}
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-white/25 focus:outline-none"
              />
              <button
                onClick={() => note(current.id)}
                disabled={busy || !draft.trim()}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 disabled:opacity-40"
              >
                {busy ? 'Saving...' : 'Add note'}
              </button>
            </div>

            {versions.length > 1 && (
              <div className="mt-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                  Earlier versions
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {versions.slice(1).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => open(v.id)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40 transition hover:border-white/25 hover:text-white/70"
                    >
                      v{v.version_no}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {asset.approved_at ? (
              <p className="mt-5 text-sm text-[#2ADD1B]">
                Approved by {asset.approved_by} on {formatDate(asset.approved_at)}.
              </p>
            ) : (
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => decide(asset.id, 'approved')}
                  disabled={busy}
                  className="rounded-xl bg-[#2ADD1B] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#85FF78] disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(asset.id, 'changes requested')}
                  disabled={busy}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 disabled:opacity-40"
                >
                  Request changes
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <>
      <PageHeader title="Deliverables" subtitle="Everything we have made for you." />

      {err && (
        <Card className="mb-6 border-[#F0483E]/30 bg-[#F0483E]/[0.06] p-4">
          <p className="text-sm text-[#F0483E]">{err}</p>
        </Card>
      )}

      {labs.length > 2 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {labs.map((l) => (
            <button
              key={l}
              onClick={() => setLabFilter(l)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                labFilter === l
                  ? 'border-[#2ADD1B]/40 bg-[#2ADD1B]/10 text-[#2ADD1B]'
                  : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {shown.map((a) => (
          <Row key={a.id} asset={a} />
        ))}
      </div>
    </>
  );
}
