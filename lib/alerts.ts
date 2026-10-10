/**
 * Failures that someone should hear about, not just a log line. Same
 * arguments as console.error; it still logs, and also posts to Slack
 * (ALERTS_SLACK_WEBHOOK_URL, else the main SLACK_WEBHOOK_URL), at most once
 * per message tag every 10 minutes per server instance, so a stuck loop
 * can't flood the channel. Never throws.
 */
const last = new Map<string, number>();
const QUIET_MS = 10 * 60_000;

function describe(v: unknown): string {
  if (v instanceof Error) return v.message;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function reportError(...args: unknown[]): void {
  console.error(...args);
  const tag = typeof args[0] === 'string' ? args[0] : 'error';
  const now = Date.now();
  if ((last.get(tag) ?? 0) > now - QUIET_MS) return;
  last.set(tag, now);
  const url = process.env.ALERTS_SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const text = `:rotating_light: *Portal error* · ${args.map(describe).join(' ').slice(0, 900)}`;
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }).catch(() => {});
}
