import { generateText, Output } from 'ai';
import { z } from 'zod';

interface PageContent {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  ctaText: string | null;
  body: string;
}

interface AnalyzeInput {
  url: string;
  pageContent: PageContent;
  rulesGrade: string;
  rulesScore: number;
  firstName?: string;
  zone: 'Red' | 'Yellow' | 'Green';
  weakestCategories: string[];
}

const AnalysisSchema = z.object({
  positioningClarity: z.number().min(1).max(10),
  premiumness: z.number().min(1).max(10),
  targetMarketFit: z.number().min(1).max(10),
  heroVerdict: z.string(),
  fixes: z
    .array(
      z.object({
        priority: z.number().min(1).max(5),
        title: z.string(),
        observation: z.string(),
        fix: z.string(),
      })
    )
    .min(2)
    .max(4),
  premiumPriceCeiling: z.string(),
});

export type WebsiteAiAnalysis = z.infer<typeof AnalysisSchema>;

export async function analyzeWebsiteWithAI(input: AnalyzeInput): Promise<WebsiteAiAnalysis | null> {
  const { url, pageContent, rulesGrade, rulesScore, firstName, zone, weakestCategories } = input;

  const systemPrompt = `You are a senior brand and conversion strategist at PodLab — a content studio that helps $1M-$8M founders break out of founder-dependence. You're auditing this prospect's website to brief them honestly on what their site is silently costing them.

Your audience: founders who already know their site has issues but haven't been told specifically why or what to fix. They're tired of generic agency advice. They want a peer-to-peer read with specific, actionable observations.

Voice: Hiram (PodLab founder) — combat-vet direct, ROI-focused, zero hype, founder-to-founder. Not coachy. Not motivational. Diagnostic.

For each numerical score (1-10):
- positioningClarity: Does a $1M-$8M-revenue prospect know in 5 seconds who this is for and what they do? 1=incomprehensible, 10=immediately obvious
- premiumness: Does the brand justify premium pricing or look like a commodity? 1=visibly cheap/dated, 10=premium positioning
- targetMarketFit: Does this site speak to enterprise/$5M+ buyers or to small/SMB? 1=clearly targeting wrong segment, 10=dialed in for the bracket

Rules for fixes:
- Each fix MUST reference SPECIFIC content from their actual site (their headline, their CTA, their copy patterns) — never generic advice
- "title" = 4-7 words, names the actual problem
- "observation" = 1-2 sentences. What you saw on their site, quoted or paraphrased.
- "fix" = 1-2 sentences. The specific change to make. NO consulting jargon.

Constraints:
- 2-4 fixes total, ranked by priority (1 = ship today)
- premiumPriceCeiling: 1 short sentence on what their current site visually limits them to charging (e.g., "Your site looks like it caps you at $5K-$15K projects, not $50K+ engagements.")
- heroVerdict: 1-2 sentences on what their hero communicates RIGHT NOW (not what it should). Be specific.
- NO emojis, NO em-dashes, NO "I notice that..." hedging
- NEVER invent details not in the page content`;

  const userPrompt = `Auditing: ${url}
${firstName ? `For: ${firstName} ` : ''}(Bottleneck Score Zone: ${zone}; weakest categories: ${weakestCategories.slice(0, 2).join(', ')})

Rules-based audit landed at ${rulesGrade} (${rulesScore}/100).

Their actual page content:
TITLE: ${pageContent.title || '(none)'}
META: ${pageContent.metaDescription || '(none)'}
H1: ${pageContent.h1 || '(none)'}
CTA TEXT: ${pageContent.ctaText || '(none)'}

BODY (first 4000 chars):
${pageContent.body}

Audit this site and return JSON matching the schema.`;

  try {
    const { output } = await generateText({
      model: 'anthropic/claude-haiku-4.5',
      output: Output.object({ schema: AnalysisSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });

    return output ?? null;
  } catch (err) {
    console.error('Website AI analysis failed:', err);
    return null;
  }
}
