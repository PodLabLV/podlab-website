/**
 * Executed Affiliate Agreement → PDF.
 *
 * Server-only. Renders the same clause data the signing page renders, so the
 * document an affiliate files is provably the document they read.
 *
 * Built on @react-pdf/renderer rather than headless Chrome: no browser binary
 * to cold-start inside a Vercel function, and the output is deterministic —
 * two renders of the same signature produce byte-identical pages, which is the
 * property that makes an archived contract worth archiving.
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { BrandPartner, PODLAB_LOGO, loadLogo } from './pdf-brand';
import {
  Addendum,
  AgreementOptions,
  AgreementParty,
  SigningEvidence,
  buildAgreement,
  buildPartyBlock,
  buildRecitals,
  exhibitANotes,
  partyDisplayName,
} from './affiliate-agreement';
import {
  BASE_RATE,
  COMPANY,
  LAB_COMMISSIONS,
  VOLUME_TIERS,
  commissionFor,
  firstSaleFor,
  pct,
} from './affiliate-terms';

const GREEN = '#2ADD1B';
const INK = '#111111';
const MUTED = '#5A5A5A';
const RULE = '#D8D8D8';

// NOTE: never put `lineHeight` on the Page style. In @react-pdf/renderer 4.6.1
// an inherited lineHeight on Page silently drops every `fixed` absolutely
// positioned child — the page footer vanishes with no warning. Line height
// belongs on the individual text styles below.
const styles = StyleSheet.create({
  page: {
    paddingTop: 46,
    paddingBottom: 56,
    paddingHorizontal: 52,
    fontSize: 8.5,
    color: INK,
    fontFamily: 'Helvetica',
  },
  logo: { width: 116 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  lockupDivider: { width: 0.75, height: 26, backgroundColor: RULE },
  partnerLogo: { width: 104 },
  docTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', letterSpacing: 0.4 },
  docSubtitle: { fontSize: 8, color: MUTED, marginTop: 3, marginBottom: 10 },
  accentRule: { height: 2.5, width: 44, backgroundColor: GREEN, marginBottom: 12 },
  recital: { marginBottom: 6, lineHeight: 1.35 },
  partyBox: {
    borderWidth: 0.75,
    borderColor: RULE,
    padding: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  partyRow: { flexDirection: 'row', marginBottom: 2.5, lineHeight: 1.25 },
  partyLabel: { width: 120, color: MUTED },
  partyValue: { flex: 1, fontFamily: 'Helvetica-Bold' },
  sectionHeading: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    marginBottom: 4,
  },
  clause: { marginBottom: 5, textAlign: 'justify', lineHeight: 1.35 },
  bold: { fontFamily: 'Helvetica-Bold' },
  exhibitTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    color: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    lineHeight: 1.15,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRowAlt: { backgroundColor: '#F6F6F6' },
  note: { color: MUTED, fontSize: 7.5, marginBottom: 3, lineHeight: 1.35 },
  sigBlock: {
    borderWidth: 0.75,
    borderColor: RULE,
    padding: 12,
    marginTop: 10,
  },
  sigLabel: { fontSize: 7, color: MUTED, letterSpacing: 0.6, marginBottom: 3 },
  sigName: { fontSize: 15, fontFamily: 'Helvetica-BoldOblique', color: INK },
  sigRule: { borderBottomWidth: 0.75, borderBottomColor: INK, marginVertical: 5 },
  evidenceBox: {
    borderWidth: 0.75,
    borderColor: RULE,
    backgroundColor: '#FAFAFA',
    padding: 10,
    marginTop: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 5,
  },
});

function logo(): Buffer | null {
  return loadLogo(PODLAB_LOGO);
}

function Footer({ evidence, party }: { evidence: SigningEvidence; party: AgreementParty }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {COMPANY.legalName} — Affiliate Agreement · {party.beakerId} · {evidence.version}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

const COLS = [
  { key: 'lab', width: '30%' },
  { key: 'price', width: '20%' },
  { key: 'standard', width: '25%' },
  { key: 'first', width: '25%' },
];

function ExhibitA({ party }: { party: AgreementParty }) {
  const notes = exhibitANotes();
  return (
    <>
      <Text style={styles.exhibitTitle}>EXHIBIT A — COMMISSION SCHEDULE</Text>
      <Text style={styles.docSubtitle}>
        Incorporated into the Agreement under Section 4.1. Prepared for{' '}
        {partyDisplayName(party)} ({party.beakerId}) as of {party.effectiveDate}.
      </Text>
      <View style={styles.accentRule} />

      <Text style={[styles.sectionHeading, { marginTop: 0 }]}>A-1. Per-Offering Commission</Text>
      <View style={styles.tableHeader}>
        <Text style={{ width: COLS[0].width }}>OFFERING</Text>
        <Text style={{ width: COLS[1].width }}>LIST PRICE</Text>
        <Text style={{ width: COLS[2].width }}>STANDARD ({pct(BASE_RATE)})</Text>
        <Text style={{ width: COLS[3].width }}>FIRST SALE ({pct(BASE_RATE * 2)})</Text>
      </View>
      {LAB_COMMISSIONS.map((lab, i) => (
        <View
          key={lab.lab}
          style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
          wrap={false}
        >
          <Text style={[{ width: COLS[0].width }, styles.bold]}>{lab.lab}</Text>
          <Text style={{ width: COLS[1].width }}>{lab.price}</Text>
          <Text style={{ width: COLS[2].width }}>{commissionFor(lab, BASE_RATE)}</Text>
          <Text style={{ width: COLS[3].width }}>{firstSaleFor(lab, BASE_RATE)}</Text>
        </View>
      ))}

      <Text style={styles.sectionHeading}>A-2. Recurring Commission</Text>
      <Text style={styles.clause}>
        Offerings billed monthly pay commission every month the client remains active and current.
        ExpansionLab at {LAB_COMMISSIONS.find((l) => l.recurring)?.price} pays{' '}
        <Text style={styles.bold}>
          {commissionFor(LAB_COMMISSIONS.find((l) => l.recurring)!, BASE_RATE)}
        </Text>{' '}
        for the life of the engagement. Recurring commission stops when the client cancels, and is
        subject to the same Hold Period and clawback terms as one-time commissions.
      </Text>

      <Text style={styles.sectionHeading}>A-3. Volume Tiers</Text>
      <View style={styles.tableHeader}>
        <Text style={{ width: '40%' }}>LIFETIME QUALIFIED SALES</Text>
        <Text style={{ width: '30%' }}>COMMISSION RATE</Text>
        <Text style={{ width: '30%' }}>TIER</Text>
      </View>
      {VOLUME_TIERS.map((tier, i) => (
        <View
          key={tier.label}
          style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
          wrap={false}
        >
          <Text style={{ width: '40%' }}>
            {tier.threshold === 0 ? '0–4 sales' : `${tier.threshold}+ sales`}
          </Text>
          <Text style={[{ width: '30%' }, styles.bold]}>
            {tier.rate === null ? 'Negotiated' : pct(tier.rate)}
          </Text>
          <Text style={{ width: '30%' }}>{tier.label}</Text>
        </View>
      ))}

      <Text style={styles.sectionHeading}>A-4. Notes</Text>
      {notes.map((n, i) => (
        <Text key={i} style={styles.note}>
          • {n}
        </Text>
      ))}
    </>
  );
}

function ExhibitB({ party, addendum }: { party: AgreementParty; addendum: Addendum }) {
  return (
    <>
      <Text style={styles.exhibitTitle}>EXHIBIT B — ADDENDUM (NEGOTIATED TERMS)</Text>
      <Text style={styles.docSubtitle}>
        Incorporated under Section 18.8. Where this Exhibit conflicts with the Agreement or Exhibit
        A, this Exhibit controls. Specific to {partyDisplayName(party)} ({party.beakerId}).
      </Text>
      <View style={styles.accentRule} />
      <Text style={[styles.clause, { marginBottom: 10 }]}>{addendum.intro}</Text>
      {addendum.clauses.map((c, i) => (
        <Text key={c.n || i} style={styles.clause}>
          {c.n ? <Text style={styles.bold}>{c.n} </Text> : null}
          {c.title ? <Text style={styles.bold}>{c.title}. </Text> : null}
          {c.text}
        </Text>
      ))}
    </>
  );
}

function Signatures({
  party,
  evidence,
  hasAddendum,
}: {
  party: AgreementParty;
  evidence: SigningEvidence;
  hasAddendum: boolean;
}) {
  return (
    <>
      <Text style={styles.exhibitTitle}>SIGNATURES</Text>
      <View style={styles.accentRule} />
      <Text style={styles.clause}>
        By signing below, the Parties agree to be bound by this Agreement, Exhibit A
        {hasAddendum ? ', and Exhibit B' : ''} as of the Effective Date.
      </Text>

      <View style={styles.sigBlock}>
        <Text style={styles.sigLabel}>PODLAB LV LLC</Text>
        <Text style={styles.sigName}>{COMPANY.signatory}</Text>
        <View style={styles.sigRule} />
        <Text>
          {COMPANY.signatory}, {COMPANY.signatoryTitle}
        </Text>
        <Text style={{ color: MUTED }}>Date: {party.effectiveDate}</Text>
      </View>

      <View style={styles.sigBlock}>
        <Text style={styles.sigLabel}>AFFILIATE — {partyDisplayName(party).toUpperCase()}</Text>
        <Text style={styles.sigName}>{evidence.typedSignature}</Text>
        <View style={styles.sigRule} />
        <Text>
          {partyDisplayName(party)}
          {party.company ? `, ${party.company}` : ''}
        </Text>
        <Text style={{ color: MUTED }}>Date: {party.effectiveDate}</Text>
        <Text style={{ color: MUTED }}>Email: {party.email}</Text>
      </View>

      {party.coSigner ? (
        <View style={styles.sigBlock}>
          <Text style={styles.sigLabel}>
            AFFILIATE CO-SIGNER — {party.coSigner.name.toUpperCase()}
          </Text>
          <Text style={styles.sigName}>{evidence.coSignerSignature || ' '}</Text>
          <View style={styles.sigRule} />
          <Text>
            {party.coSigner.name}
            {party.coSigner.title ? `, ${party.coSigner.title}` : ''}
          </Text>
          <Text style={{ color: MUTED }}>Date: {party.effectiveDate}</Text>
          <Text style={{ color: MUTED }}>Email: {party.coSigner.email}</Text>
        </View>
      ) : null}

      <View style={styles.evidenceBox}>
        <Text style={[styles.sigLabel, { marginBottom: 5 }]}>ELECTRONIC SIGNATURE RECORD</Text>
        <View style={styles.partyRow}>
          <Text style={styles.partyLabel}>Signed at (UTC)</Text>
          <Text style={styles.partyValue}>{evidence.signedAt}</Text>
        </View>
        <View style={styles.partyRow}>
          <Text style={styles.partyLabel}>Typed signature</Text>
          <Text style={styles.partyValue}>{evidence.typedSignature}</Text>
        </View>
        <View style={styles.partyRow}>
          <Text style={styles.partyLabel}>IP address</Text>
          <Text style={styles.partyValue}>{evidence.ip || 'not recorded'}</Text>
        </View>
        <View style={styles.partyRow}>
          <Text style={styles.partyLabel}>Browser</Text>
          <Text style={[styles.partyValue, { fontFamily: 'Helvetica', fontSize: 7 }]}>
            {evidence.userAgent || 'not recorded'}
          </Text>
        </View>
        <View style={styles.partyRow}>
          <Text style={styles.partyLabel}>Agreement version</Text>
          <Text style={styles.partyValue}>{evidence.version}</Text>
        </View>
        <View style={styles.partyRow}>
          <Text style={styles.partyLabel}>Beaker ID</Text>
          <Text style={styles.partyValue}>{party.beakerId}</Text>
        </View>
        <Text style={[styles.note, { marginTop: 6 }]}>
          Executed electronically under the U.S. ESIGN Act and Nevada UETA (NRS Chapter 719). This
          record is retained by {COMPANY.legalName}. A paper copy is available at no charge by
          request to {COMPANY.email}.
        </Text>
      </View>
    </>
  );
}

export function AgreementDocument({
  party,
  evidence,
  options = {},
}: {
  party: AgreementParty;
  evidence: SigningEvidence;
  options?: AgreementOptions;
}) {
  const sections = buildAgreement(party, options);
  const recitals = buildRecitals(party);
  const partyRows = buildPartyBlock(party);
  const logoData = logo();
  const partnerLogo = options.partner ? loadLogo(options.partner.logo) : null;

  return (
    <Document
      title={`PodLab Affiliate Agreement — ${partyDisplayName(party)}`}
      author={COMPANY.legalName}
      subject={`Executed affiliate agreement ${evidence.version}`}
      creator={COMPANY.legalName}
    >
      {/* ── Agreement body ── */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.lockup}>
          {logoData ? <Image style={styles.logo} src={{ data: logoData, format: 'png' }} /> : null}
          {partnerLogo ? (
            <>
              <View style={styles.lockupDivider} />
              <Image style={styles.partnerLogo} src={{ data: partnerLogo, format: 'png' }} />
            </>
          ) : null}
        </View>
        <Text style={styles.docTitle}>AFFILIATE AGREEMENT</Text>
        <Text style={styles.docSubtitle}>
          PodLab Beaker Program · {evidence.version} · Effective {party.effectiveDate}
        </Text>
        <View style={styles.accentRule} />

        {recitals.map((r, i) => (
          <Text key={i} style={styles.recital}>
            {r}
          </Text>
        ))}

        <View style={styles.partyBox}>
          {partyRows.map((row) => (
            <View key={row.label} style={styles.partyRow}>
              <Text style={styles.partyLabel}>{row.label}</Text>
              <Text style={styles.partyValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.recital}>
          PodLab and Affiliate may be referred to individually as a &ldquo;Party&rdquo; and
          collectively as the &ldquo;Parties.&rdquo;
        </Text>

        {sections.map((section) => (
          <View key={section.n} wrap>
            <Text style={styles.sectionHeading} minPresenceAhead={30}>
              {section.n}) {section.heading}
            </Text>
            {section.clauses.map((c, i) => (
              <Text key={c.n || i} style={styles.clause}>
                {c.n ? <Text style={styles.bold}>{c.n} </Text> : null}
                {c.title ? <Text style={styles.bold}>{c.title}. </Text> : null}
                {c.text}
              </Text>
            ))}
          </View>
        ))}

        <Footer evidence={evidence} party={party} />
      </Page>

      {/* ── Exhibit A ── */}
      <Page size="LETTER" style={styles.page}>
        <ExhibitA party={party} />
        <Footer evidence={evidence} party={party} />
      </Page>

      {/* ── Exhibit B (only for negotiated deals) ── */}
      {options.addendum ? (
        <Page size="LETTER" style={styles.page}>
          <ExhibitB party={party} addendum={options.addendum} />
          <Footer evidence={evidence} party={party} />
        </Page>
      ) : null}

      {/* ── Signatures ── */}
      <Page size="LETTER" style={styles.page}>
        <Signatures party={party} evidence={evidence} hasAddendum={Boolean(options.addendum)} />
        <Footer evidence={evidence} party={party} />
      </Page>
    </Document>
  );
}

export async function renderAgreementPdf(
  party: AgreementParty,
  evidence: SigningEvidence,
  options: AgreementOptions = {},
): Promise<Buffer> {
  return renderToBuffer(
    <AgreementDocument party={party} evidence={evidence} options={options} />,
  );
}

/** Storage path / email filename. Stable per affiliate + signing timestamp. */
export function agreementFileName(party: AgreementParty, evidence: SigningEvidence): string {
  const stamp = evidence.signedAt.slice(0, 10);
  return `PodLab-Affiliate-Agreement-${party.beakerId}-${stamp}.pdf`;
}
