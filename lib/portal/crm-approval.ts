import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';

/**
 * Portal approvals → the CRM card.
 *
 * The CRM's seat check asks "are the scripts approved?" 48 hours before the
 * shoot, and until now the only answer was a box someone ticked by hand. When
 * a client's approval leaves every script they can see approved (or already
 * shot), this stamps scripts_approved_at on their CRM card and moves a card
 * that is still waiting on scripts to S5-APPROVED. Forward only: it never
 * clears a stamp or pulls a card back.
 */

const DONE = new Set(['approved', 'shot', 'published']);
// Stages where the card is still waiting on script approval.
const WAITING = ['S2-BOOKED', 'S3-RESEARCH', 'S4-SCRIPTS'];

/** True when the client has at least one visible script and none still need them. */
export function allApproved(statuses: Array<string | null>): boolean {
  const visible = statuses.map((s) => (s || 'draft').toLowerCase()).filter((s) => s !== 'draft');
  return visible.length > 0 && visible.every((s) => DONE.has(s));
}

export async function stampCrmIfAllApproved(
  db: SupabaseClient,
  clientId: string,
  crmLeadId: string | null,
): Promise<'stamped' | 'waiting' | 'no-lead' | 'error'> {
  if (!crmLeadId) return 'no-lead';
  try {
    const { data: scripts, error } = await db.from('portal_scripts').select('status').eq('client_id', clientId).is('held_for', null);
    if (error) throw new Error(error.message);
    if (!allApproved((scripts ?? []).map((s) => s.status as string | null))) return 'waiting';

    const now = new Date().toISOString();
    const crm = db.schema('crm');
    // Stamp once; a later approval doesn't move the date.
    const { error: e1 } = await crm
      .from('leads')
      .update({ scripts_approved_at: now, updated_at: now })
      .eq('id', crmLeadId)
      .eq('pipeline', 'vsl')
      .is('scripts_approved_at', null);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await crm
      .from('leads')
      .update({ stage: 'S5-APPROVED', updated_at: now })
      .eq('id', crmLeadId)
      .eq('pipeline', 'vsl')
      .in('stage', WAITING);
    if (e2) throw new Error(e2.message);
    return 'stamped';
  } catch (err) {
    reportError('[portal] crm approval stamp failed', err);
    return 'error';
  }
}
