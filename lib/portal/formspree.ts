import type { OnboardingQuestion } from '@/lib/portal/onboarding-questions';
import { reportError } from '@/lib/alerts';

/**
 * A copy of each finished onboarding to Formspree (Hiram, 2026-10-19: "connected
 * to supabase and formspree"). Supabase stays the record; this is the inbox
 * copy, so it never blocks or fails the submit.
 *
 * Formspree's spam filter (Formshield) silently quarantines any submission that
 * contains a link, while still answering ok — so links are sent without their
 * scheme ("yourcompany.com/page") and uploads as a count. The real links stay
 * in Supabase and the client's Drive.
 */
const ENDPOINT = process.env.FORMSPREE_ONBOARDING_URL || 'https://formspree.io/f/xqpejdvv';

function delink(s: string): string {
  return s.replace(/\bhttps?:\/\/(www\.)?/gi, '').replace(/\bwww\./gi, '');
}

export function formspreeValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return delink(v.trim());
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    const files = v.filter((x) => x && typeof x === 'object');
    if (files.length && files.length === v.length) return `${files.length} file${files.length === 1 ? '' : 's'} uploaded (in their Drive)`;
    return v.map(formspreeValue).filter(Boolean).join(', ');
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('url' in o || 'fileId' in o || 'name' in o) return '1 file uploaded (in their Drive)';
    return delink(JSON.stringify(o));
  }
  return '';
}

export async function copyOnboardingToFormspree(input: {
  business: string; name: string; email: string;
  questions: OnboardingQuestion[]; answers: Record<string, unknown>;
  brandQuestions: OnboardingQuestion[]; brandAnswers: Record<string, unknown>; brandMode: string | null;
}): Promise<boolean> {
  const body: Record<string, string> = {
    _subject: `Portal onboarding: ${input.business || input.name}`,
    business: input.business, name: input.name, email: input.email,
    brand: input.brandMode === 'help' ? 'Asked for help (brand questionnaire)' : 'Uploaded their own',
  };
  for (const q of input.questions) { const v = formspreeValue(input.answers[q.id]); if (v) body[q.prompt.slice(0, 120)] = v.slice(0, 4000); }
  if (input.brandMode === 'help') {
    for (const q of input.brandQuestions) { const v = formspreeValue(input.brandAnswers[q.id]); if (v) body[`Brand: ${q.prompt.slice(0, 110)}`] = v.slice(0, 4000); }
  }
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) reportError('[onboarding] formspree copy failed', `${r.status}`);
    return r.ok;
  } catch (e) {
    reportError('[onboarding] formspree copy failed', String(e));
    return false;
  }
}
