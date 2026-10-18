import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';
import { resolveBeaker } from '@/lib/portal/beaker-account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — what the signed-in user is, for the shell: PodLab staff (portal_staff)
 * decides which staff tools render; beaker (an approved crm.affiliates match)
 * adds the Beaker tab. Display only: every route re-checks server-side.
 */
export async function GET(req: Request) {
  const db = admin();
  const [staff, beaker] = await Promise.all([resolveStaff(req, db), resolveBeaker(req, db).catch(() => null)]);
  return NextResponse.json({ staff: Boolean(staff), beaker: Boolean(beaker) }, { headers: { 'Cache-Control': 'no-store' } });
}
