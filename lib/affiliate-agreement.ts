/**
 * The Beaker Affiliate Agreement as data, not markup.
 *
 * It lives here because the same words have to appear in three places — the
 * signing page, the executed PDF, and the archived copy — and a contract whose
 * text is duplicated across renderers is a contract that eventually says two
 * different things to two different people. Everything below is rendered; no
 * renderer authors legal text of its own.
 *
 * Terms come from affiliate-terms.ts. Never hardcode a rate in a clause.
 */

import {
  AGREEMENT_VERSION,
  COMPANY,
  DISPUTE_WINDOW_DAYS,
  FIRST_SALE_MULTIPLIER,
  HOLD_PERIOD_DAYS,
  MINIMUM_PAYOUT_USD,
  PAYOUT_DAYS_AFTER_MONTH_END,
  VOLUME_TIERS,
  pct,
  usd,
} from './affiliate-terms';

export interface CoSigner {
  name: string;
  email: string;
  /** Shown under the signature line, e.g. "Co-Owner, Valentine Strategy". */
  title?: string;
}

export interface AgreementParty {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  businessAddress: string;
  payoutMethod: string;
  payoutDetails: string;
  beakerId: string;
  /** Human-readable effective date, e.g. "August 19, 2026". */
  effectiveDate: string;
  /**
   * Second signatory on the SAME agreement — one Beaker ID, one commission
   * stream. Not a second affiliate: two affiliates need two agreements, or
   * attribution and payout both become ambiguous.
   */
  coSigner?: CoSigner;
}

/**
 * Negotiated terms that depart from the standard program, rendered as Exhibit B.
 *
 * Kept out of the main clause list on purpose. The standard agreement must stay
 * byte-identical for every affiliate who signs it — an exception belongs in an
 * exhibit that names itself as the exception, not smuggled into Section 4 where
 * nobody diffing two contracts would spot it.
 */
export interface Addendum {
  /** Plain-language summary printed above the clauses. */
  intro: string;
  clauses: Clause[];
}

export interface AgreementOptions {
  addendum?: Addendum;
  /**
   * Co-branding partner for the document header. Typed loosely here so the
   * agreement data module stays free of rendering concerns.
   */
  partner?: { name: string; logo: string };
}

export interface Clause {
  /** Clause number, e.g. "4.1". Omitted for single-paragraph sections. */
  n?: string;
  /** Bolded lead-in, e.g. "Commission Rate". */
  title?: string;
  text: string;
}

export interface Section {
  n: number;
  heading: string;
  clauses: Clause[];
}

/** Signing evidence captured at submission, printed on the executed PDF. */
export interface SigningEvidence {
  typedSignature: string;
  /**
   * Co-signer's typed signature. Separate field, never defaulted to their name:
   * printing a name on a signature line nobody typed manufactures a signature.
   */
  coSignerSignature?: string;
  signedAt: string;
  ip?: string;
  userAgent?: string;
  version: string;
}

/** Masks payout details so a stored PDF never carries full bank digits. */
export function maskPayoutDetails(method: string, details: string): string {
  const trimmed = (details || '').trim();
  if (!trimmed) return '—';
  if (method === 'Wire Transfer') {
    const tail = trimmed.replace(/\s+/g, '').slice(-4);
    return `Bank details on file (ending ${tail})`;
  }
  return trimmed;
}

export function partyDisplayName(p: AgreementParty): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

/* ── The agreement ─────────────────────────────────────────────────── */

export function buildAgreement(p: AgreementParty, opts: AgreementOptions = {}): Section[] {
  const holdDays = HOLD_PERIOD_DAYS;

  const sections: Section[] = [
    {
      n: 1,
      heading: 'Purpose and Relationship',
      clauses: [
        {
          n: '1.1',
          title: 'Purpose',
          text: `Affiliate will promote ${COMPANY.shortName}'s services and/or products ("Offerings") using approved marketing methods in exchange for commissions under this Agreement.`,
        },
        {
          n: '1.2',
          title: 'Independent Contractor',
          text: `Affiliate is an independent contractor, not an employee, partner, joint venturer, fiduciary, agent, or legal representative of ${COMPANY.shortName}. Affiliate has no authority to bind ${COMPANY.shortName}, incur obligations, or make representations on ${COMPANY.shortName}'s behalf.`,
        },
        {
          n: '1.3',
          title: 'No Exclusivity (Company)',
          text: `${COMPANY.shortName} may work with other affiliates and partners, including those competing with Affiliate.`,
        },
      ],
    },
    {
      n: 2,
      heading: 'Definitions',
      clauses: [
        {
          n: '2.1',
          text: `"Qualified Sale" means a completed transaction for Offerings that: is tracked to Affiliate via ${COMPANY.shortName}'s designated tracking method (UTM link, referral code, or platform attribution); is paid in full and not refunded, reversed, disputed, or charged back within the Hold Period; is not generated through Prohibited Traffic or Prohibited Conduct (Section 6); is not a self-referral unless expressly permitted in writing by ${COMPANY.shortName}.`,
        },
        {
          n: '2.2',
          text: '"Commission" means the percentage of Net Revenue (Section 4.3) paid to Affiliate for Qualified Sales, calculated at the rates set out in Exhibit A.',
        },
        {
          n: '2.3',
          text: `"Confidential Information" means any non-public ${COMPANY.shortName} information, including but not limited to: pricing, margins, proposals, scripts, SOPs, workflows, templates, vendor lists, client lists, lead lists, pipeline data, strategies, campaign performance data, conversion data, customer data, financials, training materials, and any information marked confidential or that reasonably should be understood to be confidential.`,
        },
        {
          n: '2.4',
          text: `"Restricted Customers/Leads" means any person or entity that, at any time during the Term and for 12 months after termination, is or was: a ${COMPANY.shortName} client, customer, subscriber, member, lead, prospect, inbound inquiry, booked call, or pipeline contact; or introduced to Affiliate by ${COMPANY.shortName}; or identified through ${COMPANY.shortName} Confidential Information.`,
        },
      ],
    },
    {
      n: 3,
      heading: 'Enrollment and Approval',
      clauses: [
        {
          n: '3.1',
          title: 'Approval Required',
          text: `Affiliate may only promote ${COMPANY.shortName} after written confirmation of acceptance into the affiliate program.`,
        },
        {
          n: '3.2',
          title: 'Accurate Information',
          text: `Affiliate represents that all information provided to ${COMPANY.shortName} is truthful and up to date. ${COMPANY.shortName} may suspend commissions until identity/payment details are verified.`,
        },
        {
          n: '3.3',
          title: 'Beaker ID',
          text: `Affiliate is assigned the tracking identifier "${p.beakerId}". Attribution runs through this identifier; sales that cannot be tied to it are not Qualified Sales.`,
        },
      ],
    },
    {
      n: 4,
      heading: 'Commission Structure and Payment',
      clauses: [
        {
          n: '4.1',
          title: 'Commission Rate',
          text: 'Affiliate earns commission on Net Revenue for each Qualified Sale at the rates set out in Exhibit A (Commission Schedule), which is incorporated into and forms part of this Agreement.',
        },
        {
          n: '4.2',
          title: 'First-Sale Bonus',
          text: `The first Qualified Sale credited to Affiliate earns ${FIRST_SALE_MULTIPLIER}× the applicable Commission Rate. Subsequent sales revert to the standard rate. On a recurring Offering, the bonus applies to the first month's commission only.`,
        },
        {
          n: '4.3',
          title: 'Net Revenue',
          text: `"Net Revenue" equals amounts actually received by ${COMPANY.shortName} for the applicable sale minus: refunds, chargebacks, disputes, credits, taxes, payment processing fees, affiliate network fees (if any), and any discounts or incentives applied.`,
        },
        {
          n: '4.4',
          title: 'Hold Period',
          text: `Commissions become payable only after ${holdDays} days from the date ${COMPANY.shortName} receives payment (the "Hold Period") to account for refunds/chargebacks and fraud screening.`,
        },
        {
          n: '4.5',
          title: 'Payment Schedule',
          text: `Commissions are paid monthly within ${PAYOUT_DAYS_AFTER_MONTH_END} days after the end of each month, for commissions that have cleared the Hold Period.`,
        },
        {
          n: '4.6',
          title: 'Minimum Payout Threshold',
          text: `${COMPANY.shortName} may apply a minimum payout threshold of ${usd(MINIMUM_PAYOUT_USD)} (or pay out any amount at ${COMPANY.shortName}'s discretion).`,
        },
        {
          n: '4.7',
          title: 'Payout Method',
          text: `Affiliate will be paid via ${p.payoutMethod} to: ${maskPayoutDetails(p.payoutMethod, p.payoutDetails)}. Affiliate is responsible for keeping payout details current.`,
        },
        {
          n: '4.8',
          title: 'Taxes',
          text: `Affiliate is solely responsible for all taxes arising from commissions. ${COMPANY.shortName} may require tax forms (e.g., W-9 or W-8) as a condition of payment. If Affiliate fails to provide required tax documentation, ${COMPANY.shortName} may withhold or suspend payments to the extent permitted by law.`,
        },
        {
          n: '4.9',
          title: 'Adjustments / Clawbacks',
          text: `${COMPANY.shortName} may deduct from future payouts any amounts previously paid for sales later determined not to be Qualified Sales (including refunds, disputes, fraud, or tracking manipulation). If deductions are insufficient, Affiliate must repay the balance within 10 days of written notice.`,
        },
        {
          n: '4.10',
          title: 'Tracking; Final Authority',
          text: `${COMPANY.shortName}'s tracking systems, records, and determinations of Qualified Sales and commissions are final, except for demonstrable system error supported by evidence. Affiliate must dispute any commission issue within ${DISPUTE_WINDOW_DAYS} days of the relevant statement, or it is waived.`,
        },
        {
          n: '4.11',
          title: 'Volume Tiers',
          text: `Affiliate's Commission Rate increases with lifetime Qualified Sales as set out in Exhibit A. A tier takes effect on Qualified Sales closing after the qualifying sale count is reached, and is not applied retroactively to earlier sales. Tier status is measured on lifetime Qualified Sales that have cleared the Hold Period.`,
        },
      ],
    },
    {
      n: 5,
      heading: 'Marketing Materials, Brand, and Permissions',
      clauses: [
        {
          n: '5.1',
          title: 'Approved Assets Only',
          text: `Affiliate may use only ${COMPANY.shortName}-approved creative, copy, and claims. Affiliate must not alter ${COMPANY.shortName} assets without written approval.`,
        },
        {
          n: '5.2',
          title: 'Limited License',
          text: `${COMPANY.shortName} grants Affiliate a limited, revocable, non-transferable, non-sublicensable license to use ${COMPANY.shortName} trademarks and marketing materials solely to promote Offerings during the Term, in compliance with this Agreement.`,
        },
        {
          n: '5.3',
          title: 'No Ownership',
          text: `Affiliate gains no ownership rights in ${COMPANY.shortName} intellectual property, branding, or assets.`,
        },
        {
          n: '5.4',
          title: 'Revocation',
          text: `${COMPANY.shortName} may revoke usage rights at any time. Affiliate must immediately remove ${COMPANY.shortName} assets upon request or termination.`,
        },
      ],
    },
    {
      n: 6,
      heading: 'Prohibited Conduct',
      clauses: [
        {
          n: '6.1',
          title: 'Misrepresent',
          text: `Make false, misleading, or unsubstantiated claims about ${COMPANY.shortName}, outcomes, earnings, timelines, "guarantees," or services.`,
        },
        {
          n: '6.2',
          title: 'Spam / Unlawful Outreach',
          text: 'Send spam (email/SMS/DM), violate CAN-SPAM, TCPA, GDPR/UK GDPR, CCPA/CPRA, or any applicable privacy/marketing law.',
        },
        {
          n: '6.3',
          title: 'Trademark Bidding / Impersonation',
          text: `Bid on ${COMPANY.shortName} brand terms or misspellings in paid search without written approval. Register domains/social handles resembling ${COMPANY.shortName} or impersonate ${COMPANY.shortName}.`,
        },
        {
          n: '6.4',
          title: 'Cookie Stuffing / Tracking Manipulation',
          text: 'Use forced clicks, cookie stuffing, hidden iframes, deceptive redirects, link cloaking designed to mislead, attribution fraud, or any traffic manipulation.',
        },
        {
          n: '6.5',
          title: 'Incentivized or Misleading Promotions',
          text: `Offer unauthorized rebates, cash-back, giveaways, or incentives tied to purchasing ${COMPANY.shortName} services unless approved in writing.`,
        },
        {
          n: '6.6',
          title: 'Prohibited Content',
          text: `Promote ${COMPANY.shortName} alongside illegal, hateful, pornographic, or otherwise brand-damaging content, or content that violates platform policies.`,
        },
        {
          n: '6.7',
          title: 'Confidential Info Leaks',
          text: 'Disclose Confidential Information to any third party. Violation of this Section is material breach and may result in immediate termination and forfeiture of unpaid commissions.',
        },
      ],
    },
    {
      n: 7,
      heading: 'Compliance: FTC and Platform Rules',
      clauses: [
        {
          n: '7.1',
          title: 'FTC Disclosure Required',
          text: 'Affiliate must clearly and conspicuously disclose the affiliate relationship in all promotions (e.g., "I may earn a commission if you purchase through my link"). Disclosures must be unavoidable and platform-appropriate.',
        },
        {
          n: '7.2',
          title: 'Platform Policies',
          text: 'Affiliate must comply with all policies of any platform used (Meta, YouTube, TikTok, Apple Podcasts, etc.).',
        },
        {
          n: '7.3',
          title: 'Proof of Compliance',
          text: `${COMPANY.shortName} may request screenshots, links, or recordings showing disclosures. Failure to provide may result in suspension of payments.`,
        },
      ],
    },
    {
      n: 8,
      heading: 'Term and Termination',
      clauses: [
        { n: '8.1', title: 'Term', text: 'This Agreement starts on the Effective Date and continues until terminated.' },
        {
          n: '8.2',
          title: 'Termination for Convenience',
          text: "Either Party may terminate at any time with 7 days' written notice.",
        },
        {
          n: '8.3',
          title: 'Immediate Termination for Cause',
          text: `${COMPANY.shortName} may terminate immediately if Affiliate breaches this Agreement, violates law, harms ${COMPANY.shortName}'s reputation, or engages in Prohibited Conduct.`,
        },
        {
          n: '8.4',
          title: 'Effect of Termination',
          text: `Affiliate must immediately stop using ${COMPANY.shortName} assets and cease representing any relationship. Affiliate remains eligible for commissions only on Qualified Sales that occur before termination and clear the Hold Period, unless termination was for cause, in which case ${COMPANY.shortName} may withhold unpaid commissions to the extent permitted by law and consistent with fraud prevention.`,
        },
      ],
    },
    {
      n: 9,
      heading: 'Confidentiality (NDA)',
      clauses: [
        {
          n: '9.1',
          title: 'Confidentiality Obligation',
          text: `Affiliate agrees to hold all Confidential Information in strict confidence, use it only to perform under this Agreement, and not disclose it to any third party without ${COMPANY.shortName}'s prior written consent.`,
        },
        {
          n: '9.2',
          title: 'Standard of Care',
          text: "Affiliate must protect Confidential Information using at least the same degree of care used to protect Affiliate's own confidential information, and no less than reasonable care.",
        },
        {
          n: '9.3',
          title: 'Exclusions',
          text: `Confidential Information does not include information that Affiliate can prove: is or becomes public through no breach by Affiliate; was lawfully known to Affiliate before disclosure by ${COMPANY.shortName}; is independently developed without use of ${COMPANY.shortName} Confidential Information; is lawfully obtained from a third party without breach of any duty.`,
        },
        {
          n: '9.4',
          title: 'Compelled Disclosure',
          text: `If legally compelled to disclose Confidential Information, Affiliate must provide prompt notice (if permitted) to allow ${COMPANY.shortName} to seek protective relief, and disclose only what is legally required.`,
        },
        {
          n: '9.5',
          title: 'Return/Destruction',
          text: 'Upon request or termination, Affiliate must immediately return or destroy all Confidential Information (including copies, notes, screenshots, downloads) and certify compliance in writing.',
        },
        {
          n: '9.6',
          title: 'Injunctive Relief',
          text: `Affiliate acknowledges that breach of this NDA would cause irreparable harm. ${COMPANY.shortName} may seek immediate injunctive relief (without posting bond where permitted), in addition to any other remedies.`,
        },
        {
          n: '9.7',
          title: 'Survival',
          text: 'Confidentiality obligations survive termination for 5 years, and as to trade secrets, for as long as they remain trade secrets under applicable law.',
        },
      ],
    },
    {
      n: 10,
      heading: 'Non-Compete + Non-Solicit',
      clauses: [
        {
          n: '10.1',
          title: 'Restricted Business',
          text: `"Restricted Business" means video sales asset production, podcast production, podcast growth/monetization, content studio and content agency services, and materially similar services to ${COMPANY.shortName} Offerings.`,
        },
        {
          n: '10.2',
          title: 'Non-Solicitation of Restricted Customers/Leads',
          text: `During the Term and for 12 months after termination, Affiliate will not, directly or indirectly: solicit, entice, divert, or attempt to divert any Restricted Customers/Leads away from ${COMPANY.shortName}; or sell or provide Restricted Business services to any Restricted Customers/Leads; or assist any third party in doing so.`,
        },
        {
          n: '10.3',
          title: 'Non-Interference with Business Relationships',
          text: `During the Term and for 12 months after termination, Affiliate will not interfere with ${COMPANY.shortName}'s relationships with vendors, contractors, or partners learned through ${COMPANY.shortName}.`,
        },
        {
          n: '10.4',
          title: 'Non-Compete',
          text: `During the Term and for 12 months after termination, Affiliate will not, to the maximum extent permitted by applicable law, directly or indirectly engage in Restricted Business where such engagement is based on, derived from, or materially aided by ${COMPANY.shortName} Confidential Information.`,
        },
        {
          n: '10.5',
          title: 'Carve-Out',
          text: `Nothing prevents Affiliate from: engaging in general marketing activities unrelated to Restricted Business; or performing services for third parties in non-competing markets, provided Affiliate does not use ${COMPANY.shortName} Confidential Information and does not solicit Restricted Customers/Leads.`,
        },
        {
          n: '10.6',
          title: 'No Use of PodLab Playbook',
          text: `Even if a jurisdiction limits non-competes, Affiliate agrees they may not use ${COMPANY.shortName} Confidential Information to replicate ${COMPANY.shortName}'s business model, pricing structure, scripts, SOPs, or systems in a competing offering.`,
        },
        {
          n: '10.7',
          title: 'Blue-Pencil / Reformation',
          text: 'If any restriction is found overly broad, a court may modify it to the minimum extent necessary to make it enforceable, and the modified restriction will be enforced.',
        },
        {
          n: '10.8',
          title: 'Separate Covenants',
          text: 'Each restriction in this Section is independent. If one is unenforceable, the others remain enforceable.',
        },
        {
          n: '10.9',
          title: 'Acknowledgment',
          text: `Affiliate acknowledges these restrictions are reasonable in scope, duration, and purpose to protect ${COMPANY.shortName}'s legitimate business interests.`,
        },
      ],
    },
    {
      n: 11,
      heading: 'Non-Disparagement',
      clauses: [
        {
          text: `Affiliate agrees not to make any false or malicious statements (public or private) that would reasonably harm ${COMPANY.shortName}'s reputation. This does not prohibit truthful statements required by law.`,
        },
      ],
    },
    {
      n: 12,
      heading: 'Intellectual Property, Content, and Ownership',
      clauses: [
        {
          n: '12.1',
          title: 'Affiliate IP',
          text: `Affiliate retains ownership of pre-existing materials created independently of ${COMPANY.shortName}.`,
        },
        { n: '12.2', title: 'PodLab IP', text: `All ${COMPANY.shortName} materials remain ${COMPANY.shortName}'s sole property.` },
        {
          n: '12.3',
          title: 'Feedback License',
          text: `If Affiliate provides feedback, ideas, or suggestions, Affiliate grants ${COMPANY.shortName} a perpetual, worldwide, royalty-free license to use them without obligation.`,
        },
        {
          n: '12.4',
          title: 'No Recording/Redistribution',
          text: `Affiliate must not record, redistribute, or sell ${COMPANY.shortName} materials, calls, trainings, templates, or internal resources without explicit written consent.`,
        },
      ],
    },
    {
      n: 13,
      heading: 'Data Privacy and Security',
      clauses: [
        {
          n: '13.1',
          title: 'Minimum Security',
          text: `Affiliate must use reasonable administrative, technical, and physical safeguards to protect any ${COMPANY.shortName}-related information.`,
        },
        {
          n: '13.2',
          title: 'No Data Harvesting',
          text: `Affiliate may not scrape ${COMPANY.shortName} sites or collect personal data outside lawful means.`,
        },
        {
          n: '13.3',
          title: 'Incident Notification',
          text: `Affiliate must notify ${COMPANY.shortName} within 48 hours of any suspected data breach involving ${COMPANY.shortName} information.`,
        },
      ],
    },
    {
      n: 14,
      heading: 'Representations and Warranties',
      clauses: [
        {
          text: 'Affiliate represents and warrants: they will comply with all applicable laws and regulations; they have the right to enter into this Agreement; they will not violate any third-party rights; all promotions will be truthful and not deceptive; they will not infringe IP or use unlicensed materials.',
        },
      ],
    },
    {
      n: 15,
      heading: 'Indemnification',
      clauses: [
        {
          n: '15.1',
          title: 'Affiliate Indemnity',
          text: `Affiliate will indemnify, defend, and hold harmless ${COMPANY.shortName} and its owners, managers, employees, contractors, and agents from any claims, damages, liabilities, penalties, costs, and attorneys' fees arising from or related to: Affiliate's marketing, content, statements, or representations; violation of law; IP infringement by Affiliate materials; breach of this Agreement.`,
        },
        {
          n: '15.2',
          title: 'Company Indemnity (Limited)',
          text: `${COMPANY.shortName} will indemnify Affiliate for third-party claims that ${COMPANY.shortName}'s provided marketing assets (as supplied) infringe a third party's IP, provided Affiliate used them as approved.`,
        },
      ],
    },
    {
      n: 16,
      heading: 'Limitation of Liability',
      clauses: [
        {
          text: `To the maximum extent permitted by law: ${COMPANY.shortName} is not liable for indirect, incidental, special, consequential, or punitive damages. ${COMPANY.shortName}'s total liability under this Agreement will not exceed the commissions paid to Affiliate in the 3 months preceding the event giving rise to the claim.`,
        },
      ],
    },
    {
      n: 17,
      heading: "Dispute Resolution, Governing Law, and Attorneys' Fees",
      clauses: [
        {
          n: '17.1',
          title: 'Governing Law',
          text: 'This Agreement is governed by the laws of the State of Nevada, without regard to conflict of laws principles.',
        },
        {
          n: '17.2',
          title: 'Good Faith Resolution',
          text: 'The Parties agree to attempt good-faith resolution within 30 days before filing any formal action, except for injunctive relief.',
        },
        {
          n: '17.3',
          title: 'Injunctive Relief',
          text: `${COMPANY.shortName} may seek immediate injunctive relief for breaches of Sections 9–10 in any court of competent jurisdiction.`,
        },
        {
          n: '17.4',
          title: 'Venue',
          text: 'Unless prohibited by law, any action will be brought in Clark County, Nevada.',
        },
        {
          n: '17.5',
          title: "Attorneys' Fees",
          text: "The prevailing Party is entitled to reasonable attorneys' fees and costs.",
        },
      ],
    },
    {
      n: 18,
      heading: 'Miscellaneous',
      clauses: [
        {
          n: '18.1',
          title: 'Entire Agreement',
          text: 'This Agreement, together with Exhibit A, is the entire agreement and supersedes prior discussions.',
        },
        {
          n: '18.2',
          title: 'Amendments',
          text: `Any amendment must be in writing signed by both Parties. ${COMPANY.shortName} may update program policies with notice; continued participation constitutes acceptance. A change to Exhibit A applies only to Qualified Sales closing after Affiliate receives notice of it.`,
        },
        {
          n: '18.3',
          title: 'Assignment',
          text: `Affiliate may not assign this Agreement without ${COMPANY.shortName}'s written consent. ${COMPANY.shortName} may assign to an affiliate or successor entity.`,
        },
        {
          n: '18.4',
          title: 'Severability',
          text: 'If any provision is unenforceable, the remainder remains effective.',
        },
        {
          n: '18.5',
          title: 'Waiver',
          text: 'No waiver is effective unless in writing; waiver of one breach is not waiver of another.',
        },
        {
          n: '18.6',
          title: 'Notices',
          text: 'Notices will be sent to the emails listed above (and are deemed delivered when sent, absent bounceback).',
        },
        {
          n: '18.7',
          title: 'Counterparts; E-Signature',
          text: 'This Agreement may be signed electronically and in counterparts, each deemed an original.',
        },
      ],
    },
    {
      // Section 19 exists to satisfy the ESIGN Act / Nevada UETA (NRS 719)
      // consent requirement. A typed signature binds only when the signer
      // affirmatively agreed to transact electronically and was told they can
      // get a paper copy — neither of which the pre-2026.08.19 version said.
      n: 19,
      heading: 'Electronic Records and Signatures',
      clauses: [
        {
          n: '19.1',
          title: 'Consent to Electronic Transactions',
          text: 'Affiliate consents to conduct this transaction electronically and agrees that a typed name submitted through the online signing form constitutes Affiliate\'s legally binding signature under the U.S. ESIGN Act and the Nevada Uniform Electronic Transactions Act (NRS Chapter 719).',
        },
        {
          n: '19.2',
          title: 'Delivery and Retention',
          text: `A PDF copy of this executed Agreement is emailed to Affiliate at the address above and retained by ${COMPANY.shortName}. Affiliate may request a paper copy at no charge by writing to ${COMPANY.email}.`,
        },
        {
          n: '19.3',
          title: 'Hardware and Software',
          text: 'To access and retain this Agreement, Affiliate needs an internet-connected device, a current web browser, an active email account, and PDF-reading software.',
        },
        {
          n: '19.4',
          title: 'Withdrawing Consent',
          text: `Affiliate may withdraw consent to electronic records by writing to ${COMPANY.email}. Withdrawal applies going forward only and does not affect the validity of this Agreement as signed.`,
        },
        {
          n: '19.5',
          title: 'Signing Record',
          text: 'The signature block records the typed signature, timestamp, originating IP address, and browser used at signing. The Parties agree this record is admissible evidence of execution.',
        },
      ],
    },
  ];

  // An exception is worthless if the standard terms silently override it, so
  // say plainly which document wins. Appended to Miscellaneous rather than
  // given its own section, to keep section numbering stable across affiliates.
  if (opts.addendum) {
    const misc = sections.find((sec) => sec.n === 18);
    misc?.clauses.push({
      n: '18.8',
      title: 'Addendum',
      text: 'Exhibit B (Addendum — Negotiated Terms) is incorporated into and forms part of this Agreement. Where Exhibit B conflicts with any other provision of this Agreement or Exhibit A, Exhibit B controls.',
    });
  }

  if (p.coSigner) {
    const misc = sections.find((sec) => sec.n === 18);
    misc?.clauses.push({
      n: '18.9',
      title: 'Joint Signatories',
      text: `This Agreement is signed by both ${partyDisplayName(p)} and ${p.coSigner.name}, who are jointly and severally bound by it. Commissions are attributed to a single Beaker ID ("${p.beakerId}") and paid to the payout destination in Section 4.7; PodLab has no obligation to split or apportion payments between them.`,
    });
  }

  return sections;
}

/** Recital paragraphs shown above Section 1. */
export function buildRecitals(p: AgreementParty): string[] {
  return [
    `This Affiliate Agreement ("Agreement") is entered into as of ${p.effectiveDate} ("Effective Date") by and between:`,
    `${COMPANY.legalName} ("${COMPANY.shortName}," "Company," "we," "us"), with a principal business address at ${COMPANY.address},`,
    'and',
    `${partyDisplayName(p)} ("Affiliate," "you"), an individual and/or business entity as identified below.`,
  ];
}

export function buildPartyBlock(p: AgreementParty): { label: string; value: string }[] {
  return [
    { label: 'Affiliate Legal Name', value: partyDisplayName(p) },
    { label: 'Affiliate Business Name', value: p.company?.trim() || 'Individual' },
    { label: 'Affiliate Email', value: p.email },
    { label: 'Affiliate Address', value: p.businessAddress },
    { label: 'Beaker ID', value: p.beakerId },
    { label: 'Agreement Version', value: AGREEMENT_VERSION },
  ];
}

/** Plain-language notes printed under Exhibit A's tables. */
export function exhibitANotes(): string[] {
  const tierText = VOLUME_TIERS.filter((t) => t.threshold > 0)
    .map((t) => (t.rate === null ? `${t.threshold}+ sales: custom tier` : `${t.threshold}+ sales: ${pct(t.rate)}`))
    .join('; ');
  return [
    `Commission is calculated on Net Revenue (Section 4.3), not list price. The dollar figures above assume a sale at full list price with no discount applied.`,
    `Volume tiers are measured on lifetime Qualified Sales that have cleared the ${HOLD_PERIOD_DAYS}-day Hold Period (${tierText}). Tiers apply going forward, never retroactively.`,
    `Commissions clear ${HOLD_PERIOD_DAYS} days after ${COMPANY.shortName} receives payment and are paid within ${PAYOUT_DAYS_AFTER_MONTH_END} days of month end, subject to a ${usd(MINIMUM_PAYOUT_USD)} minimum payout.`,
    `Prices shown are ${COMPANY.shortName}'s list prices as of the Effective Date and may change; a change applies only to Qualified Sales closing after notice, per Section 18.2.`,
  ];
}
