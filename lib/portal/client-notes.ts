import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalCaller } from '@/lib/portal-server';
import { reportError } from '@/lib/alerts';

/**
 * Script and file notes a client sends, copied into the CRM
 * (crm.client_portal_notes, podlab-crm phase116) so editors see them in the
 * Content Tracker's "Client notes" panel on that client's boards. Video notes
 * don't come here: they land on the editor's card already. Best effort: a
 * failure is reported, never blocks the client's send.
 */
export async function notesToCrm(
  db: SupabaseClient,
  caller: PortalCaller,
  item: { kind: 'script' | 'file'; subject: string; url: string },
  notes: Array<{ quoted?: string | null; body: string }>,
): Promise<void> {
  if (!notes.length) return;
  const rows = notes.map((n) => ({
    portal_client_id: caller.clientId,
    lead_id: caller.crmLeadId,
    business_name: caller.businessName,
    kind: item.kind,
    subject: item.subject.slice(0, 200),
    quoted: n.quoted ? n.quoted.slice(0, 300) : null,
    body: n.body.slice(0, 4000),
    author: caller.displayName,
    portal_url: item.url,
  }));
  const { error } = await db.schema('crm').from('client_portal_notes').insert(rows);
  // Before podlab-crm phase116 runs, the table doesn't exist: say so once, don't fail.
  if (error) reportError('[portal] client notes to CRM failed', error.message);
}
