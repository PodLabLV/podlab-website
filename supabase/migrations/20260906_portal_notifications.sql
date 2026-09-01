-- ============================================================
-- Portal Phase 6 — Notifications + reporting periods
--
-- Notifications are DERIVED from portal_events by trigger, not written by
-- routes. Every module already writes the event log through recordEvent(); if
-- notifying were a second call, the two would drift the first time somebody
-- added a module and forgot one. A trigger cannot forget.
--
-- One row per event per member of the client, so a founder marking something
-- read does not clear it from their ops manager's bell.
--
-- Run AFTER 20260831b_portal_events.sql and 20260831_portal_roles.sql.
-- Safe + additive. Every statement is idempotent.
-- ============================================================

-- ── 1. Notifications ─────────────────────────────────────────────────
create table if not exists public.portal_notifications (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  /* Null means the whole account. Populated per-member by the trigger below so
     read state is per-person. */
  user_id    uuid references auth.users(id) on delete cascade,
  event_id   uuid references public.portal_events(id) on delete cascade,
  title      text not null,
  detail     text,
  href       text,
  read_at    timestamptz,
  created_at timestamptz default now()
);

create index if not exists portal_notifications_user_idx
  on public.portal_notifications(user_id, read_at, created_at desc);
create index if not exists portal_notifications_client_idx
  on public.portal_notifications(client_id, created_at desc);

-- ── 2. Where each module's events point ──────────────────────────────
-- Kept in SQL rather than the UI so a notification is a complete row: anything
-- reading the table gets a working link, not just a sentence.
create or replace function public.portal_event_href(p_module text, p_ref uuid)
returns text
language sql
immutable
as $$
  select case p_module
    when 'scripts'      then '/portal/scripts' || coalesce('/' || p_ref::text, '')
    when 'payments'     then '/portal/invoices'
    when 'deliverables' then '/portal/deliverables'
    when 'forms'        then '/portal/intake'
    when 'delivery'     then '/portal/delivery'
    else '/portal'
  end
$$;

-- ── 3. Fan an event out to the client's members ──────────────────────
create or replace function public.portal_notify_from_event()
returns trigger
security definer
set search_path = ''
as $$
begin
  -- Internal-only events never reach a client's bell. Same rule the broadcast
  -- trigger follows: RLS guards a read, it does not guard a fan-out.
  if not coalesce(new.visible_to_client, false) then
    return null;
  end if;

  -- A client with no logins yet still gets an account-level row, so nothing is
  -- lost between winning the deal and provisioning the user.
  insert into public.portal_notifications (client_id, user_id, event_id, title, detail, href)
  select new.client_id, cu.user_id, new.id, new.title, new.detail,
         public.portal_event_href(new.module, new.ref_id)
  from public.portal_client_users cu
  where cu.client_id = new.client_id;

  if not found then
    insert into public.portal_notifications (client_id, user_id, event_id, title, detail, href)
    values (new.client_id, null, new.id, new.title, new.detail,
            public.portal_event_href(new.module, new.ref_id));
  end if;

  return null;
exception when others then
  -- A notification must never fail the thing it describes.
  raise warning '[portal] notify fan-out failed: %', sqlerrm;
  return null;
end $$;

drop trigger if exists trg_portal_notify on public.portal_events;
create trigger trg_portal_notify
  after insert on public.portal_events
  for each row execute function public.portal_notify_from_event();

-- ── 4. RLS ───────────────────────────────────────────────────────────
-- Scoped to the individual, not just the client: a teammate must not read
-- another teammate's bell. Account-level rows (user_id null) are visible to
-- every member.
alter table public.portal_notifications enable row level security;

drop policy if exists own_rows on public.portal_notifications;
create policy own_rows on public.portal_notifications
  for select to authenticated
  using (
    (user_id = auth.uid())
    or (
      user_id is null
      and client_id in (
        select client_id from public.portal_client_users where user_id = auth.uid()
      )
    )
  );

grant select on public.portal_notifications to authenticated;
grant all    on public.portal_notifications to service_role;
revoke all   on public.portal_notifications from anon;

drop trigger if exists trg_portal_broadcast on public.portal_notifications;
create trigger trg_portal_broadcast
  after insert or update on public.portal_notifications
  for each row execute function public.portal_broadcast();

-- ── 5. Reporting periods ─────────────────────────────────────────────
-- portal_report_metrics has been empty since August by design — an honest empty
-- state beats a dashboard of zeroes. It is keyed by a free-text period_label,
-- which is fine for display and useless for "the same metric, last month".
-- These columns make a period sortable and a metric upsertable by a cron.
alter table public.portal_report_metrics
  add column if not exists period_start date,
  add column if not exists metric_key   text,
  add column if not exists source       text,
  add column if not exists updated_at   timestamptz default now();

-- Lets an ingest run repeatedly without duplicating a month's figures.
create unique index if not exists portal_report_metrics_period_key_idx
  on public.portal_report_metrics (client_id, period_label, metric_key)
  where metric_key is not null;
