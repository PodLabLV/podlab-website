import { generateText, Output } from 'ai';
import { z } from 'zod';

interface DiagnosisInput {
  firstName: string;
  totalScore: number;
  zone: 'Red' | 'Yellow' | 'Green';
  categoryScores: Record<string, number>;
  answers: Record<string, number>;
  company?: string;
  weakestCategories: string[];
}

const DiagnosisSchema = z.object({
  diagnoses: z.array(
    z.object({
      category: z.string(),
      headline: z.string(),
      narrative: z.string(),
    })
  ),
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>['diagnoses'][number];

const QUESTION_CONTEXT: Record<string, string> = {
  q1: 'Hours/week on sales activities',
  q2: '% of deals that close without founder',
  q3: 'What happens if founder disappears 2 weeks',
  q4: 'Can team articulate competitive advantage without founder',
  q5: 'Last professional brand investment',
  q6: 'Competitors looking more professional',
  q7: 'Google results match current company',
  q8: 'Brand justifies premium pricing',
  q9: 'Where leads come from',
  q10: 'Frequency of strategic content publishing',
  q11: 'Marketing systems run without founder',
  q12: '% leads from non-referral sources',
  q13: 'Have video assets that pre-sell',
  q14: 'Sales process documented for new hires',
  q15: 'Average sales cycle length',
  q16: '% prospects who get it before the call',
  q17: 'Can describe ICP in 2 sentences',
  q18: 'Clear differentiator from competitors',
  q19: 'Documented brand positioning',
  q20: 'How often you revisit positioning',
};

function answerText(qId: string, points: number): string {
  const interpretations: Record<string, Record<number, string>> = {
    q1: { 5: 'less than 5 hrs/week', 4: '5-10 hrs/week', 2: '10-20 hrs/week', 1: '20+ hrs/week — nothing moves without them' },
    q2: { 5: '75-100% close without them', 4: '50-74% close without them', 2: '25-49% close without them', 1: 'less than 25% close without them — they\'re THE closer' },
    q3: { 5: 'business runs normally', 3: 'slows down but doesn\'t stop', 2: 'pipeline freezes', 1: 'they\'d lose active deals' },
    q4: { 5: 'team consistently delivers it', 3: 'team mostly delivers with variation', 2: 'inconsistent depending who they talk to', 1: 'only the founder can articulate it' },
    q5: { 5: 'within last 12 months', 4: '1-2 years ago', 2: '3-5 years ago', 1: '5+ years ago or never' },
    q6: { 5: 'never — they\'re the premium option', 4: 'rarely', 2: 'sometimes', 1: 'frequently — real objection' },
    q7: { 5: 'spot-on accurate', 3: 'mostly accurate', 2: 'outdated/unclear', 1: 'doesn\'t match actual value' },
    q8: { 5: 'brand is competitive advantage', 3: 'fine but not differentiator', 2: 'undersells them', 1: 'actively holding them back' },
    q9: { 5: 'automated systems', 4: 'mix of referrals and marketing', 2: 'mostly referrals', 1: 'personal outreach only' },
    q10: { 5: 'multiple times/week with system', 4: 'weekly or few times/month', 2: 'monthly or less', 1: 'rarely or never' },
    q11: { 5: 'systems, SOPs, team', 3: 'partial systems with oversight', 2: 'mostly ad-hoc', 1: 'only when founder does it' },
    q12: { 5: '75%+ non-referral', 4: '50-74% non-referral', 2: '25-49% non-referral', 1: 'less than 25% non-referral' },
    q13: { 5: '5+ strategic videos working', 3: '1-2 basic videos', 2: 'talked about it but haven\'t', 1: 'no — every prospect gets it live' },
    q14: { 5: 'fully documented SOPs', 3: 'partially documented', 2: 'mostly in founder\'s head', 1: 'pure tribal knowledge' },
    q15: { 5: 'less than 2 weeks', 4: '2-4 weeks', 2: '1-2 months', 1: '2+ months' },
    q16: { 5: '75%+ get it pre-call', 4: '50-74%', 2: '25-49%', 1: 'less than 25%' },
    q17: { 5: 'crystal clear', 3: 'pretty clear', 2: 'somewhat clear', 1: 'not clear' },
    q18: { 5: 'clear, defensible, proven', 3: 'different but hard to articulate', 2: 'similar to competitors', 1: 'compete on price/relationships' },
    q19: { 5: 'fully documented and used', 3: 'partially documented', 2: 'informal not written', 1: 'never formalized' },
    q20: { 5: 'quarterly+', 3: 'annually', 2: 'every few years', 1: 'set-and-forget' },
  };

  return interpretations[qId]?.[points] || `score ${points}/5`;
}

const CATEGORY_QUESTIONS: Record<string, string[]> = {
  'Founder Dependency': ['q1', 'q2', 'q3', 'q4'],
  'Brand & Perception': ['q5', 'q6', 'q7', 'q8'],
  'Marketing Systems': ['q9', 'q10', 'q11', 'q12'],
  'Sales Infrastructure': ['q13', 'q14', 'q15', 'q16'],
  'Strategic Clarity': ['q17', 'q18', 'q19', 'q20'],
};

function buildAnswerContext(category: string, answers: Record<string, number>): string {
  const qIds = CATEGORY_QUESTIONS[category] || [];
  return qIds
    .map((qId) => `- ${QUESTION_CONTEXT[qId]}: ${answerText(qId, answers[qId] || 0)}`)
    .join('\n');
}

export async function generateDiagnosis(input: DiagnosisInput): Promise<Diagnosis[] | null> {
  const { firstName, totalScore, zone, categoryScores, answers, company, weakestCategories } = input;

  const targets = weakestCategories.slice(0, 3);
  if (targets.length === 0) return null;

  const answerContextByCategory = targets
    .map(
      (cat) =>
        `### ${cat} (scored ${categoryScores[cat]}/20)\n${buildAnswerContext(cat, answers)}`
    )
    .join('\n\n');

  const systemPrompt = `You are a strategic advisor at PodLab, a content studio that helps $1M-$8M founders break free from founder-dependence through video assets and systems.

You're writing personalized diagnosis blocks for a founder who just took the Founder Bottleneck Assessment. For each category, write a SHORT diagnosis (2-3 sentences max) that:

1. References the founder's SPECIFIC answer patterns (not just the score)
2. Names what the bottleneck is actually costing them — concrete, not abstract
3. Speaks founder-to-founder. Direct, no fluff. No "I notice that..." or hedging.
4. Avoids generic advice. Be brutally specific to THEIR answers.

Voice: Hiram (the founder of PodLab) talking to a peer. Combat-vet directness, ROI-focused, zero hype. Not coachy, not motivational — diagnostic.

Constraints:
- Headline: 5-8 words, punchy, names the actual problem
- Narrative: 2-3 sentences, ~50-80 words. References specifics from their answers.
- NO emojis, NO em-dashes, NO "let me" / "I notice" / "it sounds like"
- NEVER make up details not in their answers`;

  const userPrompt = `Founder: ${firstName}${company ? ` (${company})` : ''}
Total Score: ${totalScore}/100 — ${zone} Zone

Their answers in their three weakest categories:

${answerContextByCategory}

Write a diagnosis for each of the ${targets.length} categories above. Return JSON matching the schema.`;

  try {
    const { output } = await generateText({
      model: 'anthropic/claude-haiku-4.5',
      output: Output.object({ schema: DiagnosisSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.4,
    });

    return output?.diagnoses ?? null;
  } catch (err) {
    console.error('Diagnosis generation failed:', err);
    return null;
  }
}
