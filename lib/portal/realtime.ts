'use client';

/**
 * Portal realtime bus — the browser half of 20260831c_portal_realtime.sql.
 *
 * One private channel per client, `portal:<client_id>`. Every client-scoped
 * table broadcasts onto it from a database trigger; this hook subscribes once
 * and hands each change to a listener keyed by table name.
 *
 * Broadcast, not postgres_changes: Postgres Changes needs less setup but does
 * not scale, and it cannot express "this row is internal, do not send it."
 * The database decides what goes on the wire.
 */

import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

export type PortalChangeOp = 'INSERT' | 'UPDATE' | 'DELETE';

export interface PortalChange {
  op: PortalChangeOp;
  /** Table the change came from, without the portal_ prefix. */
  table: string;
  record: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

/** Shape realtime.broadcast_changes() puts on the wire. */
interface BroadcastPayload {
  event?: string;
  operation?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
  payload?: {
    operation?: string;
    table?: string;
    record?: Record<string, unknown> | null;
    old_record?: Record<string, unknown> | null;
  };
}

function normalise(raw: BroadcastPayload): PortalChange | null {
  // Depending on Realtime version the fields arrive either at the top level or
  // nested under `payload`. Accept both rather than betting on one.
  const body = raw.payload ?? raw;
  const op = (body.operation ?? raw.event ?? '').toUpperCase();
  if (op !== 'INSERT' && op !== 'UPDATE' && op !== 'DELETE') return null;

  const table = (body.table ?? '').replace(/^portal_/, '');
  if (!table) return null;

  return {
    op,
    table,
    record: body.record ?? null,
    old: body.old_record ?? null,
  };
}

/**
 * Subscribe to a client's channel for the life of the component.
 *
 * The handler is held in a ref so a caller can pass an inline arrow without
 * tearing down and rebuilding the websocket on every render.
 */
export function usePortalRealtime(
  clientId: string | null | undefined,
  onChange: (change: PortalChange) => void,
): void {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    if (!clientId) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function subscribe() {
      const db = getSupabaseBrowser();

      // Required for private channels: hands Realtime the caller's JWT so the
      // policy on realtime.messages can check membership.
      await db.realtime.setAuth();
      if (cancelled) return;

      const relay = (raw: unknown) => {
        const change = normalise(raw as BroadcastPayload);
        if (change) handler.current(change);
      };

      channel = db
        .channel(`portal:${clientId}`, { config: { private: true } })
        .on('broadcast', { event: 'INSERT' }, relay)
        .on('broadcast', { event: 'UPDATE' }, relay)
        .on('broadcast', { event: 'DELETE' }, relay)
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Not fatal: the portal still renders its last fetch. Live updates
            // stop, a refresh recovers. Never surface this to the client.
            console.error('[portal] realtime channel', status);
          }
        });
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channel) getSupabaseBrowser().removeChannel(channel);
    };
  }, [clientId]);
}
