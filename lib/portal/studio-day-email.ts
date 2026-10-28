// The Studio Day parts of the EL welcome email (deliver el_welcome). Kept out
// of lib/portal/studio-day.ts so the portal's browser bundle never pulls in the
// email frame. Pure; scripts/portal-studio-day.test.ts renders it.

import { EMAIL_STYLE, escapeHtml } from '@/lib/portal-email';
import { STUDIO_COPY } from '@/lib/portal/studio-day';

/** A second, outlined button so it reads as its own step under the main one. */
const OUTLINE_BUTTON =
  'display:inline-block;padding:13px 26px;border:2px solid #2add1b;color:#2add1b;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;';

/** The ELITE block under the intake button: one line and a "Book your Studio Day" button. */
export function studioDayEmailBlock(url: string): { html: string[]; text: string[] } {
  const href = escapeHtml(url);
  return {
    html: [
      `        <p style="${EMAIL_STYLE.lead}margin-top:32px;">${escapeHtml(STUDIO_COPY.emailLine)}</p>`,
      `        <a href="${href}" style="${OUTLINE_BUTTON}">${STUDIO_COPY.emailButton} &rarr;</a>`,
    ],
    text: [`${STUDIO_COPY.emailLine}\n${STUDIO_COPY.emailButton}: ${url}`],
  };
}

/** el_welcome when the intake is already on file: nothing to fill out, AssetsLab is next. */
export const EL_WELCOME_ON_FILE = {
  subject: 'Welcome to EssentialsLab. Your intake is already on file',
  kicker: 'Welcome',
  lead: `You're in. ${STUDIO_COPY.intakeOnFile}`,
  button: 'Open your portal',
  path: '/portal',
  activity: 'EssentialsLab started. Intake on file, AssetsLab is next',
} as const;
