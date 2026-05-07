import { generateText, Output } from 'ai';
import { z } from 'zod';

interface PageContent {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  ctaText: string | null;
  body: string;
}

interface PreviewInput {
  firstName: string;
  company?: string;
  pageContent: PageContent;
  categoryScores: Record<string, number>;
  zone: 'Red' | 'Yellow' | 'Green';
  weakestCategories: string[];
}

const PreviewSchema = z.object({
  icp: z.object({
    twoSentenceStatement: z.string(),
    revenueRange: z.string(),
    teamSize: z.string(),
    coreProblem: z.string(),
    desiredOutcome: z.string(),
  }),
  positioning: z.object({
    statement: z.string(),
    whyDifferent: z.string(),
    commodityTrap: z.string(),
  }),
  hooks: z
    .array(
      z.object({
        hook: z.string(),
        whyItWorks: z.string(),
      })
    )
    .min(4)
    .max(6),
  objections: z
    .array(
      z.object({
        objection: z.string(),
        response: z.string(),
      })
    )
    .min(2)
    .max(4),
});

export type DeliverablePreview = z.infer<typeof PreviewSchema>;

export async function generateDeliverablePreview(
  input: PreviewInput
): Promise<DeliverablePreview | null> {
  const { firstName, company, pageContent, categoryScores, zone, weakestCategories } = input;

  const systemPrompt = `You are a senior strategist at PodLab — a content studio that helps $1M-$8M founders break out of founder-dependence. You're writing a 30-second teaser of what AssetsLab would actually deliver to this prospect in their first week — built from reading their actual website.

The point: most consultants pitch with vague promises. You earn trust by showing 30 seconds of real work, named to their actual business, before they sign. The prospect should read this and think "they actually understand my business" — not "this is generic agency boilerplate."

Voice: Hiram (PodLab founder) — combat-vet direct, ROI-focused, no agency jargon, founder-to-founder.

Constraints — every output must:
- Reference SPECIFIC details from their website copy (their actual offering, language, audience). Never generic.
- Be written AS THE FINAL DELIVERABLE — not as advice. The ICP statement IS the ICP statement, ready to use. The hooks ARE the hooks, ready to post.
- Sound like a peer wrote it, not a template

ICP rules:
- "twoSentenceStatement": exactly the format "We serve [type of person] who [situation/problem]. They're typically [revenue/size/stage] and they need [specific outcome]."
- Be brutally specific. If their website implies they serve law firms, say law firms — not "professional services."

Positioning rules:
- "statement": 1 paragraph, ~3 sentences. Names what they do, who for, the specific transformation.
- "whyDifferent": 1-2 sentences naming a defensible differentiator from THEIR site, not invented
- "commodityTrap": 1 sentence on what they'd sound like if they fell into commodity positioning (so they can avoid it)

Hooks rules:
- 4-6 short hooks (each 5-12 words) ready to post on LinkedIn / X
- Each hook MUST be specific to their industry/audience — never generic
- "whyItWorks": 1 short sentence on the psychology/framework behind the hook

Objections rules:
- 2-4 actual objections this prospect's buyers say (inferred from their website, audience, price point)
- "response": 1-2 sentences. Direct. Reframes, doesn't defend.

NO emojis. NO em-dashes. NO "I notice that..." hedging. NO consultant-speak.`;

  const userPrompt = `Prospect: ${firstName}${company ? ` (${company})` : ''}
Score zone: ${zone}; weakest categories: ${weakestCategories.slice(0, 2).join(', ')}

Their website:
TITLE: ${pageContent.title || '(none)'}
META: ${pageContent.metaDescription || '(none)'}
H1: ${pageContent.h1 || '(none)'}
CTA: ${pageContent.ctaText || '(none)'}

BODY (first 4000 chars of their actual homepage copy):
${pageContent.body}

Build a 30-second AssetsLab deliverable preview. Read their site carefully. Reference their actual offering and audience. Return JSON matching the schema.`;

  try {
    const { output } = await generateText({
      model: 'anthropic/claude-haiku-4.5',
      output: Output.object({ schema: PreviewSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.4,
    });

    return output ?? null;
  } catch (err) {
    console.error('Deliverable preview generation failed:', err);
    return null;
  }
}
