-- Team access: more than one login per client (an assistant, a partner).
-- portal_clients.user_id stays the owner; members are extra logins that open
-- the same portal. One login opens one portal, so user_id is unique here.

create table if not exists public.portal_client_members (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  user_id     uuid not null unique,
  email       text not null,
  first_name  text,
  last_name   text,
  role        text not null default 'Assistant',
  invited_at  timestamptz default now(),
  invited_by  text,
  created_at  timestamptz default now()
);
create index if not exists portal_client_members_client_idx on public.portal_client_members(client_id);

alter table public.portal_client_members enable row level security;
grant all on public.portal_client_members to service_role;
revoke all on public.portal_client_members from anon, authenticated;

-- Every client the signed-in user can open: the one they own plus any they're a member of.
-- security definer so policies can read the members table, which clients can't.
create or replace function public.portal_my_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.portal_clients where user_id = auth.uid()
  union
  select client_id from public.portal_client_members where user_id = auth.uid()
$$;
revoke all on function public.portal_my_client_ids() from public, anon;
grant execute on function public.portal_my_client_ids() to authenticated, service_role;

drop policy if exists own_client on public.portal_clients;
create policy own_client on public.portal_clients
  for select to authenticated
  using (id in (select public.portal_my_client_ids()));

-- Re-point every client read policy at the function. Same tables as the
-- earlier migrations; any not created yet are skipped.
do $$
declare t text;
begin
  foreach t in array array[
    'assets','projects','invoices','activity','report_metrics',
    'comments','action_items',
    'intake_items','intake_answers','delivery_phases','delivery_tasks',
    'client_products','client_elements',
    'scripts','script_versions','script_comments','script_approvals','asset_versions','asset_comments',
    'client_boards','document_versions','brand_kits','brand_assets','game_plans','content_plan'
  ]
  loop
    if to_regclass(format('public.portal_%s', t)) is null then continue; end if;
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select public.portal_my_client_ids()))', t);
  end loop;
end $$;
