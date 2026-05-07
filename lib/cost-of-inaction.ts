export interface CostBreakdownItem {
  category: string;
  cost: number;
  headline: string;
  reasoning: string;
}

export interface CostOfInaction {
  total: number;
  breakdown: CostBreakdownItem[];
  assumptions: { revenue: number; founderHourlyValue: number };
}

const DEFAULT_REVENUE = 3_000_000;
const FOUNDER_HOUR_DIVISOR = 2_000;

function pickFromBuckets<T>(score: number, buckets: { max: number; value: T }[]): T {
  for (const b of buckets) {
    if (score <= b.max) return b.value;
  }
  return buckets[buckets.length - 1].value;
}

export function calculateCostOfInaction(
  categoryScores: Record<string, number>,
  assumedRevenue: number = DEFAULT_REVENUE
): CostOfInaction {
  const founderHourlyValue = Math.round(assumedRevenue / FOUNDER_HOUR_DIVISOR);

  const founderDep = categoryScores['Founder Dependency'] || 0;
  const founderHours = pickFromBuckets(founderDep, [
    { max: 6, value: 22 },
    { max: 10, value: 15 },
    { max: 14, value: 10 },
    { max: 17, value: 5 },
    { max: 20, value: 2 },
  ]);
  const founderCost = founderHours * 48 * founderHourlyValue;

  const brand = categoryScores['Brand & Perception'] || 0;
  const underpricing = pickFromBuckets(brand, [
    { max: 6, value: 0.18 },
    { max: 10, value: 0.11 },
    { max: 14, value: 0.06 },
    { max: 17, value: 0.025 },
    { max: 20, value: 0 },
  ]);
  const brandCost = Math.round(assumedRevenue * underpricing);

  const marketing = categoryScores['Marketing Systems'] || 0;
  const pipelineGap = pickFromBuckets(marketing, [
    { max: 6, value: 0.22 },
    { max: 10, value: 0.13 },
    { max: 14, value: 0.07 },
    { max: 17, value: 0.025 },
    { max: 20, value: 0 },
  ]);
  const marketingCost = Math.round(assumedRevenue * pipelineGap);

  const sales = categoryScores['Sales Infrastructure'] || 0;
  const lostDeals = pickFromBuckets(sales, [
    { max: 6, value: 0.10 },
    { max: 10, value: 0.06 },
    { max: 14, value: 0.03 },
    { max: 17, value: 0.01 },
    { max: 20, value: 0 },
  ]);
  const salesCost = Math.round(assumedRevenue * lostDeals);

  const strategy = categoryScores['Strategic Clarity'] || 0;
  const wastedMarketing = pickFromBuckets(strategy, [
    { max: 6, value: 60_000 },
    { max: 10, value: 30_000 },
    { max: 14, value: 12_000 },
    { max: 17, value: 4_000 },
    { max: 20, value: 0 },
  ]);

  const breakdown: CostBreakdownItem[] = [
    {
      category: 'Founder Dependency',
      cost: founderCost,
      headline: `~${founderHours} hrs/week stuck in sales`,
      reasoning: `${founderHours} hours × 48 weeks × $${founderHourlyValue.toLocaleString()}/hr founder value = founder time burned on work a system could do.`,
    },
    {
      category: 'Brand & Perception',
      cost: brandCost,
      headline: `${Math.round(underpricing * 100)}% underpriced vs. premium peers`,
      reasoning: `When your brand undersells you, prospects benchmark you against the cheaper option in the bracket — not the premium one. ${Math.round(underpricing * 100)}% of revenue left on the table.`,
    },
    {
      category: 'Marketing Systems',
      cost: marketingCost,
      headline: `${Math.round(pipelineGap * 100)}% of pipeline never built`,
      reasoning: `Without a marketing system, growth caps at referrals. Real systems compound — this is the size of the channel you don't have yet.`,
    },
    {
      category: 'Sales Infrastructure',
      cost: salesCost,
      headline: `~${Math.round(lostDeals * 100)}% of deals stall or die`,
      reasoning: `Long sales cycles + no pre-sell assets = deals that sit in your pipeline and quietly walk away. This is the recoverable portion.`,
    },
    {
      category: 'Strategic Clarity',
      cost: wastedMarketing,
      headline: `~$${wastedMarketing.toLocaleString()}/yr in misaligned spend`,
      reasoning: `Without crystal-clear positioning, every dollar of marketing fights against fuzzy messaging. A meaningful slice of your spend never converts.`,
    },
  ];

  const total = breakdown.reduce((s, x) => s + x.cost, 0);

  return {
    total,
    breakdown,
    assumptions: { revenue: assumedRevenue, founderHourlyValue },
  };
}

export function formatMoneyShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
