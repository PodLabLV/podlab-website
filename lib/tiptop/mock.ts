// TIPTOP_MOCK=1: a scripted stand-in for the model, so the whole path (panel,
// streaming, approvals, tools, Slack/CRM writes) can be exercised with no AI
// Gateway key. Dev and QA only; the route refuses it in production.
//
// Script:
//   "/tool <name> <json>"  → calls that tool with that input
//   after a tool result    → one line echoing the result
//   "fail-now"             → throws (exercises the error path)
//   anything else          → a greeting that names the top open loop

import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

type MockOptions = NonNullable<ConstructorParameters<typeof MockLanguageModelV4>[0]>;
type DoStream = Extract<NonNullable<MockOptions['doStream']>, (...args: never[]) => unknown>;
type Prompt = Parameters<DoStream>[0]['prompt'];
type StreamPart = Awaited<ReturnType<DoStream>>['stream'] extends ReadableStream<infer P> ? P : never;

const usage = {
  inputTokens: { total: 1500, noCache: 300, cacheRead: 1200, cacheWrite: undefined },
  outputTokens: { total: 40, text: 40, reasoning: undefined },
};

const textOf = (content: unknown): string =>
  typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((p) => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : '')).join('')
      : '';

type Turn = { text?: string; toolCall?: { name: string; input: Record<string, unknown> } };

function script(prompt: Prompt): Turn {
  const last = prompt[prompt.length - 1];
  if (last?.role === 'tool') {
    const parts = last.content as unknown as Array<Record<string, unknown>>;
    const r = parts.find((p) => p.type === 'tool-result') as { toolName?: string; output?: { type: string; value?: unknown; reason?: string } } | undefined;
    if (r) {
      const out = r.output;
      if (out?.type === 'execution-denied') return { text: `Mock: ${r.toolName} was not run. ${out.reason ?? ''}`.trim() };
      const v = out && 'value' in out ? out.value : out;
      return { text: `Mock: ${r.toolName} → ${JSON.stringify(v).slice(0, 600)}` };
    }
    return { text: 'Mock: noted.' };
  }

  const users = prompt.filter((m) => m.role === 'user').map((m) => textOf(m.content));
  const lastUser = (users.at(-1) ?? '').trim();
  if (lastUser.includes('fail-now')) throw new Error('mock: simulated model failure');

  const cmd = /^\/tool\s+([a-z_]+)\s*([\s\S]*)$/i.exec(lastUser);
  if (cmd) {
    let input: Record<string, unknown> = {};
    try {
      input = cmd[2].trim() ? JSON.parse(cmd[2]) : {};
    } catch {
      return { text: 'Mock: that JSON did not parse.' };
    }
    return { toolCall: { name: cmd[1], input } };
  }

  const system = prompt.filter((m) => m.role === 'system').map((m) => textOf(m.content)).join('\n');
  const loop = /Open loops[^\n]*\n\s*- ([^\n]+)/.exec(system)?.[1];
  const name = /Client: ([A-Za-z]+)/.exec(system)?.[1];
  return {
    text: `Mock TipTop here${name ? `, ${name}` : ''}. ${loop ? `Top open loop: ${loop}.` : 'Nothing is waiting on you.'} Type /tool <name> <json> to drive a tool.`,
  };
}

function chunks(turn: Turn): StreamPart[] {
  const parts: StreamPart[] = [{ type: 'stream-start', warnings: [] }];
  if (turn.text) {
    parts.push({ type: 'text-start', id: 't1' });
    for (const w of turn.text.split(/(?<=\s)/)) parts.push({ type: 'text-delta', id: 't1', delta: w });
    parts.push({ type: 'text-end', id: 't1' });
  }
  if (turn.toolCall) {
    parts.push({
      type: 'tool-call',
      toolCallId: `mock-${turn.toolCall.name}-${Date.now().toString(36)}`,
      toolName: turn.toolCall.name,
      input: JSON.stringify(turn.toolCall.input),
    });
  }
  parts.push({ type: 'finish', finishReason: { unified: turn.toolCall ? 'tool-calls' : 'stop', raw: undefined }, usage });
  return parts;
}

export function mockModel() {
  return new MockLanguageModelV4({
    provider: 'mock',
    modelId: 'tiptop-portal-mock',
    doStream: async ({ prompt }) => ({ stream: simulateReadableStream({ chunks: chunks(script(prompt)), chunkDelayInMs: 10 }) }),
  });
}
