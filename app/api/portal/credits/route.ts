import { NextResponse } from 'next/server';
import { admin, resolveCaller } from '@/lib/portal-server';
import { loadWallet } from '@/lib/portal/wallet-server';
import { EDIT_TYPES, EXTRA_ROUND_CREDITS, RUSH_CREDITS } from '@/lib/portal/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — the caller's credit wallet: balance, next expiry, history, the packs
 * with their Whop checkout links (null until set up), and what each edit costs.
 * For the Dashboard's balance tile and the Profile's credits page; Projects
 * gets the same wallet from /api/portal/projects.
 */
export async function GET(req: Request) {
  const db = admin();
  const caller = await resolveCaller(req, db);
  if (!caller) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  const wallet = await loadWallet(db, caller.clientId);
  return NextResponse.json({ wallet, editTypes: EDIT_TYPES, rushCredits: RUSH_CREDITS, extraRoundCredits: EXTRA_ROUND_CREDITS });
}
