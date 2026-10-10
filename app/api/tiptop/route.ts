import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { rateLimit } from '@/lib/api-utils';
import { QUESTIONS } from '@/lib/bottleneck/questions';

/**
 * TipTop's in-game reaction to a specific answer.
 *
 * Kept deliberately thin and fast: one short line, haiku, low token ceiling.
 * The game shows a static fallback the instant a question is answered and
 * swaps in this line when it lands, so latency here is cosmetic — never block
 * gameplay on it.
 */

const SYSTEM = `You are TipTop, the robot host of PodLab's "Founder Bottleneck" ring-toss game.

WHO YOU ARE
A playful shit-talker who is completely on the founder's side. Cornerman energy: cocky, competitive, funny, and always pushing them forward. You call the player "hotshot" occasionally — not every line.

THE ONE RULE
You trash-talk the BOTTLENECK, never the person. Their weak answer is the target, never their intelligence or worth. Every jab exists to make them want to fix it.

HOW YOU TALK
- One or two short sentences. Maximum 25 words. This is a quick beat between ring throws, not a lecture.
- Reference the SPECIFIC answer they just gave. Quote it or paraphrase it. Generic praise is forbidden.
- A strong answer (4-5 points) gets genuine respect, with an edge. Do not be sarcastic about a good answer.
- A weak answer (1-2 points) gets ribbed, then reframed as fixable. Never leave them on a low note.
- No emojis. No hashtags. No corporate softening. No "great question." No exclamation-mark spam.
- Never mention points, scores, or category names. The player should not feel graded mid-game.`;

export async function POST(request: NextRequest) {
  const { limited } = rateLimit(request, { maxRequests: 40, windowMs: 60_000 });
  if (limited) {
    return NextResponse.json({ line: null }, { status: 429 });
  }

  try {
    const body = await request.json();
    const questionId = Number(body?.questionId);
    const points = Number(body?.points);

    const question = QUESTIONS.find((q) => q.id === questionId);
    const option = question?.options.find((o) => o.points === points);

    if (!question || !option) {
      return NextResponse.json({ line: null }, { status: 400 });
    }

    const strength =
      points >= 4 ? 'STRONG — respect it' : points === 3 ? 'MIDDLING — push for better' : 'WEAK — rib it, then reframe';

    const { text } = await generateText({
      model: 'anthropic/claude-haiku-4.5',
      system: SYSTEM,
      prompt: `Question asked: "${question.text}"
They answered: "${option.text}"
Answer strength: ${strength}

Give your one-line reaction. Nothing else — no quotes around it, no preamble.`,
      temperature: 0.9,
      maxOutputTokens: 80,
    });

    const line = text.trim().replace(/^["']|["']$/g, '');
    return NextResponse.json({ line: line || null });
  } catch (err) {
    console.error('TipTop line generation failed:', err);
    // The game has a static fallback — a failure here is silent by design.
    return NextResponse.json({ line: null }, { status: 200 });
  }
}
