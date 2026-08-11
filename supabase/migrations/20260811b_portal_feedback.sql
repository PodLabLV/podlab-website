-- Portal: hosted clarity document, client revision comments, action items.
--
-- Clients still have NO write policies. Every write goes through a server route
-- holding the service role, which is also where Slack and the CRM timeline get
-- notified. That keeps one code path responsible for "record it and tell the
-- team", instead of trusting the browser to do the second half.

alter table public.portal_clients
  add column if not exists crm_lead_id  uuid,   -- links to crm.leads for the activity feed
  add column if not exists document_url text;   -- hosted clarity document

-- ------------------------------------------------------------- revision notes
create table if not exists public.portal_comments (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  section    text,                       -- which part of the document
  body       text not null,
  status     text default 'open',        -- open | in review | resolved
  resolution text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------- action items
create table if not exists public.portal_action_items (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  title        text not null,
  detail       text,
  effort       text,                     -- "7 days - ~5 hours"
  source       text,                     -- "Deliverable 12"
  status       text default 'open',      -- open | done
  completed_at timestamptz,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

create index if not exists portal_comments_client_idx     on public.portal_comments(client_id);
create index if not exists portal_action_items_client_idx on public.portal_action_items(client_id);

alter table public.portal_comments     enable row level security;
alter table public.portal_action_items enable row level security;

-- Read-only for the client, same as every other portal table.
do $$
declare t text;
begin
  foreach t in array array['comments','action_items']
  loop
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select id from public.portal_clients where user_id = auth.uid()))', t);
    execute format('grant select on public.portal_%I to authenticated', t);
    execute format('grant all on public.portal_%I to service_role', t);
    execute format('revoke all on public.portal_%I from anon', t);
  end loop;
end $$;
