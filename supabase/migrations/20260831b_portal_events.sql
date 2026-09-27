-- ============================================================
-- Portal Phase 0c — the event log
--
-- Today each server route hand-rolls three calls: write the row, ping Slack,
-- insert a crm.activities line. Three chances to half-happen, and every new
-- module copy-pastes them again.
--
-- portal_events is the one table every module writes. The activity feed, the
-- Lab Notebook, notifications, and the CRM timeline all read from it.
--
-- Replaces portal_activity, whose rows are migrated in below. That table is
-- LEFT IN PLACE, not dropped — nothing that still selects from it breaks, and
-- dropping it is a separate decision once the portal reads events everywhere.
-- ============================================================

create table if not exists public.portal_events (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.portal_clients(id) on delete cascade,
  module            text not null,                 -- payments | scripts | deliverables | forms | delivery | portal
  kind              text not null,                 -- invoice.paid | script.approved | comment.added
  title             text not null,                 -- one human line, shown in the feed
  detail            text,
  actor_name        text,
  actor_kind        text default 'system',         -- client | staff | system
  ref_id            uuid,                          -- the row this is about
  visible_to_client boolean default true,          -- false = internal-only, staff feed
  created_at        timestamptz default now()
);

create index if not exists portal_events_client_idx
  on public.portal_events(client_id, created_at desc);
create index if not exists portal_events_module_idx
  on public.portal_events(client_id, module, created_at desc);

comment on column public.portal_events.visible_to_client is
  'false hides the row from the client feed but keeps it for staff. Enforced in RLS, not in the UI.';

-- ── Migrate portal_activity in ───────────────────────────────────────
-- Guarded so re-running the migration cannot duplicate the feed.
insert into public.portal_events (client_id, module, kind, title, actor_kind, created_at)
select a.client_id,
       'portal',
       coalesce(nullif(a.kind, ''), 'update'),
       a.title,
       'system',
       coalesce(a.happened_at, a.created_at, now())
from public.portal_activity a
where not exists (
  select 1 from public.portal_events e
  where e.client_id = a.client_id
    and e.title     = a.title
    and e.created_at = coalesce(a.happened_at, a.created_at, now())
);

-- ── RLS ──────────────────────────────────────────────────────────────
-- Select-only, and internal rows never reach the client.
alter table public.portal_events enable row level security;

drop policy if exists own_rows on public.portal_events;
create policy own_rows on public.portal_events
  for select to authenticated
  using (
    visible_to_client
    and client_id in (select client_id from public.portal_client_users where user_id = auth.uid())
  );

grant select on public.portal_events to authenticated;
grant all    on public.portal_events to service_role;
revoke all   on public.portal_events from anon;
