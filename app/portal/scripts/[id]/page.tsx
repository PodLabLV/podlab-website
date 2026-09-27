'use client';

/**
 * Script review.
 *
 * The client reads the script, leaves a note pinned to any block, and validates
 * it when it is right. Notes and the approval both go through service-role
 * routes — the client has no write policy on these tables.
 *
 * Comments arrive live over the broadcast channel, so a producer replying shows
 * up here without a refresh, and vice versa.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePortal } from '@/lib/portal-data';
import type { PortalScriptComment } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import ScriptStatusBadge from '@/components/portal/ScriptStatusBadge';
import Teleprompter from '@/components/portal/Teleprompter';
import { toBlocks, formatRuntime } from '@/lib/portal/scripts';

export default function ScriptReviewPage() {
  const params = useParams();
  const scriptId = String(params?.id ?? '');
  const { loading, scripts, scriptVersions, scriptComments, scriptApprovals, accessToken } =
    usePortal();

  const [viewVersionNo, setViewVersionNo] = useState<number | null>(null);
  const [openBlock, setOpenBlock] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prompting, setPrompting] = useState(false);

  const script = scripts.find((s) => s.id === scriptId);

  const versions = useMemo(
    () =>
      scriptVersions
        .filter((v) => v.script_id === scriptId)
        .sort((a, b) => b.version_no - a.version_no),
    [scriptVersions, scriptId],
  );

  const version = useMemo(() => {
    if (versions.length === 0) return null;
    if (viewVersionNo === null) return versions[0];
    return versions.find((v) => v.version_no === viewVersionNo) ?? versions[0];
  }, [versions, viewVersionNo]);

  const blocks = useMemo(() => (version ? toBlocks(version.body) : []), [version]);

  // Always sort locally: a comment arriving over the bus is patched into the
  // shared list without a re-fetch, so render order cannot depend on the order
  // the initial query happened to use.
  const comments = useMemo(
    () =>
      scriptComments
        .filter((c) => c.version_id === version?.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [scriptComments, version],
  );

  const approval = scriptApprovals.find((a) => a.version_id === version?.id);
  const isCurrent = version?.version_no === script?.current_version;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/40">
        <span className="portal-stir inline-block h-4 w-4 rounded-full border border-white/10 border-t-[#2ADD1B]" />
        Loading...
      </div>
    );
  }

  if (!script || !version) {
    return (
      <>
        <PageHeader title="Script" />
        <EmptyState
          title="Script not found"
          body="This script either does not exist or is not on your account."
          cta={{ label: 'Back to scripts', href: '/portal/scripts' }}
        />
      </>
    );
  }

  async function post(path: string, payload: unknown) {
    const res = await fetch(path, {
      method: 'POST',
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

  async function submitNote(blockIndex: number | null) {
    if (!draft.trim() || !version) return;
    setBusy(true);
    setErr(null);
    try {
      await post('/api/portal/scripts/comments', {
        versionId: version.id,
        blockIndex,
        quotedText: blockIndex === null ? null : blocks[blockIndex]?.slice(0, 240),
        body: draft.trim(),
      });
      setDraft('');
      setOpenBlock(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!version) return;
    setBusy(true);
    setErr(null);
    try {
      await post('/api/portal/scripts/approve', { versionId: version.id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not record that.');
    } finally {
      setBusy(false);
    }
  }

  const blockComments = (i: number) => comments.filter((c) => c.block_index === i);
  const generalComments = comments.filter((c) => c.block_index === null);
  const orphaned = comments.filter((c) => c.orphaned && c.status === 'open');

  return (
    <>
      {prompting && (
        <Teleprompter title={script.title} body={version.body} onClose={() => setPrompting(false)} />
      )}

      <Link
        href="/portal/scripts"
        className="mb-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60"
      >
        ← All scripts
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-lg uppercase tracking-wider text-white sm:text-xl">
            {script.title}
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/30">
            {[
              script.kind,
              script.lab,
              `v${version.version_no} of ${script.current_version}`,
              formatRuntime(version.runtime_seconds),
              version.word_count ? `${version.word_count} words` : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </p>
        </div>
        <ScriptStatusBadge status={script.status} />
      </div>

      {/* Version history. Older versions are readable but frozen — what you
          approved has to stay provable. */}
      {versions.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => setViewVersionNo(v.version_no)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                v.version_no === version.version_no
                  ? 'border-[#2ADD1B]/40 bg-[#2ADD1B]/10 text-[#2ADD1B]'
                  : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
              }`}
            >
              v{v.version_no}
            </button>
          ))}
        </div>
      )}

      {version.note && (
        <Card className="mb-6 border-[#22D3EE]/20 bg-[#22D3EE]/[0.05] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#22D3EE]">
            What changed in v{version.version_no}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{version.note}</p>
        </Card>
      )}

      {orphaned.length > 0 && (
        <Card className="mb-6 border-[#FFB020]/30 bg-[#FFB020]/[0.06] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#FFB020]">
            {orphaned.length} note{orphaned.length === 1 ? '' : 's'} lost their line
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            These were open when the script was rewritten and the text they pointed at is gone.
            They are listed at the bottom so nothing quietly disappears.
          </p>
        </Card>
      )}

      {!isCurrent && (
        <Card className="mb-6 border-white/10 p-4">
          <p className="text-sm text-white/60">
            You are reading v{version.version_no}. The current version is v{script.current_version}.
          </p>
        </Card>
      )}

      {err && (
        <Card className="mb-6 border-[#F0483E]/30 bg-[#F0483E]/[0.06] p-4">
          <p className="text-sm text-[#F0483E]">{err}</p>
        </Card>
      )}

      {/* The script itself. Every block is a comment anchor. */}
      <div className="space-y-1">
        {blocks.map((text, i) => {
          const notes = blockComments(i);
          const active = openBlock === i;
          return (
            <div key={i} className="group relative">
              <div
                className={`rounded-xl border px-5 py-4 transition ${
                  active
                    ? 'border-[#FFB020]/40 bg-[#FFB020]/[0.04]'
                    : notes.length > 0
                      ? 'border-white/10 bg-white/[0.02]'
                      : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]'
                }`}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/85">
                  {text}
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setOpenBlock(active ? null : i);
                      setDraft('');
                    }}
                    className={`font-mono text-[10px] uppercase tracking-wider transition ${
                      active ? 'text-[#FFB020]' : 'text-white/20 group-hover:text-white/50'
                    }`}
                  >
                    {active ? 'Cancel' : 'Add note'}
                  </button>
                  {notes.length > 0 && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                      {notes.length} note{notes.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>

              {notes.length > 0 && (
                <div className="mb-2 ml-5 mt-1 space-y-2 border-l border-white/10 pl-4">
                  {notes.map((c) => (
                    <Note key={c.id} comment={c} />
                  ))}
                </div>
              )}

              {active && (
                <div className="ml-5 mt-2 border-l border-[#FFB020]/30 pl-4">
                  <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    placeholder="What should change about this line?"
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-white/25 focus:border-[#FFB020]/40 focus:outline-none"
                  />
                  <button
                    onClick={() => submitNote(i)}
                    disabled={busy || !draft.trim()}
                    className="mt-2 rounded-xl bg-[#FFB020] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#FFB020]/90 disabled:opacity-40"
                  >
                    {busy ? 'Saving...' : 'Leave note'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* General notes and the approval live below the script. */}
      <div className="mt-10 space-y-6">
        {generalComments.length > 0 && (
          <div>
            <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">
              Notes on the whole script
            </h2>
            <div className="space-y-2">
              {generalComments.map((c) => (
                <Note key={c.id} comment={c} />
              ))}
            </div>
          </div>
        )}

        {openBlock === null && (
          <Card className="p-5">
            <h2 className="font-display text-sm uppercase tracking-wider text-white">
              Note on the whole script
            </h2>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Anything that is not about one specific line."
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-white/25 focus:border-white/25 focus:outline-none"
            />
            <button
              onClick={() => submitNote(null)}
              disabled={busy || !draft.trim()}
              className="mt-3 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 disabled:opacity-40"
            >
              {busy ? 'Saving...' : 'Leave note'}
            </button>
          </Card>
        )}

        {approval ? (
          <Card className="border-[#2ADD1B]/25 bg-[#2ADD1B]/[0.05] p-5">
            <p className="font-display text-[10px] uppercase tracking-widest text-[#2ADD1B]">
              Validated
            </p>
            <p className="mt-2 text-sm text-white/70">
              Approved by {approval.approved_by_name} on{' '}
              {new Date(approval.approved_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              . This version is locked.
            </p>
            <button
              onClick={() => setPrompting(true)}
              className="mt-4 rounded-xl bg-[#2ADD1B] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#85FF78]"
            >
              Open teleprompter
            </button>
          </Card>
        ) : (
          isCurrent && (
            <Card className="p-5">
              <h2 className="font-display text-sm uppercase tracking-wider text-white">
                Ready to shoot?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Validating locks this version and puts it in the shoot queue. Any open notes get
                marked resolved. If something still needs to change, leave a note instead.
              </p>
              <button
                onClick={approve}
                disabled={busy}
                className="mt-4 rounded-xl bg-[#2ADD1B] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#85FF78] disabled:opacity-40"
              >
                {busy ? 'Recording...' : `Validate v${version.version_no}`}
              </button>
            </Card>
          )
        )}
      </div>
    </>
  );
}

function Note({ comment }: { comment: PortalScriptComment }) {
  const isClient = comment.author_kind === 'client';
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${
            isClient
              ? 'border-[#FFB020]/20 bg-[#FFB020]/10 text-[#FFB020]'
              : 'border-[#2ADD1B]/20 bg-[#2ADD1B]/10 text-[#2ADD1B]'
          }`}
        >
          {comment.author_name}
        </span>
        {comment.status === 'resolved' && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/25">
            Resolved
          </span>
        )}
        {comment.orphaned && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#FFB020]/70">
            Line changed
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{comment.body}</p>
      {comment.orphaned && comment.quoted_text && (
        <p className="mt-2 border-l-2 border-white/10 pl-3 text-xs italic text-white/30">
          was on: “{comment.quoted_text.slice(0, 120)}”
        </p>
      )}
    </div>
  );
}
