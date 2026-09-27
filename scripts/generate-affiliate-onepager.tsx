/**
 * "Beaker Program at a Glance" — a single-page, affiliate-facing PDF.
 *
 * This is the sheet that goes WITH the agreement, not instead of it. An affiliate
 * who has to parse ten pages of clauses to find out when they get paid will just
 * ask, so answer it on one page in their language.
 *
 * Written from the affiliate's side of the table. Nothing here is framed as what
 * protects PodLab — that framing belongs in an internal doc, and putting it in
 * front of the person you're asking to sell for you is a mistake.
 *
 * Every number is imported from affiliate-terms.ts. If a rate changes, this sheet
 * changes with the contract; it can never quietly disagree with what they signed.
 *
 * Usage:
 *   npx tsx scripts/generate-affiliate-onepager.ts [brief.json] [outDir]
 *
 * With no brief it renders the generic program sheet. With one it personalises
 * the header and adds a line for their negotiated terms.
 */

import React from 'react';
import { renderToBuffer, Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import fs from 'node:fs';
import path from 'node:path';
import { BrandPartner, PODLAB_LOGO, loadLogo } from '../lib/pdf-brand';
import {
  AGREEMENT_VERSION,
  BASE_RATE,
  COMPANY,
  DISPUTE_WINDOW_DAYS,
  FIRST_SALE_MULTIPLIER,
  HOLD_PERIOD_DAYS,
  LAB_COMMISSIONS,
  MINIMUM_PAYOUT_USD,
  PAYOUT_DAYS_AFTER_MONTH_END,
  PAYOUT_METHODS,
  VOLUME_TIERS,
  commissionFor,
  firstSaleFor,
  pct,
  usd,
} from '../lib/affiliate-terms';

const GREEN = '#2ADD1B';
const INK = '#111111';
const MUTED = '#5A5A5A';
const RULE = '#D8D8D8';
const WASH = '#F6F6F6';

// No lineHeight on `page` — see the note in affiliate-agreement-pdf.tsx.
const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 26, paddingHorizontal: 38, fontSize: 8, color: INK, fontFamily: 'Helvetica' },
  logo: { width: 88 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  lockupDivider: { width: 0.75, height: 22, backgroundColor: RULE },
  partnerLogo: { width: 80 },
  title: { fontSize: 17, fontFamily: 'Helvetica-Bold', letterSpacing: -0.2 },
  sub: { fontSize: 8, color: MUTED, marginTop: 3 },
  rule: { height: 2.5, width: 40, backgroundColor: GREEN, marginTop: 7, marginBottom: 10 },

  cols: { flexDirection: 'row', gap: 18 },
  colMain: { width: '58%' },
  colSide: { width: '42%' },

  h2: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 5, letterSpacing: 0.2 },
  h2later: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4, letterSpacing: 0.2 },
  p: { color: MUTED, lineHeight: 1.2, marginBottom: 4 },
  bold: { fontFamily: 'Helvetica-Bold', color: INK },

  th: { flexDirection: 'row', backgroundColor: INK, color: '#FFFFFF', paddingVertical: 4, paddingHorizontal: 5, fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: RULE, lineHeight: 1.1 },
  trAlt: { backgroundColor: WASH },

  factRow: { flexDirection: 'row', paddingVertical: 2.9, borderBottomWidth: 0.5, borderBottomColor: RULE },
  factK: { width: '48%', color: MUTED },
  factV: { width: '52%', fontFamily: 'Helvetica-Bold' },

  box: { borderWidth: 0.75, borderColor: RULE, backgroundColor: WASH, padding: 8, marginTop: 8 },
  bullet: { color: MUTED, lineHeight: 1.2, marginBottom: 3 },

  callout: { borderLeftWidth: 2.5, borderLeftColor: GREEN, paddingLeft: 8, marginTop: 9, marginBottom: 2 },

  foot: { position: 'absolute', bottom: 16, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6, color: MUTED, borderTopWidth: 0.5, borderTopColor: RULE, paddingTop: 4 },
});

interface Personal {
  name?: string;
  beakerId?: string;
  hasAddendum?: boolean;
  partner?: BrandPartner;
}

/** Column-width-safe variant of firstSaleFor, for this sheet's narrow table. */
function firstSaleShort(lab: (typeof LAB_COMMISSIONS)[number]): string {
  return firstSaleFor(lab, BASE_RATE).replace(' first month', ' (mo. 1)');
}

function Sheet({ who }: { who: Personal }) {
  const logoData = loadLogo(PODLAB_LOGO);
  const partnerLogo = who.partner ? loadLogo(who.partner.logo) : null;
  const recurring = LAB_COMMISSIONS.find((l) => l.recurring);

  return (
    <Document
      title="PodLab Beaker — Program at a Glance"
      author={COMPANY.legalName}
      subject="Affiliate program summary"
    >
      <Page size="LETTER" style={s.page}>
        <View style={s.foot} fixed>
          <Text>
            {COMPANY.legalName}
            {who.partner ? ` in partnership with ${who.partner.name}` : ''} · Summary of the Beaker
            Affiliate Agreement {AGREEMENT_VERSION} · questions: {COMPANY.email}
          </Text>
          <Text>Summary only — the signed agreement governs.</Text>
        </View>

        <View style={s.lockup}>
          {logoData ? <Image style={s.logo} src={{ data: logoData, format: 'png' }} /> : null}
          {partnerLogo ? (
            <>
              <View style={s.lockupDivider} />
              <Image style={s.partnerLogo} src={{ data: partnerLogo, format: 'png' }} />
            </>
          ) : null}
        </View>
        <Text style={s.title}>The Beaker Program at a Glance</Text>
        <Text style={s.sub}>
          {who.name
            ? `Prepared for ${who.name}${who.beakerId ? ` · Beaker ID ${who.beakerId}` : ''}`
            : 'Everything that matters about referring business to PodLab, on one page.'}
        </Text>
        <View style={s.rule} />

        <View style={s.cols}>
          {/* ── left: what you earn ── */}
          <View style={s.colMain}>
            <Text style={s.h2}>WHAT YOU EARN</Text>
            <View style={s.th}>
              <Text style={{ width: '34%' }}>WHAT YOU REFER</Text>
              <Text style={{ width: '22%' }}>PRICE</Text>
              <Text style={{ width: '22%' }}>YOU EARN</Text>
              <Text style={{ width: '22%' }}>FIRST SALE</Text>
            </View>
            {LAB_COMMISSIONS.map((lab, i) => (
              <View key={lab.lab} style={i % 2 === 1 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
                <Text style={[{ width: '34%' }, s.bold]}>{lab.lab}</Text>
                <Text style={{ width: '22%', color: MUTED }}>{lab.price}</Text>
                <Text style={{ width: '22%' }}>{commissionFor(lab, BASE_RATE)}</Text>
                <Text style={[{ width: '22%' }, s.bold]}>{firstSaleShort(lab)}</Text>
              </View>
            ))}

            <View style={s.callout}>
              <Text style={s.p}>
                <Text style={s.bold}>Your very first sale pays double.</Text> After that you earn{' '}
                {pct(BASE_RATE)} of net revenue on everything you refer — and{' '}
                {recurring ? `${commissionFor(recurring, BASE_RATE)} ` : ''}
                every single month a client stays on {recurring?.lab}.
              </Text>
            </View>

            <Text style={s.h2later}>REFER MORE, EARN A HIGHER RATE</Text>
            <View style={s.th}>
              <Text style={{ width: '50%' }}>CLOSED REFERRALS</Text>
              <Text style={{ width: '50%' }}>YOUR RATE FROM THEN ON</Text>
            </View>
            {VOLUME_TIERS.map((t, i) => (
              <View key={t.label} style={i % 2 === 1 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
                <Text style={{ width: '50%', color: MUTED }}>
                  {t.threshold === 0 ? 'Your first 4' : `${t.threshold} or more`}
                </Text>
                <Text style={[{ width: '50%' }, s.bold]}>
                  {t.rate === null ? "Let's talk — custom tier" : pct(t.rate)}
                </Text>
              </View>
            ))}
            <Text style={[s.p, { marginTop: 5 }]}>
              A higher rate applies to the sales you close after you reach the tier.
            </Text>
          </View>

          {/* ── right: how it works ── */}
          <View style={s.colSide}>
            <Text style={s.h2}>HOW YOU GET PAID</Text>
            {[
              ['Commission clears', `${HOLD_PERIOD_DAYS} days after we're paid`],
              ['Payouts run', `Monthly, within ${PAYOUT_DAYS_AFTER_MONTH_END} days`],
              ['Minimum payout', usd(MINIMUM_PAYOUT_USD)],
              ['Paid by', PAYOUT_METHODS.join(', ')],
              ['Tax form needed', 'W-9 or W-8'],
            ].map(([k, v]) => (
              <View key={k} style={s.factRow} wrap={false}>
                <Text style={s.factK}>{k}</Text>
                <Text style={s.factV}>{v}</Text>
              </View>
            ))}
            <Text style={[s.p, { marginTop: 5 }]}>
              The {HOLD_PERIOD_DAYS}-day wait covers the refund window. Once it passes, the money is
              yours.
            </Text>

            <Text style={s.h2later}>WHAT COUNTS AS YOUR SALE</Text>
            <Text style={s.p}>
              A referral is yours when it comes through <Text style={s.bold}>your tracking link</Text>,
              the client <Text style={s.bold}>pays in full</Text>, and the payment isn&rsquo;t refunded
              or reversed during the hold period.
            </Text>
            <Text style={s.p}>
              Send us a name without the link and we may not be able to credit it — so lead with your
              link every time. Something look wrong on a statement? Tell us within{' '}
              {DISPUTE_WINDOW_DAYS} days and we&rsquo;ll sort it out.
            </Text>

            <View style={s.box}>
              <Text style={[s.h2, { marginBottom: 4 }]}>THE ONE RULE THAT TRIPS PEOPLE UP</Text>
              <Text style={[s.p, { marginBottom: 0 }]}>
                The FTC requires you to say you may earn a commission — every post, every email, every
                time. One clear line does it: &ldquo;I may earn a commission if you work with
                PodLab.&rdquo;
              </Text>
            </View>
          </View>
        </View>

        {/* ── bottom band ── */}
        <View style={{ flexDirection: 'row', gap: 18, marginTop: 10 }}>
          <View style={{ width: '58%' }}>
            <Text style={s.h2}>WHAT WE ASK OF YOU</Text>
            {[
              'Promote us honestly — no invented results, earnings claims, or guarantees.',
              'Use the assets and copy we give you, unchanged.',
              'No spam, and no bidding on the PodLab name in paid search.',
              'Keep what you learn about our pricing, clients, and process to yourself.',
              "Don't approach our clients or leads with competing services — during, and for 12 months after.",
            ].map((line, i) => (
              <Text key={i} style={s.bullet}>
                ·  {line}
              </Text>
            ))}
          </View>

          <View style={{ width: '42%' }}>
            <Text style={s.h2}>IF YOU WANT OUT</Text>
            <Text style={s.p}>
              Either of us can end this with{' '}
              <Text style={s.bold}>seven days&rsquo; written notice</Text>, no penalty. You still get
              paid on every referral that closed before you left, once it clears the hold period.
            </Text>
            {who.hasAddendum ? (
              <Text style={[s.p, { marginTop: 2 }]}>
                <Text style={s.bold}>Your agreement also has an Exhibit B</Text> covering the terms we
                agreed specifically with you. Those terms take precedence over anything on this page.
              </Text>
            ) : null}
            <Text style={[s.p, { marginTop: 2 }]}>
              Questions about a payout, a referral, or the agreement itself — just email{' '}
              <Text style={s.bold}>{COMPANY.email}</Text>.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

async function main() {
  const [briefPath, outDirArg] = process.argv.slice(2);
  const who: Personal = {};

  if (briefPath) {
    if (!fs.existsSync(briefPath)) {
      console.error(`error: brief not found: ${briefPath}`);
      process.exit(1);
    }
    const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
    who.name = [brief.firstName, brief.lastName].filter(Boolean).join(' ').trim() || undefined;
    who.beakerId = brief.beakerId;
    who.hasAddendum = Boolean(brief.addendum);
    who.partner = brief.partner;
  }

  const pdf = await renderToBuffer(<Sheet who={who} />);

  const outDir = outDirArg || process.cwd();
  fs.mkdirSync(outDir, { recursive: true });
  const base = who.beakerId
    ? `PodLab-Beaker-At-A-Glance-${who.beakerId}.pdf`
    : 'PodLab-Beaker-At-A-Glance.pdf';
  const outPath = path.join(outDir, base);
  fs.writeFileSync(outPath, pdf);

  console.log(JSON.stringify({ ok: true, path: outPath, bytes: pdf.length, personalised: Boolean(who.name) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
