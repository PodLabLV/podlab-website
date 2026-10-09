import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { admin, notifySlack, resolveStaff } from '@/lib/portal-server';
import { SITE_URL } from '@/lib/portal-email';
import { allPotatoes } from '@/lib/portal/potato-server';
import { scoreboard } from '@/lib/portal/potato';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Morning Hot Potato scoreboard in Slack (vercel.json cron, 15:05 UTC).
 * GET with `Authorization: Bearer $CRON_SECRET` posts it. GET ?dry=1 with a
 * staff session returns the text without posting.
 */
function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const db = admin();
  if (dry) {
    if (!(await resolveStaff(req, db))) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  } else if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const all = await allPotatoes(db);
  const text = scoreboard(all, SITE_URL);
  if (!dry) await notifySlack(text);
  return NextResponse.json({ posted: !dry, potatoes: all.length, text });
}
