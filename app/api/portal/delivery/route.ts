import { NextResponse } from 'next/server';
import { admin, resolveStaff, notifySlack } from '@/lib/portal-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = ['not started', 'in progress', 'blocked', 'done'];

/**
 * Staff-only. Updates a delivery phase or task, then tells Slack and the client's
 * CRM lead. Clients have no write path to these tables at all.
 */
export async function PATCH(req: Request) {
  const db = admin();
  const staff = await resolveStaff(req, db);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

  let payload: { kind?: 'phase' | 'task'; id?: string; status?: string; owner?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { kind = 'phase', id, status, owner } = payload;
  if (!id) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
  }

  const table = kind === 'task' ? 'portal_delivery_tasks' : 'portal_delivery_phases';
  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (status) patch.status = status;
  if (owner) patch.owner = owner;

  const { data, error } = await db
    .from(table)
    .update(patch)
    .eq('id', id)
    .select('id, title, status, client_id')
    .maybeSingle();

  if (error) {
    console.error('[portal] delivery update failed', error.message);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: client } = await db
    .from('portal_clients')
    .select('business_name, crm_lead_id')
    .eq('id', data.client_id)
    .maybeSingle();

  if (status === 'done' || status === 'blocked') {
    await notifySlack(
      `*Delivery ${status}* - ${client?.business_name ?? 'client'}\n${data.title} (by ${staff.name})`,
    );
    if (client?.crm_lead_id) {
      await db.schema('crm').from('activities').insert({
        lead_id: client.crm_lead_id,
        actor_name: `${staff.name} (portal)`,
        text: `Delivery phase "${data.title}" marked ${status}.`,
      });
    }
  }

  return NextResponse.json({ item: data });
}
