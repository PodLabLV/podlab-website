'use client';

/**
 * Script review.
 *
 * The client reads the current version, pins notes to any paragraph, then
 * either sends the notes (one revision request) or approves the version. Older
 * versions stay readable and frozen: what was approved has to stay provable.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePortal, formatDate } from '@/lib/portal-data';
import { PageHeader, Card, EmptyState } from '@/components/portal/Shared';
import ScriptStatusBadge from '@/components/portal/ScriptStatusBadge';
import Teleprompter from '@/components/portal/Teleprompter';
import { loadScript, portalCall, type ScriptDetailData } from '@/lib/portal/browser';
import {
  toBlocks,
  formatRuntime,
  unsentClientNotes,
  type PortalScriptComment,
  type PortalScriptVersion,
} from '@/lib/portal/scripts';

const LOCKED = ['approved', 'shot', 'published'];

const inputClass =
  'w-full resize-y border border-p-line bg-p-paper px-3 py-2.5 text-[17px] leading-relaxed text-p-ink placeholder:text-p-ink/50 focus:border-p-brandink focus:outline-none';
const primaryBtn =
  'portal-label inline-flex items-center justify-center gap-3 bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:cursor-not-allowed disabled:opacity-40';
const ghostBtn =
  'portal-label inline-flex items-center justify-center gap-3 border border-p-line px-5 py-3 !text-[13px] text-p-ink/85 transition hover:border-p-brandink hover:text-p-brandink disabled:cursor-not-allowed disabled:opacity-40';

interface NoteProps {
  comment: PortalScriptComment;
  replies: PortalScriptComment[];
  version: PortalScriptVersion;
  showQuote?: boolean;
}

function Note({ comment, replies, version, showQuote }: NoteProps) {
  const isClient = comment.author_kind === 'client';
  const carried = Date.parse(comment.created_at) < Date.parse(version.created_at);
  return (
    <div className="border border-p-line bg-p-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`portal-label !text-[11px] ${isClient ? 'text-p-warn' : 'text-p-brandink'}`}>
          {isClient ? comment.author_name : `${comment.author_name} · PodLab`}
        </span>
        <span className="portal-label !text-[11px] text-p-ink/65">{formatDate(comment.created_at)}</span>
        {comment.status === 'resolved' && <span className="portal-label !text-[11px] text-p-ink/65">Resolved</span>}
        {carried && !comment.orphaned && <span className="portal-label !text-[11px] text-p-ink/65">From an earlier version</span>}
        {comment.orphaned && <span className="portal-label !text-[11px] text-p-warn/80">Line rewritten</span>}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-p-ink/90">{comment.body}</p>
      {(showQuote || comment.orphaned) && comment.quoted_text && (
        <p className="mt-2 border-l border-p-ink/15 pl-3 text-sm italic text-p-ink/70">
          {comment.orphaned ? 'Was on: ' : ''}&ldquo;{comment.quoted_text.slice(0, 160)}
          {comment.quoted_text.length > 160 ? '…' : ''}&rdquo;
        </p>
      )}
      {replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l border-p-brandink/40 pl-3">
          {replies.map((r) => (
            <div key={r.id}>
              <span className="portal-label !text-[11px] text-p-brandink">
                {r.author_kind === 'client' ? r.author_name : `${r.author_name} · PodLab`}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-p-ink/85">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ComposerProps {
  placeholder: string;
  busy: boolean;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  autoFocus?: boolean;
}

/** Owns its own draft so typing never re-renders the whole script. */
function Composer({ placeholder, busy, onSubmit, onCancel, autoFocus }: ComposerProps) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <textarea
        autoFocus={autoFocus}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder={placeholder}
        className={inputClass}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={async () => {
            if (await onSubmit(draft.trim())) setDraft('');
          }}
          disabled={busy || !draft.trim()}
          className={ghostBtn}
        >
          {busy ? 'Saving' : 'Save note'}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="portal-label px-3 !text-[12px] text-p-ink/70 transition hover:text-p-ink">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function ScriptReviewPage() {
  const params = useParams();
  const scriptId = String(params?.id ?? '');
  const { loading: portalLoading, client } = usePortal();

  const [data, setData] = useState<ScriptDetailData | null>(null);
  const [viewNo, setViewNo] = useState<number | null>(null);
  const [openBlock, setOpenBlock] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [prompting, setPrompting] = useState(false);

  const reload = useCallback(async () => {
    setData(await loadScript(scriptId));
  }, [scriptId]);

  useEffect(() => {
    if (client) reload();
  }, [client, reload]);

  const script = data?.script ?? null;
  const versions = data?.versions ?? [];
  const version = useMemo(
    () => (viewNo === null ? versions[0] : versions.find((v) => v.version_no === viewNo) ?? versions[0]) ?? null,
    [versions, viewNo],
  );
  const blocks = useMemo(() => (version ? toBlocks(version.body) : []), [version]);
  const notes = useMemo(
    () => (data?.comments ?? []).filter((c) => c.version_id === version?.id),
    [data, version],
  );

  if (portalLoading || (client && !data)) {
    return <p className="portal-label !text-[12px] text-p-ink/70">Loading script</p>;
  }

  if (!client || !script || !version) {
    return (
      <>
        <PageHeader eyebrow="Scripts & Revisions" title="Script not found" />
        <EmptyState
          title="Nothing here"
          body="This script doesn't exist or isn't on your account."
          cta={{ label: 'All scripts', href: '/portal/scripts' }}
        />
      </>
    );
  }

  const isCurrent = version.version_no === script.current_version;
  const approval = data?.approvals.find((a) => a.version_id === version.id) ?? null;
  const locked = LOCKED.includes((script.status || '').toLowerCase()) || Boolean(approval);
  const canAct = isCurrent && !locked;

  const topLevel = notes.filter((c) => !c.parent_id && c.status !== 'carried');
  const repliesTo = (id: string) => notes.filter((c) => c.parent_id === id);
  const onBlock = (i: number) => topLevel.filter((c) => c.block_index === i && !c.orphaned);
  const general = topLevel.filter((c) => c.block_index === null && !c.orphaned);
  const orphaned = topLevel.filter((c) => c.orphaned && c.status === 'open');
  const unsent = isCurrent ? unsentClientNotes(topLevel, script.changes_requested_at) : [];
  const currentApproval = data?.approvals.find((a) => versions.find((v) => v.id === a.version_id)?.version_no === script.current_version);

  async function run(fn: () => Promise<unknown>, ok?: string): Promise<boolean> {
    setBusy(true);
    setErr(null);
    setFlash(null);
    try {
      await fn();
      await reload();
      if (ok) setFlash(ok);
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  const saveNote = (blockIndex: number | null) => (text: string) =>
    run(async () => {
      await portalCall('/api/portal/scripts/comments', 'POST', {
        versionId: version.id,
        blockIndex,
        quotedText: blockIndex === null ? null : blocks[blockIndex]?.slice(0, 240),
        body: text,
      });
      setOpenBlock(null);
    });

  const sendNotes = () =>
    run(
      () => portalCall('/api/portal/scripts/changes', 'POST', { scriptId: script.id }),
      'Notes sent. We will post the next version here and let you know.',
    );

  const approve = () =>
    run(async () => {
      await portalCall('/api/portal/scripts/approve', 'POST', { versionId: version.id });
      setConfirming(false);
    }, `v${version.version_no} approved and locked.`);

  const meta = [
    `v${version.version_no} of ${script.current_version}`,
    version.runtime_seconds ? `${formatRuntime(version.runtime_seconds)} on camera` : null,
    version.word_count ? `${version.word_count} words` : null,
    script.shoot_date ? `Shoot ${formatDate(script.shoot_date)}` : null,
  ].filter(Boolean);

  return (
    <>
      {prompting && <Teleprompter title={script.title} body={version.body} onClose={() => setPrompting(false)} />}

      <Link href="/portal/scripts" className="portal-label mb-6 inline-flex items-center gap-2 !text-[12px] text-p-ink/70 transition hover:text-p-brandink">
        <span aria-hidden="true">←</span> All scripts
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader eyebrow={[script.kind?.toUpperCase(), script.lab].filter(Boolean).join('  ·  ') || 'Script'} title={script.title} />
        <div className="-mt-6 mb-8 sm:mt-1 sm:mb-0">
          <ScriptStatusBadge status={script.status} showPlain align="start" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-p-line py-3">
        <span className="portal-label !text-[12px] text-p-ink/70">{meta.join('  ·  ')}</span>
        {versions.length > 1 && (
          <div className="flex flex-wrap gap-px border border-p-line bg-p-line sm:ml-auto" role="tablist" aria-label="Versions">
            {[...versions].reverse().map((v) => {
              const active = v.version_no === version.version_no;
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setViewNo(v.version_no);
                    setOpenBlock(null);
                  }}
                  className={`portal-label px-3 py-2 !text-[12px] transition ${
                    active ? 'bg-p-brand text-black' : 'bg-p-paper text-p-ink/75 hover:text-p-ink'
                  }`}
                >
                  v{v.version_no}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {!isCurrent && (
          <p className="border-l-2 border-p-ink/25 pl-5 text-base text-p-ink/80">
            You&apos;re reading v{version.version_no}, an earlier version. It&apos;s frozen.{' '}
            <button onClick={() => setViewNo(null)} className="text-p-brandink underline-offset-4 hover:underline">
              Go to v{script.current_version}
            </button>
          </p>
        )}
        {version.note && (
          <div className="border-l-2 border-p-brandink pl-5">
            <span className="portal-label block !text-[12px] text-p-brandink">What changed in v{version.version_no}</span>
            <p className="mt-2 text-base leading-relaxed text-p-ink/85">{version.note}</p>
          </div>
        )}
        {orphaned.length > 0 && (
          <div className="border-l-2 border-p-warn pl-5">
            <span className="portal-label block !text-[12px] text-p-warn">
              {orphaned.length} note{orphaned.length === 1 ? '' : 's'} lost {orphaned.length === 1 ? 'its' : 'their'} line
            </span>
            <p className="mt-2 text-base leading-relaxed text-p-ink/80">
              The line these pointed at was rewritten. They&apos;re listed at the bottom so nothing quietly disappears.
            </p>
          </div>
        )}
        {err && (
          <p role="alert" className="border-l-2 border-red-500 bg-red-500/5 px-4 py-3 text-base text-red-300">
            {err}
          </p>
        )}
        {flash && (
          <p role="status" className="border-l-2 border-p-brandink bg-p-brand/5 px-4 py-3 text-base text-p-ink/90">
            {flash}
          </p>
        )}
      </div>

      {/* The script. Every paragraph is a note anchor. */}
      <ol className="mt-8 border-t border-p-line">
        {blocks.map((text, i) => {
          const blockNotes = onBlock(i);
          const active = openBlock === i;
          return (
            <li key={`${version.id}-${i}`} className="group border-b border-p-line">
              <div className={`grid grid-cols-[1.75rem_1fr] gap-3 py-5 sm:grid-cols-[2.5rem_1fr_auto] sm:gap-5 ${active ? 'bg-p-brand/[0.04]' : ''}`}>
                <span className={`portal-label pt-1 !text-[12px] ${blockNotes.length ? 'text-p-warn' : 'text-p-ink/65'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="whitespace-pre-wrap text-[18px] leading-[1.7] text-p-ink/90 sm:text-[19px]">{text}</p>
                {canAct && (
                  <button
                    onClick={() => setOpenBlock(active ? null : i)}
                    aria-expanded={active}
                    className={`portal-label col-start-2 justify-self-start !text-[12px] transition sm:col-start-3 sm:pt-1 ${
                      active ? 'text-p-brandink' : 'text-p-ink/70 hover:text-p-brandink sm:text-p-ink/65 sm:group-hover:text-p-ink/80'
                    }`}
                  >
                    {active ? 'Close' : '+ Note'}
                  </button>
                )}
              </div>
              {(blockNotes.length > 0 || active) && (
                <div className="space-y-2 pb-5 pl-[calc(1.75rem+0.75rem)] sm:pl-[calc(2.5rem+1.25rem)]">
                  {blockNotes.map((c) => (
                    <Note key={c.id} comment={c} replies={repliesTo(c.id)} version={version} />
                  ))}
                  {active && (
                    <Composer
                      autoFocus
                      busy={busy}
                      placeholder="What should change here?"
                      onSubmit={saveNote(i)}
                      onCancel={() => setOpenBlock(null)}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-12 grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <span className="portal-label block text-p-brandink">Notes on the whole script</span>
          <div className="mt-4 space-y-2">
            {general.map((c) => (
              <Note key={c.id} comment={c} replies={repliesTo(c.id)} version={version} />
            ))}
            {orphaned.map((c) => (
              <Note key={c.id} comment={c} replies={repliesTo(c.id)} version={version} />
            ))}
            {general.length === 0 && orphaned.length === 0 && !canAct && (
              <p className="text-base text-p-ink/70">No general notes on this version.</p>
            )}
            {canAct && (
              <Composer busy={busy} placeholder="Tone, length, anything that isn't about one line." onSubmit={saveNote(null)} />
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <span className="portal-label block text-p-brandink">Your call</span>
          {approval || (isCurrent && currentApproval) ? (
            <Card className="mt-4 p-5">
              <p className="portal-label !text-[12px] text-p-brandink">Approved</p>
              <p className="mt-2 text-base leading-relaxed text-p-ink/85">
                {(approval ?? currentApproval)!.approved_by_name} approved v{version.version_no} on{' '}
                {formatDate((approval ?? currentApproval)!.approved_at)}. This version is locked; it&apos;s what we shoot.
              </p>
              <button onClick={() => setPrompting(true)} className={`${primaryBtn} mt-5 w-full sm:w-auto`}>
                Open teleprompter
              </button>
            </Card>
          ) : canAct ? (
            <Card className="mt-4 p-5">
              {unsent.length > 0 ? (
                <>
                  <p className="text-base leading-relaxed text-p-ink/85">
                    You have <span className="font-semibold text-p-warn">{unsent.length} unsent note{unsent.length === 1 ? '' : 's'}</span>.
                    Send them and we&apos;ll come back with the next version.
                  </p>
                  <button onClick={sendNotes} disabled={busy} className={`${primaryBtn} mt-4 w-full`}>
                    Send {unsent.length} note{unsent.length === 1 ? '' : 's'} to PodLab
                  </button>
                </>
              ) : (
                <p className="text-base leading-relaxed text-p-ink/80">
                  {(script.status || '').toLowerCase() === 'changes requested'
                    ? "We have your notes and we're rewriting. Add more any time."
                    : 'Something to change? Add a note to any paragraph with + Note, then send them in one go.'}
                </p>
              )}

              <div className="mt-6 border-t border-p-line pt-5">
                {!confirming ? (
                  <>
                    <p className="text-base leading-relaxed text-p-ink/80">
                      Approving locks v{version.version_no} as the script we shoot.
                      {unsent.length > 0 ? ' Your unsent notes will be closed.' : ''}
                    </p>
                    <button onClick={() => setConfirming(true)} disabled={busy} className={`${unsent.length ? ghostBtn : primaryBtn} mt-4 w-full`}>
                      Approve v{version.version_no}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-base leading-relaxed text-p-ink/85">
                      Lock v{version.version_no} as {[client.first_name, client.last_name].filter(Boolean).join(' ') || client.business_name}? We record who approved it and when.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={approve} disabled={busy} className={primaryBtn}>
                        {busy ? 'Recording' : 'Yes, approve'}
                      </button>
                      <button onClick={() => setConfirming(false)} disabled={busy} className={ghostBtn}>
                        Not yet
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ) : (
            <p className="mt-4 text-base leading-relaxed text-p-ink/75">
              {isCurrent ? 'This script is locked.' : `Decisions happen on the current version, v${script.current_version}.`}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
