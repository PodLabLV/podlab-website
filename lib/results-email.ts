/**
 * Builds a branded HTML email with the customer's assessment results.
 */

interface ResultsEmailParams {
  firstName: string
  totalScore: number
  zone: 'Red' | 'Yellow' | 'Green'
  categoryScores: Record<string, number>
  quickWins: { category: string; action: string }[]
  recommendedLabs: { name: string; price: string }[]
  assessmentId: string
  siteUrl: string
}

export function buildResultsEmailHtml(params: ResultsEmailParams): string {
  const {
    firstName,
    totalScore,
    zone,
    categoryScores,
    quickWins,
    recommendedLabs,
    assessmentId,
    siteUrl,
  } = params

  const zoneColor =
    zone === 'Red' ? '#FF4444' : zone === 'Yellow' ? '#FFB800' : '#2ADD1B'
  const zoneLabel =
    zone === 'Red'
      ? 'Founder-Dependent'
      : zone === 'Yellow'
        ? 'Building Momentum'
        : 'Scaling Smart'

  const categoryRows = Object.entries(categoryScores)
    .map(([cat, score]) => {
      const pct = Math.round((score / 20) * 100)
      const catColor =
        score <= 9 ? '#FF4444' : score <= 14 ? '#FFB800' : '#2ADD1B'
      return `
      <tr>
        <td style="padding:10px 0;color:#c0c0c0;font-size:14px;">${cat}</td>
        <td style="padding:10px 0;text-align:right;color:${catColor};font-weight:700;font-size:14px;">${score}/20</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0 0 8px;">
          <div style="background:#1a1a1a;border-radius:4px;height:8px;overflow:hidden;">
            <div style="background:${catColor};height:100%;width:${pct}%;border-radius:4px;"></div>
          </div>
        </td>
      </tr>`
    })
    .join('')

  const quickWinRows = quickWins
    .map(
      (w) => `
      <tr>
        <td style="padding:8px 0;color:#c0c0c0;font-size:14px;">
          <span style="color:#2ADD1B;margin-right:8px;">→</span>
          <strong style="color:#fafafa;">${w.category}:</strong> ${w.action}
        </td>
      </tr>`
    )
    .join('')

  const labRows = recommendedLabs
    .map(
      (lab) => `
      <tr>
        <td style="padding:8px 16px;color:#fafafa;font-size:14px;font-weight:600;">${lab.name}</td>
        <td style="padding:8px 16px;color:#2ADD1B;font-size:14px;font-weight:700;text-align:right;">${lab.price}</td>
      </tr>`
    )
    .join('')

  const resultsUrl = `${siteUrl}/assessment/results/${assessmentId}`
  const calendlyUrl = 'https://calendly.com/podlablv/strategy-call'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="text-align:center;padding:24px 0;">
      <h1 style="margin:0;color:#2ADD1B;font-size:14px;text-transform:uppercase;letter-spacing:3px;">PodLab</h1>
    </div>

    <!-- Score Card -->
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Your Bottleneck Score</p>
      <div style="font-size:72px;font-weight:900;color:${zoneColor};line-height:1;margin:16px 0;">${totalScore}</div>
      <p style="margin:0 0 16px;color:#888;font-size:14px;">out of 100</p>
      <div style="display:inline-block;padding:8px 24px;border-radius:8px;border:2px solid ${zoneColor};background:${zoneColor}15;">
        <span style="color:${zoneColor};font-weight:700;font-size:16px;">${zoneLabel}</span>
        <span style="color:#888;font-size:14px;"> — ${zone} Zone</span>
      </div>
    </div>

    <!-- Greeting -->
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="margin:0;color:#fafafa;font-size:16px;">Hey ${firstName},</p>
      <p style="margin:12px 0 0;color:#c0c0c0;font-size:14px;line-height:1.6;">
        Thanks for completing the Founder Bottleneck Assessment. Here's your full breakdown — keep this email as a reference.
      </p>
    </div>

    <!-- Category Breakdown -->
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:24px;margin-bottom:24px;">
      <h2 style="margin:0 0 16px;color:#fafafa;font-size:16px;text-transform:uppercase;letter-spacing:1px;">Category Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${categoryRows}
      </table>
    </div>

    <!-- Quick Wins -->
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:24px;margin-bottom:24px;">
      <h2 style="margin:0 0 16px;color:#fafafa;font-size:16px;text-transform:uppercase;letter-spacing:1px;">🎯 Quick Wins</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${quickWinRows}
      </table>
    </div>

    <!-- Recommended Labs -->
    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:24px;margin-bottom:24px;">
      <h2 style="margin:0 0 16px;color:#fafafa;font-size:16px;text-transform:uppercase;letter-spacing:1px;">🧪 Recommended Labs</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${labRows}
      </table>
    </div>

    <!-- CTAs -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${resultsUrl}" style="display:inline-block;padding:16px 32px;background:#2ADD1B;color:#000;font-weight:800;font-size:16px;text-decoration:none;border-radius:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">View Full Results</a>
      <br/><br/>
      <a href="${calendlyUrl}" style="display:inline-block;padding:14px 28px;background:transparent;color:#2ADD1B;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;border:2px solid #2ADD1B;text-transform:uppercase;letter-spacing:1px;">Book a Strategy Call →</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px;color:#666;font-size:12px;">
      <p style="margin:0;">PodLab LV · Las Vegas, NV</p>
      <p style="margin:4px 0 0;"><a href="https://podlablv.com" style="color:#2ADD1B;text-decoration:none;">podlablv.com</a></p>
    </div>
  </div>
</body>
</html>`
}
