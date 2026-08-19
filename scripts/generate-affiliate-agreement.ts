/**
 * Generate an affiliate agreement PDF from a JSON brief, outside the web flow.
 *
 * Why this exists: some affiliates are recruited in a room, not through the
 * signup page — and negotiated deals need an Exhibit B the self-serve form has
 * no way to collect. This script renders from the SAME lib the website renders
 * from, so a hand-issued agreement and a self-serve one are the same document
 * with the same clause numbering. The alternative is someone rebuilding the
 * contract in a word processor, which is how two versions of "the agreement"
 * start circulating.
 *
 * Usage:
 *   npx tsx scripts/generate-affiliate-agreement.ts <brief.json> [outDir]
 *
 * The brief is UNSIGNED by default: it produces a copy for the affiliate to
 * review and sign. Pass a `signature` block only when transcribing a signature
 * that was actually given — never to pre-fill one.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { AgreementOptions, AgreementParty, SigningEvidence } from '../lib/affiliate-agreement';
import { agreementFileName, renderAgreementPdf } from '../lib/affiliate-agreement-pdf';
import { AGREEMENT_VERSION, PAYOUT_METHODS } from '../lib/affiliate-terms';

interface Brief {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  businessAddress?: string;
  payoutMethod?: string;
  payoutDetails?: string;
  beakerId?: string;
  effectiveDate?: string;
  coSigner?: { name: string; email: string; title?: string };
  addendum?: AgreementOptions['addendum'];
  partner?: AgreementOptions['partner'];
  /** Present only when transcribing a signature already given. */
  signature?: {
    typedSignature: string;
    coSignerSignature?: string;
    signedAt?: string;
    ip?: string;
    userAgent?: string;
  };
}

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function slugify(first: string, last: string): string {
  return `${first}-${last}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function longDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

async function main() {
  const [briefPath, outDirArg] = process.argv.slice(2);
  if (!briefPath) fail('usage: generate-affiliate-agreement.ts <brief.json> [outDir]');
  if (!fs.existsSync(briefPath)) fail(`brief not found: ${briefPath}`);

  let brief: Brief;
  try {
    brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
  } catch (e) {
    fail(`brief is not valid JSON: ${(e as Error).message}`);
  }

  for (const field of ['firstName', 'lastName', 'email'] as const) {
    if (!brief[field] || !String(brief[field]).trim()) fail(`brief is missing required field: ${field}`);
  }

  // Address and payout are frequently unknown when a draft goes out for review —
  // the affiliate supplies them at signing. Print a visible placeholder rather
  // than inventing a value or blocking the draft.
  const TBD = '[to be completed at signing]';

  // A payout method the contract's Section 4.7 doesn't recognise would print a
  // clause promising payment by a route we don't operate. Absent is fine; wrong
  // is not.
  if (brief.payoutMethod && !(PAYOUT_METHODS as readonly string[]).includes(brief.payoutMethod)) {
    fail(`payoutMethod must be one of: ${PAYOUT_METHODS.join(', ')} (got "${brief.payoutMethod}")`);
  }

  // An unsigned draft must not also be missing its signature evidence silently.
  if (brief.signature?.typedSignature && (!brief.businessAddress || !brief.payoutMethod)) {
    fail('a signed agreement needs businessAddress and payoutMethod — refusing to execute a contract with placeholders in it');
  }

  const party: AgreementParty = {
    firstName: brief.firstName.trim(),
    lastName: brief.lastName.trim(),
    company: brief.company?.trim() || undefined,
    email: brief.email.trim().toLowerCase(),
    businessAddress: brief.businessAddress?.trim() || TBD,
    payoutMethod: brief.payoutMethod || TBD,
    payoutDetails: brief.payoutDetails?.trim() || TBD,
    beakerId: brief.beakerId?.trim() || slugify(brief.firstName, brief.lastName),
    effectiveDate: brief.effectiveDate?.trim() || longDate(new Date()),
    coSigner: brief.coSigner,
  };

  const signed = Boolean(brief.signature?.typedSignature?.trim());
  const signedAt = brief.signature?.signedAt || new Date().toISOString();

  const evidence: SigningEvidence = {
    // An unsigned copy prints a blank signature line rather than a name, so a
    // review draft can never be mistaken for an executed contract.
    typedSignature: signed ? brief.signature!.typedSignature.trim() : '',
    coSignerSignature: signed ? brief.signature!.coSignerSignature?.trim() : undefined,
    signedAt: signed ? new Date(signedAt).toISOString().replace('T', ' ').slice(0, 19) : 'not yet signed',
    ip: brief.signature?.ip,
    userAgent: brief.signature?.userAgent,
    version: AGREEMENT_VERSION,
  };

  const options: AgreementOptions = {
    ...(brief.addendum ? { addendum: brief.addendum } : {}),
    ...(brief.partner ? { partner: brief.partner } : {}),
  };

  const pdf = await renderAgreementPdf(party, evidence, options);

  const outDir = outDirArg || process.cwd();
  fs.mkdirSync(outDir, { recursive: true });
  const base = signed
    ? agreementFileName(party, evidence)
    : `PodLab-Affiliate-Agreement-${party.beakerId}-UNSIGNED.pdf`;
  const outPath = path.join(outDir, base);
  fs.writeFileSync(outPath, pdf);

  console.log(JSON.stringify({
    ok: true,
    path: outPath,
    bytes: pdf.length,
    beakerId: party.beakerId,
    version: AGREEMENT_VERSION,
    signed,
    hasAddendum: Boolean(brief.addendum),
    partner: brief.partner?.name ?? null,
    coSigner: party.coSigner?.name ?? null,
  }, null, 2));
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
