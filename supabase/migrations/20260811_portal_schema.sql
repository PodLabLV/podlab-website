-- PodLab Client Portal — per-client data layer
-- Project: tncipuxobcbkwkmpcevt (shared with the crm schema)
--
-- Tables live in `public` behind a portal_ prefix instead of their own schema.
-- This project's PostgREST does not pick up exposed-schema config changes
-- without a full service restart, which would interrupt crm.podlablv.com.
-- Prefixed tables in `public` work immediately and need no config change.
-- Every table is scoped to the logged-in user via RLS. A client can only ever
-- read their own row and their own children. There are no write policies —
-- the portal is read-only for clients; seeding happens with the service role.

-- ---------------------------------------------------------------- clients
create table if not exists public.portal_clients (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete cascade,
  email         text not null unique,
  first_name    text,
  last_name     text,
  business_name text not null,
  plan_label    text,                     -- "AssetsLab — Delivered"
  stage         text default 'prospect',  -- prospect | active | past
  welcome_note  text,                     -- optional line on the dashboard
  created_at    timestamptz default now()
);

-- ------------------------------------------------------------- deliverables
create table if not exists public.portal_assets (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  title       text not null,
  description text,
  lab         text,                      -- AssetsLab | VideoSalesLab | ...
  file_type   text default 'LINK',       -- PDF | VIDEO | FOLDER | LINK
  url         text,
  status      text default 'Ready',      -- Ready | In Progress | Pending
  size_label  text,
  sort_order  int  default 0,
  created_at  timestamptz default now()
);

-- ----------------------------------------------------------------- progress
create table if not exists public.portal_projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  name         text not null,
  lab          text,
  stage_index  int default 1,            -- 1..total_stages, which stage is current
  total_stages int default 5,
  progress_pct int default 0,
  started_on   date,
  eta          text,
  owner        text,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

-- ----------------------------------------------------------------- invoices
create table if not exists public.portal_invoices (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  invoice_no   text,
  issued_on    date,
  description  text,
  amount_cents int not null default 0,
  status       text default 'Paid',      -- Paid | Pending | Overdue
  receipt_url  text,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

-- ----------------------------------------------------------------- activity
create table if not exists public.portal_activity (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  kind        text default 'update',     -- deliverable | report | call | payment | update
  title       text not null,
  happened_at timestamptz default now(),
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------ report metrics
-- Deliberately simple. Clients with no campaign data get an honest empty state
-- rather than a dashboard of zeroes.
create table if not exists public.portal_report_metrics (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  period_label text not null,            -- "August 2026"
  label        text not null,
  value        text not null,
  sub          text,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

create index if not exists portal_assets_client_idx         on public.portal_assets(client_id);
create index if not exists portal_projects_client_idx       on public.portal_projects(client_id);
create index if not exists portal_invoices_client_idx       on public.portal_invoices(client_id);
create index if not exists portal_activity_client_idx       on public.portal_activity(client_id);
create index if not exists portal_report_metrics_client_idx on public.portal_report_metrics(client_id);

-- ---------------------------------------------------------------------- RLS
alter table public.portal_clients        enable row level security;
alter table public.portal_assets         enable row level security;
alter table public.portal_projects       enable row level security;
alter table public.portal_invoices       enable row level security;
alter table public.portal_activity       enable row level security;
alter table public.portal_report_metrics enable row level security;

drop policy if exists own_client on public.portal_clients;
create policy own_client on public.portal_clients
  for select to authenticated
  using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['assets','projects','invoices','activity','report_metrics']
  loop
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select id from public.portal_clients where user_id = auth.uid()))', t);
  end loop;
end $$;

-- -------------------------------------------------------------------- grants
-- Read-only for signed-in clients; anon gets nothing at all. Verified: an
-- authenticated client sees only their own rows, a write returns 403, and an
-- anonymous read returns 401 permission denied.
do $$
declare t text;
begin
  foreach t in array array['clients','assets','projects','invoices','activity','report_metrics']
  loop
    execute format('grant select on public.portal_%I to authenticated', t);
    execute format('revoke all on public.portal_%I from anon', t);
  end loop;
end $$;
