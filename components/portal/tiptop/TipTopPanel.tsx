'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, generateId, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { usePortal } from '@/lib/portal-data';
import { plainText } from '@/lib/tiptop/doc-edit';
import { LIMITS } from '@/lib/tiptop/schema';
import type { TipTopUIMessage } from '@/lib/tiptop/types';
const AVATAR = '/tiptop/avatar.webp';

// The chat. One useChat against /api/portal/tiptop with the client's bearer
// token. The conversation is stored server-side per client
// (/api/portal/tiptop/thread) and mirrored in sessionStorage, which is also
// the fallback before that table exists.

const STORAGE = 'tiptop-portal:v1';
const STARTERS = ["What's waiting on me?", 'Where do things stand?', 'Send a revision note', 'Change something in my Clarity Document'];
const WRITE_TOOLS = new Set([
  'edit_document',
  'restore_document_version',
  'update_profile',
  'send_revision',
  'complete_action_item',
  'save_intake_answers',
  'update_brand_kit',
  'create_action_items',
  'draft_script',
  'set_game_plan',
  'check_in_game_plan',
  'plan_content',
  'update_content',
]);

let sb: SupabaseClient | null = null;
async function bearer(): Promise<Record<string, string>> {
  sb ??= getSupabaseBrowser();
  const { data } = await sb.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

function readLocal(): TipTopUIMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE);
    const j = raw ? JSON.parse(raw) : null;
    return Array.isArray(j?.messages) ? j.messages : [];
  } catch {
    return [];
  }
}
function writeLocal(messages: TipTopUIMessage[]) {
  try {
    sessionStorage.setItem(STORAGE, JSON.stringify({ messages }));
  } catch {}
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface PanelProps {
  onClose: () => void;
  initialPrompt: string | null;
  onPromptUsed: () => void;
}

export default function TipTopPanel(props: PanelProps) {
  // Load the stored thread first, then start the chat with it.
  const [seed, setSeed] = useState<{ messages: TipTopUIMessage[]; remote: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/portal/tiptop/thread', { headers: await bearer(), cache: 'no-store' });
        const j = res.ok ? await res.json() : { ready: false, messages: [] };
        if (!alive) return;
        const remote = Boolean(j.ready);
        const messages = remote && Array.isArray(j.messages) && j.messages.length ? (j.messages as TipTopUIMessage[]) : readLocal();
        setSeed({ messages, remote });
      } catch {
        if (alive) setSeed({ messages: readLocal(), remote: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Shell onClose={props.onClose}>
      {seed ? (
        <Chat {...props} seed={seed} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="portal-label !text-[12px] text-p-ink/70">Opening</p>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="TipTop, your PodLab guide"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[70] flex flex-col bg-p-paper text-p-ink md:inset-auto md:bottom-6 md:right-6 md:h-[min(720px,calc(100dvh-3rem))] md:w-[420px] md:border md:border-p-line md:shadow-[0_0_0_1px_rgba(42,221,27,.12),0_30px_80px_rgba(0,0,0,.8)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {children}
    </div>
  );
}

function Chat({ onClose, initialPrompt, onPromptUsed, seed }: PanelProps & { seed: { messages: TipTopUIMessage[]; remote: boolean } }) {
  const { client, setActionItem } = usePortal();
  const [chatId] = useState(() => generateId());
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<number | null>(null);
  const firstName = client?.first_name ?? null;

  const { messages, sendMessage, status, error, regenerate, setMessages, clearError, addToolApprovalResponse } = useChat<TipTopUIMessage>({
    id: chatId,
    messages: seed.messages,
    transport: new DefaultChatTransport({ api: '/api/portal/tiptop', headers: bearer }),
    // A confirm card answered → carry on so the approved write runs and she reports back.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ message }) => {
      let docChanged = false;
      let changed = false;
      for (const p of message.parts) {
        if (p.type === 'tool-complete_action_item' && p.state === 'output-available' && p.output.saved) {
          setActionItem(p.input.id, p.input.done !== false);
        }
        if ((p.type === 'tool-edit_document' || p.type === 'tool-restore_document_version') && p.state === 'output-available' && p.output.saved) docChanged = true;
        if (p.type.startsWith('tool-') && WRITE_TOOLS.has(p.type.slice(5)) && (p as { state?: string }).state === 'output-available') changed = true;
      }
      if (docChanged) window.dispatchEvent(new Event('portal:document-changed'));
      if (changed) window.dispatchEvent(new Event('portal:refresh'));
    },
  });

  const userTurns = messages.filter((m) => m.role === 'user').length;
  const busy = status === 'submitted' || status === 'streaming';
  const capped = userTurns >= LIMITS.maxUserTurns;

  // Persist after each settled turn: sessionStorage always, the server when it can.
  useEffect(() => {
    if (busy) return;
    writeLocal(messages);
    if (!seed.remote) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await fetch('/api/portal/tiptop/thread', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(await bearer()) },
          body: JSON.stringify({ messages: messages.slice(-LIMITS.maxMessages) }),
        });
      } catch {}
    }, 600);
  }, [messages, busy, seed.remote]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy || capped) return;
      void sendMessage({ text: t.slice(0, LIMITS.maxMessageChars) });
      setInput('');
      if (inputRef.current) inputRef.current.style.height = '';
    },
    [busy, capped, sendMessage],
  );

  // A page asked TipTop something on the client's behalf.
  useEffect(() => {
    if (initialPrompt && status === 'ready') {
      send(initialPrompt);
      onPromptUsed();
    }
  }, [initialPrompt, status, send, onPromptUsed]);

  const approve = useCallback(
    (id: string, approved: boolean) => {
      void addToolApprovalResponse({ id, approved, reason: approved ? 'Client confirmed on the card' : 'Client cancelled on the card' });
    },
    [addToolApprovalResponse],
  );

  const reset = async () => {
    setMessages([]);
    clearError();
    try {
      sessionStorage.removeItem(STORAGE);
    } catch {}
    if (seed.remote) {
      try {
        await fetch('/api/portal/tiptop/thread', { method: 'DELETE', headers: await bearer() });
      } catch {}
    }
    setInput('');
    inputRef.current?.focus();
  };

  const lastAssistant = messages[messages.length - 1]?.role === 'assistant' ? messages[messages.length - 1] : null;
  const waiting = status === 'submitted' || (status === 'streaming' && !lastAssistant?.parts.some((p) => p.type === 'text' && p.text));

  return (
    <>
      <header className="flex items-center gap-3 border-b border-p-line px-4 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <Image src={AVATAR} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-cover" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="portal-label !text-[13px] text-p-brandink">TipTop</p>
          <p className="mt-1 break-words text-sm text-p-ink/75">
            Your guide <span className="portal-drama text-p-ink/85">· AI, and says so</span>
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={reset} className="portal-label px-2 py-2 !text-[12px] text-p-ink/70 transition hover:text-p-ink">
            New chat
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close TipTop" className="flex h-9 w-9 items-center justify-center border border-transparent text-p-ink/85 transition hover:border-p-line hover:text-p-brandink">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5" aria-live="polite" aria-relevant="additions text">
        <div className="flex flex-col gap-4">
          <Assistant>
            <p>
              {firstName ? `${firstName}, ` : ''}I&apos;m TipTop, PodLab&apos;s chief of staff. I know where everything in your portal lives, I&apos;ll tell you what&apos;s waiting on you,
              and I can send notes, update your documents and profile, and book calls.
            </p>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="border border-p-line px-3 py-2 text-left text-base text-p-ink/90 transition hover:border-p-brandink hover:text-p-brandink">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Assistant>

          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="ml-auto max-w-[85%] whitespace-pre-wrap border border-p-line bg-p-ink/[0.06] px-4 py-2.5 text-[17px] leading-relaxed">
                {m.parts.map((p, i) => (p.type === 'text' ? <span key={i}>{p.text}</span> : null))}
              </div>
            ) : (
              <Assistant key={m.id}>
                {m.parts.map((p, i) => (
                  <Part key={i} part={p} approve={approve} busy={busy} onNavigate={onClose} />
                ))}
              </Assistant>
            ),
          )}

          {waiting && !error && (
            <Assistant>
              <span className="inline-flex items-center gap-1.5 py-1" aria-label="TipTop is typing">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="block h-1.5 w-1.5 animate-pulse bg-p-brand" style={{ animationDelay: `${i * 160}ms` }} />
                ))}
              </span>
            </Assistant>
          )}

          {error && (
            <div role="alert" className="border border-p-brandink/40 bg-p-brand/5 px-4 py-3 text-base">
              <p>TipTop lost the thread for a second. Try again, or email info@podlablv.com if it&apos;s urgent.</p>
              <button type="button" onClick={() => regenerate()} className="portal-label mt-3 bg-p-brand px-4 py-3 !text-[13px] text-black transition hover:bg-p-pop">
                Try again
              </button>
            </div>
          )}

          {capped && !error && (
            <div className="border border-p-line px-4 py-3 text-base text-p-ink/85">
              This thread is long enough to lose things in. Start a new chat and I&apos;ll pick up from your portal as it stands.
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-p-line px-3 py-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, LIMITS.maxMessageChars))}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = '';
              t.style.height = `${Math.min(t.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={LIMITS.maxMessageChars}
            disabled={capped}
            placeholder={capped ? 'Start a new chat' : 'Ask TipTop anything'}
            aria-label="Message TipTop"
            className="max-h-[140px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[17px] leading-snug text-p-ink placeholder:text-p-ink/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || capped || !input.trim()}
            className="portal-label h-11 shrink-0 bg-p-brand px-4 !text-[13px] text-black transition hover:bg-p-pop disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between px-2 text-[14px] text-p-ink/65">
          <span>Enter to send · Shift+Enter for a new line</span>
          {input.length > LIMITS.maxMessageChars - 300 && <span>{LIMITS.maxMessageChars - input.length} left</span>}
        </div>
      </form>
    </>
  );
}

function Assistant({ children }: { children: ReactNode }) {
  return <div className="max-w-[94%] space-y-3 border-l border-p-brandink/50 pl-4 text-[17px] leading-relaxed text-p-ink">{children}</div>;
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="portal-label !text-[12px] text-p-ink/65">{children}</p>;
}

type AnyPart = TipTopUIMessage['parts'][number];

function Part({ part, approve, busy, onNavigate }: { part: AnyPart; approve: (id: string, ok: boolean) => void; busy: boolean; onNavigate: () => void }) {
  if (part.type === 'text') return part.text ? <p className="whitespace-pre-wrap">{part.text}</p> : null;
  if (!part.type.startsWith('tool-')) return null;

  // ── buttons ──
  if (part.type === 'tool-go_to' || part.type === 'tool-booking_link') {
    return part.state === 'output-available' ? <ActionButton href={part.output.href} label={part.output.label} onNavigate={onNavigate} /> : null;
  }
  if (part.type === 'tool-recommend_product') {
    if (part.state !== 'output-available' || !part.output.shown || !part.output.href || !part.output.label) return null;
    const o = { ...part.output, href: part.output.href, label: part.output.label };
    return (
      <div className="border border-p-line bg-p-card p-4">
        <p className="portal-label !text-[12px] text-p-brandink">Recommended</p>
        <p className="mt-2 text-base font-semibold">
          {o.product}
          {o.price ? <span className="ml-2 font-normal text-p-ink/75">{o.price}</span> : null}
        </p>
        <p className="mt-1 text-base text-p-ink/80">{o.why}</p>
        <div className="mt-3">
          <ActionButton href={o.href} label={o.label} onNavigate={onNavigate} />
        </div>
      </div>
    );
  }

  // ── quiet read tools ──
  if (part.type === 'tool-get_overview') return part.state === 'output-available' ? <Quiet>Checked your portal</Quiet> : null;
  if (part.type === 'tool-read_document') return part.state === 'output-available' ? <Quiet>Read your Clarity Document</Quiet> : null;
  if (part.type === 'tool-document_history') return part.state === 'output-available' ? <Quiet>Checked the version history</Quiet> : null;
  if (part.type === 'tool-read_intake') return part.state === 'output-available' ? <Quiet>Read your intake</Quiet> : null;
  if (part.type === 'tool-read_client_file') return part.state === 'output-available' ? <Quiet>Read your file</Quiet> : null;
  if (part.type === 'tool-read_script') return part.state === 'output-available' ? <Quiet>Read the script</Quiet> : null;
  if (part.type === 'tool-flag_for_team') {
    return part.state === 'output-available' && part.output.flagged ? <Quiet>Flagged for the PodLab team</Quiet> : null;
  }

  // ── writes: confirm card, then the result ──
  const p = part as AnyPart & {
    state: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    approval?: { id: string; isAutomatic?: boolean; approved?: boolean; requestReason?: string };
    errorText?: string;
  };
  const tool = p.type.slice(5);
  if (!WRITE_TOOLS.has(tool)) return null;

  if (p.state === 'approval-requested') {
    if (p.approval?.isAutomatic) return null;
    return <ConfirmCard tool={tool} input={p.input ?? {}} reason={p.approval?.requestReason} disabled={busy} onAnswer={(ok) => p.approval && approve(p.approval.id, ok)} />;
  }
  if (p.state === 'approval-responded') return <Quiet>{p.approval?.approved ? 'Confirmed. Working on it' : 'Cancelled'}</Quiet>;
  if (p.state === 'output-denied') return p.approval?.isAutomatic ? null : <Quiet>Cancelled. Nothing changed</Quiet>;
  if (p.state === 'output-error') return <Quiet>That did not go through. Nothing changed</Quiet>;
  if (p.state !== 'output-available' || !p.output) return null;

  const o = p.output;
  const failed = o.saved === false || o.sent === false;
  if (failed) return <Quiet>Not saved: {String(o.message ?? 'something was off')}</Quiet>;
  switch (tool) {
    case 'edit_document':
    case 'restore_document_version':
      return (
        <div className="space-y-2">
          <Quiet>Saved as version {String(o.version)} · restorable any time</Quiet>
          <ActionButton href="/portal/document" label="Open the Clarity Document" onNavigate={onNavigate} />
        </div>
      );
    case 'send_revision':
      return <Quiet>Sent to the team{o.title ? ` · ${String(o.title)}` : ''}</Quiet>;
    case 'update_profile':
      return <Quiet>{o.unchanged ? 'Profile already says that' : 'Profile updated'}</Quiet>;
    case 'complete_action_item':
      return <Quiet>{o.done ? 'Marked done' : 'Reopened'}</Quiet>;
    case 'save_intake_answers':
      return (
        <div className="space-y-2">
          <Quiet>
            {o.submitted ? 'Intake saved and submitted to PodLab' : `Saved ${String(o.answersSaved)} answer${o.answersSaved === 1 ? '' : 's'}${Number(o.requiredLeft) > 0 ? ` · ${String(o.requiredLeft)} required left` : ' · ready to submit'}`}
          </Quiet>
          <ActionButton href="/portal/intake" label="Open your intake" onNavigate={onNavigate} />
        </div>
      );
    case 'update_brand_kit':
      return <Quiet>Brand kit updated · {String(o.colors)} colors, {String(o.fonts)} fonts</Quiet>;
    case 'create_action_items':
      return (
        <div className="space-y-2">
          <Quiet>Added {String(o.created)} to your game plan</Quiet>
          <ActionButton href="/portal/actions" label="See your action items" onNavigate={onNavigate} />
        </div>
      );
    case 'draft_script':
      return <Quiet>Saved as a draft · PodLab reviews it, then it comes back to you to approve</Quiet>;
    case 'plan_content':
    case 'update_content':
      return (
        <div className="space-y-2">
          <Quiet>{tool === 'plan_content' ? `Planned ${String(o.created)} piece${o.created === 1 ? '' : 's'}` : `Updated ${String(o.updated)} piece${o.updated === 1 ? '' : 's'}`}</Quiet>
          <ActionButton href="/portal/content" label="Open your content plan" onNavigate={onNavigate} />
        </div>
      );
    case 'set_game_plan':
    case 'check_in_game_plan': {
      const plan = o.plan as { pillar?: string; status?: string } | undefined;
      return (
        <div className="space-y-2">
          <Quiet>
            {tool === 'set_game_plan' ? `${plan?.pillar ?? 'Game'} plan set` : `${plan?.pillar ?? ''} check-in logged · ${plan?.status ?? ''}`}
          </Quiet>
          <ActionButton href="/portal/plan" label="Open your Game Plan" onNavigate={onNavigate} />
        </div>
      );
    }
    default:
      return null;
  }
}

function ActionButton({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  const cls = 'portal-label inline-flex items-center gap-3 bg-p-brand px-5 py-3 !text-[13px] text-black transition hover:bg-p-pop';
  if (href.startsWith('/')) {
    return (
      <Link
        href={href}
        className={cls}
        onClick={() => {
          // On a phone the panel covers the page; get out of the way.
          if (window.matchMedia('(max-width: 767px)').matches) onNavigate();
        }}
      >
        {label} <span aria-hidden>→</span>
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {label} <span aria-hidden>→</span>
    </a>
  );
}

const PROFILE_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  business_name: 'Business name',
  website: 'Website',
  timezone: 'Timezone',
};

function ConfirmCard({
  tool,
  input,
  reason,
  disabled,
  onAnswer,
}: {
  tool: string;
  input: Record<string, unknown>;
  reason?: string;
  disabled: boolean;
  onAnswer: (ok: boolean) => void;
}) {
  const [answered, setAnswered] = useState(false);
  const answer = (ok: boolean) => {
    if (answered) return;
    setAnswered(true);
    onAnswer(ok);
  };

  let detail: ReactNode = null;
  if (tool === 'edit_document' && Array.isArray(input.edits)) {
    detail = (
      <ol className="space-y-2">
        {(input.edits as Array<{ find?: string; replace?: string }>).map((e, i) => (
          <li key={i} className="border-l border-p-line pl-3 text-sm leading-relaxed">
            <span className="block text-p-ink/70 line-through decoration-p-ink/30">{plainText(String(e.find ?? ''), 240) || '(markup)'}</span>
            <span className="mt-1 block text-p-ink">{plainText(String(e.replace ?? ''), 240) || '(removed)'}</span>
          </li>
        ))}
      </ol>
    );
  } else if (tool === 'send_revision') {
    detail = (
      <div className="space-y-1 text-base">
        {input.timestamp ? <p className="portal-label !text-[12px] text-p-ink/70">At {String(input.timestamp)}</p> : null}
        {input.quote ? <p className="text-sm italic text-p-ink/75">On: &ldquo;{String(input.quote)}&rdquo;</p> : null}
        <p className="whitespace-pre-wrap text-p-ink">&ldquo;{String(input.note ?? '')}&rdquo;</p>
      </div>
    );
  } else if (tool === 'update_profile') {
    detail = (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
        {Object.entries(input)
          .filter(([k, v]) => k in PROFILE_LABELS && v !== undefined)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-p-ink/70">{PROFILE_LABELS[k]}</dt>
              <dd className="break-words">{String(v) || '(cleared)'}</dd>
            </div>
          ))}
      </dl>
    );
  }

  if (tool === 'save_intake_answers' && Array.isArray(input.answers)) {
    detail = (
      <ol className="space-y-2">
        {(input.answers as Array<{ value?: string }>).map((a, i) => (
          <li key={i} className="whitespace-pre-wrap border-l border-p-line pl-3 text-sm leading-relaxed text-p-ink">
            {String(a.value ?? '').slice(0, 400)}
            {String(a.value ?? '').length > 400 ? '…' : ''}
          </li>
        ))}
      </ol>
    );
  } else if (tool === 'update_brand_kit') {
    const colors = (input.colors as Array<{ hex?: string; name?: string }> | undefined) ?? [];
    const fonts = (input.fonts as Array<{ name?: string; use?: string }> | undefined) ?? [];
    detail = (
      <div className="space-y-2 text-sm">
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {colors.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span className="h-4 w-4 border border-p-ink/20" style={{ background: /^#?[0-9a-f]{3,6}$/i.test(c.hex ?? '') ? `#${String(c.hex).replace('#', '')}` : 'transparent' }} />
                {c.hex}
                {c.name ? <span className="text-p-ink/70">{c.name}</span> : null}
              </span>
            ))}
          </div>
        )}
        {fonts.length > 0 && <p>{fonts.map((f) => `${f.name}${f.use ? ` (${f.use})` : ''}`).join(' · ')}</p>}
        {input.notes ? <p className="whitespace-pre-wrap text-p-ink/85">{String(input.notes).slice(0, 400)}</p> : null}
      </div>
    );
  } else if (tool === 'create_action_items' && Array.isArray(input.items)) {
    detail = (
      <>
      {input.coaching ? <p className="mb-3 whitespace-pre-wrap text-base leading-relaxed text-p-ink">{String(input.coaching)}</p> : null}
      <ol className="space-y-2">
        {(input.items as Array<{ title?: string; effort?: string; due?: string }>).map((it, i) => (
          <li key={i} className="border-l border-p-line pl-3 text-sm leading-relaxed">
            <span className="block text-p-ink">{String(it.title ?? '')}</span>
            <span className="block text-p-ink/70">{[it.effort, it.due ? `due ${it.due}` : null].filter(Boolean).join(' · ')}</span>
          </li>
        ))}
      </ol>
      </>
    );
  } else if (tool === 'set_game_plan') {
    const pr = (input.priorities as string[] | undefined) ?? [];
    detail = (
      <div className="space-y-3 text-base">
        {input.coaching ? <p className="whitespace-pre-wrap leading-relaxed text-p-ink">{String(input.coaching)}</p> : null}
        <div className="border-l border-p-line pl-3 text-sm">
          <p className="font-semibold text-p-ink">{String(input.outcome ?? '')}</p>
          <p className="mt-1 text-p-ink/75">
            {[
              input.baseline !== undefined ? `from ${String(input.baseline)}` : null,
              input.target !== undefined ? `to ${String(input.target)}` : null,
              input.metric ? String(input.metric) : null,
              input.due_on ? `by ${String(input.due_on)}` : null,
            ]
              .filter(Boolean)
              .join(' ')}
          </p>
          {pr.length > 0 && (
            <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-p-ink/90">
              {pr.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  } else if (tool === 'plan_content' && Array.isArray(input.items)) {
    detail = (
      <>
        {input.coaching ? <p className="mb-3 whitespace-pre-wrap text-base leading-relaxed text-p-ink">{String(input.coaching)}</p> : null}
        <ol className="max-h-64 space-y-2 overflow-y-auto">
          {(input.items as Array<{ publish_on?: string; format?: string; job?: string; title?: string; hook?: string }>).map((it, i) => (
            <li key={i} className="border-l border-p-line pl-3 text-sm leading-relaxed">
              <span className="block text-p-ink/70">
                {it.publish_on} · {it.format} · {it.job}
                {(it as { card_id?: string }).card_id ? ' · already shot' : ''}
              </span>
              <span className="block text-p-ink">{it.title}</span>
              {it.hook ? <span className="block italic text-p-ink/75">&ldquo;{it.hook}&rdquo;</span> : null}
            </li>
          ))}
        </ol>
      </>
    );
  } else if (tool === 'check_in_game_plan') {
    detail = <p className="whitespace-pre-wrap border-l border-p-line pl-3 text-sm leading-relaxed text-p-ink">{String(input.note ?? '')}</p>;
  } else if (tool === 'draft_script') {
    detail = (
      <div className="max-h-56 overflow-y-auto border-l border-p-line pl-3">
        <p className="portal-label !text-[11px] text-p-ink/70">{String(input.kind ?? '')}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-p-ink">{String(input.body ?? '').slice(0, 2000)}</p>
      </div>
    );
  }

  return (
    <div className="border border-p-brandink/40 bg-p-brand/[0.04] p-4">
      <p className="portal-label !text-[12px] text-p-brandink">Confirm</p>
      {reason && <p className="mt-2 text-base leading-relaxed">{reason}</p>}
      {detail && <div className="mt-3">{detail}</div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || answered}
          onClick={() => answer(true)}
          className="portal-label bg-p-brand px-4 py-3 !text-[13px] text-black transition hover:bg-p-pop disabled:opacity-40"
        >
          {tool === 'send_revision' ? 'Send it' : 'Confirm'}
        </button>
        <button
          type="button"
          disabled={disabled || answered}
          onClick={() => answer(false)}
          className="portal-label border border-p-line px-4 py-3 !text-[13px] text-p-ink/85 transition hover:border-p-ink/40 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
