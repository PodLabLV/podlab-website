import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — whether the signed-in user is PodLab staff (portal_staff). Decides which staff tools render; every staff route re-checks. */
export async function GET(req: Request) {
  const staff = await resolveStaff(req, admin());
  return NextResponse.json({ staff: Boolean(staff) });
}
