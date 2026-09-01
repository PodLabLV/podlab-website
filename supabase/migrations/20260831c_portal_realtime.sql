-- ============================================================
-- Portal Phase 0a — the realtime bus
--
-- Broadcast from the database, NOT postgres_changes. Postgres Changes needs
-- less setup but does not scale; Supabase's current guidance is a trigger
-- calling realtime.broadcast_changes() on a private channel.
--
-- One channel per client: portal:<client_id>. Every client-scoped portal table
-- broadcasts onto it. The browser subscribes once and every module hook filters
-- the stream by table name.
--
-- Run AFTER 20260831_portal_roles.sql (the policy below reads
-- portal_client_users) and 20260831b_portal_events.sql.
-- ============================================================

-- ── 1. Generic broadcaster ───────────────────────────────────────────
-- Attach to any portal table that has a client_id column.
--
-- DELETE and INSERT are branched explicitly rather than folded into a CASE:
-- on DELETE the NEW record is unassigned and touching it raises, and on INSERT
-- so is OLD. plpgsql will not let you paper over that with a conditional
-- expression, because both arms of a CASE are still evaluated for type.
create or replace function public.portal_broadcast()
returns trigger
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_topic     text;
begin
  if tg_op = 'DELETE' then
    v_client_id := old.client_id;
  else
    v_client_id := new.client_id;
  end if;

  if v_client_id is null then
    return null;
  end if;

  v_topic := 'portal:' || v_client_id::text;

  -- A broadcast failure must NEVER fail the write underneath it. These triggers
  -- sit on portal_clients and portal_delivery_phases, which crm.on_lead_won()
  -- writes to inside its own transaction: an uncaught raise here would turn a
  -- CLOSED WON stage change in crm.podlablv.com into a failed transaction.
  -- Same rule notifySlack() already follows in lib/portal-server.ts.
  begin
    if tg_op = 'INSERT' then
      perform realtime.broadcast_changes(
        v_topic, tg_op, tg_op, tg_table_name, tg_table_schema, new, null);
    elsif tg_op = 'UPDATE' then
      perform realtime.broadcast_changes(
        v_topic, tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
    else
      perform realtime.broadcast_changes(
        v_topic, tg_op, tg_op, tg_table_name, tg_table_schema, null, old);
    end if;
  exception when others then
    raise warning '[portal] broadcast failed on %: %', tg_table_name, sqlerrm;
  end;

  return null;
end $$;

-- ── 2. Events broadcaster ────────────────────────────────────────────
-- portal_events needs its own, because the generic one would push
-- visible_to_client = false rows onto the CLIENT's channel. RLS protects the
-- REST read; it does not protect a broadcast payload. Internal notes must
-- never leave the database on a client channel.
create or replace function public.portal_broadcast_event()
returns trigger
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or not coalesce(new.visible_to_client, false) then
    return null;
  end if;

  begin
    perform realtime.broadcast_changes(
      'portal:' || new.client_id::text,
      tg_op, tg_op, tg_table_name, tg_table_schema,
      new,
      case when tg_op = 'UPDATE' then old else null end
    );
  exception when others then
    raise warning '[portal] event broadcast failed: %', sqlerrm;
  end;
  return null;
end $$;

-- ── 3. Client-row broadcaster ────────────────────────────────────────
-- portal_clients keys on id, not client_id.
create or replace function public.portal_broadcast_client()
returns trigger
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    return null;
  end if;
  begin
    perform realtime.broadcast_changes(
      'portal:' || new.id::text,
      tg_op, tg_op, tg_table_name, tg_table_schema, new,
      case when tg_op = 'UPDATE' then old else null end
    );
  exception when others then
    raise warning '[portal] client broadcast failed: %', sqlerrm;
  end;
  return null;
end $$;

-- ── 4. Attach ────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'assets','projects','invoices','activity','report_metrics','comments',
    'action_items','intake_answers','delivery_phases','delivery_tasks'
  ]
  loop
    execute format('drop trigger if exists trg_portal_broadcast on public.portal_%I', t);
    execute format(
      'create trigger trg_portal_broadcast after insert or update or delete on public.portal_%I '
      'for each row execute function public.portal_broadcast()', t);
  end loop;
end $$;

drop trigger if exists trg_portal_broadcast on public.portal_events;
create trigger trg_portal_broadcast
  after insert or update on public.portal_events
  for each row execute function public.portal_broadcast_event();

drop trigger if exists trg_portal_broadcast on public.portal_clients;
create trigger trg_portal_broadcast
  after insert or update on public.portal_clients
  for each row execute function public.portal_broadcast_client();

-- ── 5. Channel authorization ─────────────────────────────────────────
-- Supabase's documented example for this policy is `using (true)`, which would
-- let any authenticated user subscribe to any client's channel. Scope it to the
-- caller's memberships instead.
--
-- realtime.topic() returns the topic being authorized. If this project's
-- Realtime version does not expose it, the fallback is to match on the
-- realtime.messages.topic column directly.
drop policy if exists "portal clients receive own broadcasts" on realtime.messages;
create policy "portal clients receive own broadcasts"
on realtime.messages
for select to authenticated
--
-- Built as a text comparison rather than substring(topic)::uuid on purpose: the
-- topic is caller-supplied, and casting a malformed one would raise inside the
-- policy instead of simply denying.
using (
  exists (
    select 1
    from public.portal_client_users cu
    where cu.user_id = auth.uid()
      and realtime.topic() = 'portal:' || cu.client_id::text
  )
);

-- ── 6. Verification ──────────────────────────────────────────────────
-- After applying, from a signed-in browser:
--   await supabase.realtime.setAuth()
--   supabase.channel('portal:<their id>', { config: { private: true } })
--           .on('broadcast', { event: 'UPDATE' }, console.log).subscribe()
-- then update one of their rows with the service role and watch it arrive.
-- Subscribing to ANOTHER client's id must fail authorization.
