-- ============================================================
-- Portal Phase 0b — multi-user client accounts + staff roles
--
-- Today portal_clients.user_id is a unique 1:1 FK to auth.users, so a client
-- account is exactly one login. A founder cannot give their marketing lead or
-- ops manager access without handing over their own password.
--
-- This adds a join table and repoints every RLS policy at it. portal_clients
-- .user_id is KEPT and still populated — it is the seed for the backfill and
-- nothing that reads it breaks. It simply stops being the access check.
--
-- Safe + additive. Every statement is idempotent.
-- ============================================================

-- ── 1. Client memberships ────────────────────────────────────────────
create table if not exists public.portal_client_users (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner',   -- owner | teammate | viewer
  invited_by text,
  created_at timestamptz default now(),
  unique (client_id, user_id)
);

create index if not exists portal_client_users_user_idx   on public.portal_client_users(user_id);
create index if not exists portal_client_users_client_idx on public.portal_client_users(client_id);

comment on table public.portal_client_users is
  'Which auth users may see which client account. Replaces portal_clients.user_id as the access check.';

-- ── 2. Backfill from the existing 1:1 column ─────────────────────────
insert into public.portal_client_users (client_id, user_id, role)
select id, user_id, 'owner'
from public.portal_clients
where user_id is not null
on conflict (client_id, user_id) do nothing;

-- ── 3. Staff roles ───────────────────────────────────────────────────
-- portal_staff was membership-only. A producer should not be able to do
-- everything an admin can once the admin console exists.
alter table public.portal_staff
  add column if not exists role text not null default 'admin';  -- admin | producer | editor

-- ── 4. Repoint every RLS policy ──────────────────────────────────────
-- Was: client_id in (select id from portal_clients where user_id = auth.uid())
-- Now: client_id in (select client_id from portal_client_users where user_id = auth.uid())
--
-- Still SELECT-only. Clients have no write path anywhere; every mutation goes
-- through a service-role route. That does not change here.
do $$
declare t text;
begin
  foreach t in array array[
    'assets','projects','invoices','activity','report_metrics','comments',
    'action_items','intake_items','intake_answers','delivery_phases','delivery_tasks'
  ]
  loop
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select client_id from public.portal_client_users where user_id = auth.uid()))', t);
  end loop;
end $$;

-- The client row itself: reachable through a membership rather than user_id.
drop policy if exists own_client on public.portal_clients;
create policy own_client on public.portal_clients
  for select to authenticated
  using (id in (select client_id from public.portal_client_users where user_id = auth.uid()));

-- The membership table: a user sees only their own memberships.
alter table public.portal_client_users enable row level security;
drop policy if exists own_membership on public.portal_client_users;
create policy own_membership on public.portal_client_users
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.portal_client_users to authenticated;
grant all    on public.portal_client_users to service_role;
revoke all   on public.portal_client_users from anon;
