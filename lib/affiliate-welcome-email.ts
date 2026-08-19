/**
 * The email an affiliate gets the moment they sign.
 *
 * Two jobs, in this order: deliver a retainable copy of the executed contract
 * (the ESIGN retention requirement — the PDF rides along as an attachment),
 * and put their commission numbers and tracking link in front of them while
 * they still have momentum.
 */

import {
  BASE_RATE,
  COMPANY,
  HOLD_PERIOD_DAYS,
  LAB_COMMISSIONS,
  MINIMUM_PAYOUT_USD,
  PAYOUT_DAYS_AFTER_MONTH_END,
  VOLUME_TIERS,
  commissionFor,
  firstSaleFor,
  pct,
  usd,
} from './affiliate-terms';

const GREEN = '#2ADD1B';
const INK = '#111111';
const MUTED = '#6A6A6A';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface WelcomeEmailInput {
  firstName: string;
  beakerId: string;
  homepageLink: string;
  payoutMethod: string;
  effectiveDate: string;
}

export function buildAffiliateWelcomeEmail(input: WelcomeEmailInput): string {
  const rows = LAB_COMMISSIONS.map(
    (lab, i) => `
      <tr style="background:${i % 2 ? '#FAFAFA' : '#FFFFFF'}">
        <td style="padding:9px 12px;border-bottom:1px solid #EAEAEA;font-weight:700;color:${INK}">${esc(lab.lab)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #EAEAEA;color:${MUTED}">${esc(lab.price)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #EAEAEA;color:${INK}">${esc(commissionFor(lab, BASE_RATE))}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #EAEAEA;color:${INK};font-weight:700">${esc(firstSaleFor(lab, BASE_RATE))}</td>
      </tr>`,
  ).join('');

  const tiers = VOLUME_TIERS.filter((t) => t.threshold > 0)
    .map(
      (t) =>
        `<li style="margin-bottom:4px"><strong>${t.threshold}+ Qualified Sales</strong> — ${
          t.rate === null ? 'custom partnership tier' : `commission bumps to ${pct(t.rate)}`
        }</li>`,
    )
    .join('');

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F4F4F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFFFF;border-radius:14px;overflow:hidden">

        <tr><td style="background:${INK};padding:26px 30px">
          <div style="color:#FFFFFF;font-size:19px;font-weight:800;letter-spacing:0.4px">PodLab Beaker</div>
          <div style="color:${GREEN};font-size:12px;margin-top:4px;letter-spacing:0.6px">AFFILIATE AGREEMENT — EXECUTED</div>
        </td></tr>

        <tr><td style="padding:28px 30px 6px">
          <p style="margin:0 0 14px;font-size:15px">Welcome in, ${esc(input.firstName)}.</p>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#333">
            Your affiliate agreement is signed and on file as of ${esc(input.effectiveDate)}.
            <strong>Your executed copy is attached to this email as a PDF</strong> — save it somewhere you'll find it again.
          </p>
          <table role="presentation" width="100%" style="background:#F7F7F7;border-left:3px solid ${GREEN};border-radius:6px;margin:18px 0">
            <tr><td style="padding:14px 16px">
              <div style="font-size:11px;color:${MUTED};letter-spacing:0.6px">YOUR BEAKER ID</div>
              <div style="font-size:17px;font-weight:800;font-family:ui-monospace,Menlo,monospace;color:${INK};margin-top:3px">${esc(input.beakerId)}</div>
              <div style="font-size:12px;color:${MUTED};margin-top:9px">Every sale is attributed through this ID. Your link:</div>
              <div style="font-size:12px;margin-top:3px"><a href="${esc(input.homepageLink)}" style="color:#0B7A00;word-break:break-all">${esc(input.homepageLink)}</a></div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:6px 30px 0">
          <div style="font-size:13px;font-weight:800;letter-spacing:0.4px;margin-bottom:10px">WHAT YOU EARN</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12.5px">
            <thead><tr style="background:${INK};color:#FFFFFF">
              <th align="left" style="padding:9px 12px;font-size:11px;letter-spacing:0.4px">OFFERING</th>
              <th align="left" style="padding:9px 12px;font-size:11px;letter-spacing:0.4px">PRICE</th>
              <th align="left" style="padding:9px 12px;font-size:11px;letter-spacing:0.4px">YOU EARN</th>
              <th align="left" style="padding:9px 12px;font-size:11px;letter-spacing:0.4px">FIRST SALE</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin:14px 0 0;font-size:12.5px;color:${MUTED};line-height:1.6">
            Your first Qualified Sale pays double. ExpansionLab pays every month the client stays active.
          </p>
        </td></tr>

        <tr><td style="padding:22px 30px 0">
          <div style="font-size:13px;font-weight:800;letter-spacing:0.4px;margin-bottom:8px">VOLUME TIERS</div>
          <ul style="margin:0;padding-left:20px;font-size:13px;line-height:1.6;color:#333">${tiers}</ul>
        </td></tr>

        <tr><td style="padding:22px 30px 0">
          <div style="font-size:13px;font-weight:800;letter-spacing:0.4px;margin-bottom:8px">HOW YOU GET PAID</div>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#333">
            Commissions clear ${HOLD_PERIOD_DAYS} days after PodLab receives payment, then pay out within
            ${PAYOUT_DAYS_AFTER_MONTH_END} days of month end via <strong>${esc(input.payoutMethod)}</strong>,
            once your balance reaches ${usd(MINIMUM_PAYOUT_USD)}.
          </p>
        </td></tr>

        <tr><td style="padding:26px 30px 30px">
          <a href="https://podlablv.com/affiliate/dashboard" style="display:inline-block;background:${GREEN};color:${INK};font-weight:800;font-size:14px;text-decoration:none;padding:13px 26px;border-radius:9px">Open Your Beaker Dashboard</a>
          <p style="margin:18px 0 0;font-size:12px;color:${MUTED};line-height:1.6">
            Questions about your agreement or a payout? Reply here or write ${COMPANY.email}.
            You can request a free paper copy of your agreement at the same address.
          </p>
        </td></tr>

        <tr><td style="background:#FAFAFA;padding:16px 30px;border-top:1px solid #EAEAEA">
          <p style="margin:0;font-size:11px;color:${MUTED};line-height:1.6">
            ${COMPANY.legalName} · ${COMPANY.address}<br/>
            This message confirms an agreement you signed electronically. Keep the attached PDF for your records.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}
