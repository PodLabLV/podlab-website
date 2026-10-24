import { reportError } from '@/lib/alerts';
import { NextResponse } from 'next/server';
import { admin, resolveStaff } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface StaffClientRow {
  id: string;
  businessName: string;
  name: string;
  email: string;
  planLabel: string | null;
  /** none: no login yet · invited: link sent, never signed in · active: has signed in */
  access: 'none' | 'invited' | 'active';
  invitedAt: string | null;
  invitedBy: string | null;
  lastSignInAt: string | null;
  driveFolderUrl: string | null;
  /** Scripts + deliverables the automation published that are waiting on Hiram. */
  heldCount: number;
}

/** GET — staff only. Every portal client with their login status. */
export async function GET(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  // '*' rather than a column list: invited_* only exist once 20261008d has run.
  const rows = await db.from('portal_clients').select('*').order('business_name');
  if (rows.error) {
    reportError('[portal] staff client list failed', rows.error.message);
    return NextResponse.json({ error: 'Could not load clients.' }, { status: 500 });
  }

  // One pass over the (partial-indexed) held rows. Before 20261024 runs this errors; count 0.
  const heldBy = new Map<string, number>();
  const [hs, ha] = await Promise.all([
    db.from('portal_scripts').select('client_id').not('held_for', 'is', null),
    db.from('portal_assets').select('client_id').not('held_for', 'is', null),
  ]);
  for (const r of [...(hs.data ?? []), ...(ha.data ?? [])] as Array<{ client_id: string }>) {
    heldBy.set(r.client_id, (heldBy.get(r.client_id) ?? 0) + 1);
  }

  const clients: StaffClientRow[] = await Promise.all(
    (rows.data ?? []).map(async (c: Record<string, string | null>) => {
      let lastSignInAt: string | null = null;
      if (c.user_id) {
        const { data } = await db.auth.admin.getUserById(c.user_id);
        lastSignInAt = data?.user?.last_sign_in_at ?? null;
      }
      return {
        id: c.id!,
        businessName: c.business_name ?? '',
        name: [c.first_name, c.last_name].filter(Boolean).join(' '),
        email: c.email ?? '',
        planLabel: c.plan_label,
        access: lastSignInAt ? 'active' : c.user_id ? 'invited' : 'none',
        invitedAt: c.invited_at ?? null,
        invitedBy: c.invited_by ?? null,
        lastSignInAt,
        driveFolderUrl: c.drive_folder_url ?? null,
        heldCount: heldBy.get(c.id!) ?? 0,
      };
    }),
  );

  return NextResponse.json({ clients });
}
