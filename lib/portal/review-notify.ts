import type { SupabaseClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/alerts';
import { notify, resolve } from '@/lib/portal/notify';
import { REVIEW_PREFIX, reviewRef, type ProjectItem } from '@/lib/portal/projects';

/**
 * 'waiting' notifications for things ready for the client's review.
 *
 * Written two ways, both keyed by the same refs (lib/portal/projects.ts
 * reviewRef), so they never double up:
 *   - the moment it happens: publishing a script or deliverable version calls
 *     scriptReady / assetReady; approving or sending notes calls the resolver.
 *   - a sync from the Projects list (syncReviewWaiting): catches what has no
 *     hook here, chiefly CRM cards reaching "Pending Client Approval" in the
 *     CRM, and closes rows whose item no longer needs the client.
 */

export async function scriptReady(clientId: string, s: { id: string; title: string }, version: number): Promise<void> {
  await notify(clientId, {
    kind: 'review_ready',
    direction: 'waiting',
    title: `Script ready for your review: ${s.title}`,
    body: version > 1 ? `Version ${version} is up. Read it, leave notes on any line, or approve it.` : 'Read it, leave notes on any line, or approve it.',
    link: `/portal/scripts/${s.id}`,
    ref: reviewRef.script(s.id, version),
  });
}

export async function assetReady(clientId: string, a: { id: string; title: string }, version: number): Promise<void> {
  await notify(clientId, {
    kind: 'review_ready',
    direction: 'waiting',
    title: `Ready for your review: ${a.title}`,
    body: version > 1 ? `Version ${version} is up. Approve it, or send notes.` : 'Approve it, or send notes.',
    link: `/portal/deliverables?item=${a.id}`,
    ref: reviewRef.asset(a.id, version),
  });
}

export const scriptReviewed = (clientId: string, scriptId: string, version: number) => resolve(clientId, reviewRef.script(scriptId, version));
export const assetReviewed = (clientId: string, assetId: string, version: number) => resolve(clientId, reviewRef.asset(assetId, version));

/** The client watched a cut and answered (notes or Looks good): close its open review rows, whatever the cut stamp. */
export async function cardReviewed(db: SupabaseClient, clientId: string, cardId: string): Promise<void> {
  const { error } = await db
    .from('portal_notifications')
    .update({ resolved_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .like('ref', `review:card:${cardId}:%`)
    .is('resolved_at', null);
  if (error) reportError('[portal] card review resolve failed', error.message);
}

/**
 * Make the open review rows match the list: one 'waiting' row per item that
 * needs the client, and every other open "review:" row resolved. Best effort.
 */
export async function syncReviewWaiting(db: SupabaseClient, clientId: string, items: ProjectItem[]): Promise<void> {
  try {
    const want = items.filter((i) => i.state === 'needs_you' && i.waitingRef);
    const { data: open, error } = await db
      .from('portal_notifications')
      .select('ref')
      .eq('client_id', clientId)
      .eq('direction', 'waiting')
      .is('resolved_at', null)
      .like('ref', `${REVIEW_PREFIX}%`);
    if (error) {
      reportError('[portal] review sync read failed', error.message);
      return;
    }
    const openRefs = new Set((open ?? []).map((r: { ref: string }) => r.ref));
    const wantRefs = new Set(want.map((i) => i.waitingRef!));
    const stale = [...openRefs].filter((r) => !wantRefs.has(r));
    if (stale.length) {
      const { error: rErr } = await db
        .from('portal_notifications')
        .update({ resolved_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .in('ref', stale)
        .is('resolved_at', null);
      if (rErr) reportError('[portal] review sync resolve failed', rErr.message);
    }
    for (const i of want) {
      if (openRefs.has(i.waitingRef!)) continue;
      await notify(clientId, {
        kind: 'review_ready',
        direction: 'waiting',
        title: i.kind === 'video' ? `Cut ready to watch: ${i.title}` : `Ready for your review: ${i.title}`,
        body: i.kind === 'video' ? 'Watch it, leave notes at the second something should change, or hit Looks good.' : undefined,
        link: i.href ?? '/portal/projects',
        ref: i.waitingRef,
      });
    }
  } catch (err) {
    reportError('[portal] review sync threw', err);
  }
}
