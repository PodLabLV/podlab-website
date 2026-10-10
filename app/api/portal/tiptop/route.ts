import { reportError } from '@/lib/alerts';
import crypto from 'node:crypto';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  type UIMessage,
} from 'ai';
import { admin, resolveCaller } from '@/lib/portal-server';
import { sanitize } from '@/lib/sanitize';
import { buildOverview, renderOverview } from '@/lib/tiptop/overview';
import { snapshotBlock, systemPrompt } from '@/lib/tiptop/prompt';
import { LIMITS } from '@/lib/tiptop/schema';
import { approvalPolicy, bookingUrl, makeTools } from '@/lib/tiptop/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Drafting a script or a game plan with a few reads in between takes longer than a chat reply.
export const maxDuration = 300;

// TipTop in the portal. Signed-in clients only: every request re-resolves the
// caller from the bearer token, and every tool is built around that caller.
// Per-client + per-IP brake, caps on turns, message length, output tokens and
// tool steps, HTML stripped from what the client types, and a scripted reply
// whenever the model can't be reached. This file never logs what anyone said.

// Sonnet 5.5: in side-by-side trials on the guide work (a sales game plan, a
// 30-day content plan) it matched Opus 5.5 at about a third of the cost and
// faster; Haiku 5.5 couldn't finish either job. Opus is the last fallback.
const MODEL = process.env.TIPTOP_MODEL || 'anthropic/claude-sonnet-5.5';
const FALLBACK_MODELS = (process.env.TIPTOP_FALLBACK_MODELS || 'anthropic/claude-sonnet-5,anthropic/claude-opus-5.5')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const FRIENDLY_ERROR = 'TipTop lost the thread for a second. Try that again, or email info@podlablv.com.';

// ── brake ────────────────────────────────────────────────────────────
const WINDOW_MS = 60_000;
const PER_MINUTE = Math.max(1, Number(process.env.TIPTOP_REQUESTS_PER_MINUTE) || LIMITS.requestsPerMinute);
const hits = new Map<string, { n: number; until: number }>();
function overLimit(key: string): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now > h.until) {
    hits.set(key, { n: 1, until: now + WINDOW_MS });
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.until) hits.delete(k);
    return false;
  }
  h.n += 1;
  return h.n > PER_MINUTE;
}

// ── scripted replies (no model involved) ─────────────────────────────
function scripted(text: string, button?: { href: string; label: string }) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: 'start' });
      writer.write({ type: 'text-start', id: 's1' });
      writer.write({ type: 'text-delta', id: 's1', delta: text });
      writer.write({ type: 'text-end', id: 's1' });
      if (button) {
        const toolCallId = `scripted-${Date.now().toString(36)}`;
        writer.write({ type: 'tool-input-available', toolCallId, toolName: 'booking_link', input: { call: 'strategy' } });
        writer.write({ type: 'tool-output-available', toolCallId, output: { kind: 'booking', ...button } });
      }
      writer.write({ type: 'finish' });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

// ── input hygiene ────────────────────────────────────────────────────
const KNOWN_TOOLS = new Set([
  'get_overview', 'go_to', 'booking_link', 'read_document', 'document_history', 'edit_document',
  'restore_document_version', 'update_profile', 'send_revision', 'complete_action_item', 'recommend_product', 'flag_for_team',
  'read_intake', 'read_client_file', 'read_script', 'save_intake_answers', 'update_brand_kit', 'create_action_items', 'draft_script',
  'set_game_plan', 'check_in_game_plan', 'plan_content', 'update_content',
]);

type Cleaned = { messages: UIMessage[]; userTurns: number; lastUserChars: number; priorRecommendations: number };

function cleanMessages(raw: unknown): Cleaned | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > LIMITS.maxMessages) return null;
  const messages: UIMessage[] = [];
  let userTurns = 0;
  let lastUserChars = 0;
  let priorRecommendations = 0;

  for (const m of raw as Array<Record<string, unknown>>) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.parts)) return null;
    const id = typeof m.id === 'string' ? m.id.slice(0, 64) : `m${messages.length}`;
    if (m.role === 'user') {
      const text = (m.parts as Array<Record<string, unknown>>)
        .filter((p) => p?.type === 'text' && typeof p.text === 'string')
        .map((p) => sanitize(p.text as string))
        .join('\n')
        .slice(0, LIMITS.maxMessageChars + 1);
      if (!text) continue;
      userTurns += 1;
      lastUserChars = text.length;
      messages.push({ id, role: 'user', parts: [{ type: 'text', text }] });
    } else if (m.role === 'assistant') {
      // Her own turns: text and her known tool parts only. Approvals in here are
      // HMAC-checked by the SDK before anything executes.
      const parts = (m.parts as Array<Record<string, unknown>>).filter((p) => {
        if (!p || typeof p.type !== 'string') return false;
        if (p.type === 'text') return typeof p.text === 'string' && (p.text as string).length <= 8000;
        if (p.type === 'step-start') return true;
        return p.type.startsWith('tool-') && KNOWN_TOOLS.has(p.type.slice(5));
      });
      for (const p of parts) {
        const out = p.output as Record<string, unknown> | undefined;
        if (p.type === 'tool-recommend_product' && p.state === 'output-available' && out?.shown === true) priorRecommendations += 1;
      }
      if (parts.length) messages.push({ id, role: 'assistant', parts: parts as UIMessage['parts'] });
    }
    // "system" or anything else from the browser is ignored.
  }

  // A request ends with a user turn, or with her turn after the client answered a confirm card.
  const tail = messages[messages.length - 1];
  const answeredCard =
    tail?.role === 'assistant' && tail.parts.some((p) => (p as { state?: string }).state === 'approval-responded');
  if (userTurns === 0 || !tail || (tail.role !== 'user' && !answeredCard)) return null;
  return { messages, userTurns, lastUserChars, priorRecommendations };
}

const hasGateway = () => Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === '1');
const mockMode = () => process.env.TIPTOP_MOCK === '1' && process.env.NODE_ENV !== 'production';

/** Signs confirm-card approvals so a doctored history can't approve a write. */
function approvalSecret(): string {
  const s = process.env.TIPTOP_APPROVAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return crypto.createHash('sha256').update(`podlab-tiptop-approval:${s}`).digest('hex');
}

// ── handler ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return Response.json({ error: 'Sign in again to talk to TipTop.' }, { status: 401 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (overLimit(`c:${caller.clientId}`) || overLimit(`i:${ip}`)) {
    return Response.json({ error: 'Too many messages. Give it a minute.' }, { status: 429 });
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "That didn't come through." }, { status: 400 });
  }
  const cleaned = cleanMessages(body.messages);
  if (!cleaned) return Response.json({ error: "That didn't come through." }, { status: 400 });

  const book = { href: bookingUrl('strategy', caller.displayName, caller.email), label: 'Book a strategy call' };
  if (cleaned.lastUserChars > LIMITS.maxMessageChars) {
    return scripted(`That's a lot at once. Give me the short version, under ${LIMITS.maxMessageChars.toLocaleString('en-US')} characters, or paste long notes straight into the page they belong on.`);
  }
  if (cleaned.userTurns > LIMITS.maxUserTurns) {
    return scripted('This thread is getting long enough to lose things in. Start a new chat (top of this panel) and I will pick up from your portal as it stands.');
  }

  const mock = mockMode();
  if (!mock && !hasGateway()) {
    reportError('[tiptop-portal] no AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN, serving the offline reply');
    return scripted("I'm offline for a moment. Everything is still on the pages to your left; for anything urgent, email info@podlablv.com or grab a call.", book);
  }

  const ctx = { db, caller, priorRecommendations: cleaned.priorRecommendations };
  const tools = makeTools(ctx);
  const overview = renderOverview(await buildOverview(db, caller));
  const instructions = `${systemPrompt()}${snapshotBlock(overview)}`;
  const model = mock ? (await import('@/lib/tiptop/mock')).mockModel() : MODEL;

  try {
    const result = streamText({
      model,
      instructions,
      messages: await convertToModelMessages(cleaned.messages, { tools }),
      tools,
      toolApproval: approvalPolicy(ctx),
      experimental_toolApprovalSecret: approvalSecret(),
      stopWhen: isStepCount(LIMITS.maxSteps),
      maxOutputTokens: LIMITS.maxOutputTokens,
      reasoning: mock ? undefined : 'none',
      timeout: { totalMs: LIMITS.timeoutMs, firstChunkMs: 30_000 },
      providerOptions: mock
        ? undefined
        : {
            gateway: {
              models: FALLBACK_MODELS,
              caching: 'auto',
              tags: ['tiptop', 'portal'],
              user: `portal:${caller.clientId}`,
            },
          },
      onError: ({ error }) => {
        const e = error as { name?: string; statusCode?: number; message?: string };
        reportError('[tiptop-portal] model error', e?.name ?? 'Error', e?.statusCode ?? '', mock ? e?.message : '');
      },
    });

    return result.toUIMessageStreamResponse({ onError: () => FRIENDLY_ERROR });
  } catch (e) {
    reportError('[tiptop-portal] request failed', e instanceof Error ? e.name : 'Error');
    return scripted(FRIENDLY_ERROR, book);
  }
}
