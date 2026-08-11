-- PodLab Client Portal — per-client data layer
-- Project: tncipuxobcbkwkmpcevt (shared with crm + the57 schemas)
-- Every table is scoped to the logged-in user via RLS. A client can only ever
-- read their own row and their own children. There are no write policies —
-- the portal is read-only for clients; seeding happens with the service role.

create schema if not exists portal;

-- ---------------------------------------------------------------- clients
create table if not exists portal.clients (
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
create table if not exists portal.assets (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references portal.clients(id) on delete cascade,
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
create table if not exists portal.projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references portal.clients(id) on delete cascade,
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
create table if not exists portal.invoices (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references portal.clients(id) on delete cascade,
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
create table if not exists portal.activity (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references portal.clients(id) on delete cascade,
  kind        text default 'update',     -- deliverable | report | call | payment | update
  title       text not null,
  happened_at timestamptz default now(),
  created_at  timestamptz default now()
);

-- ------------------------------------------------------------ report metrics
-- Deliberately simple. Clients with no campaign data get an honest empty state
-- rather than a dashboard of zeroes.
create table if not exists portal.report_metrics (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references portal.clients(id) on delete cascade,
  period_label text not null,            -- "August 2026"
  label        text not null,
  value        text not null,
  sub          text,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

create index if not exists assets_client_idx         on portal.assets(client_id);
create index if not exists projects_client_idx       on portal.projects(client_id);
create index if not exists invoices_client_idx       on portal.invoices(client_id);
create index if not exists activity_client_idx       on portal.activity(client_id);
create index if not exists report_metrics_client_idx on portal.report_metrics(client_id);

-- ---------------------------------------------------------------------- RLS
alter table portal.clients        enable row level security;
alter table portal.assets         enable row level security;
alter table portal.projects       enable row level security;
alter table portal.invoices       enable row level security;
alter table portal.activity       enable row level security;
alter table portal.report_metrics enable row level security;

drop policy if exists own_client on portal.clients;
create policy own_client on portal.clients
  for select to authenticated
  using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['assets','projects','invoices','activity','report_metrics']
  loop
    execute format('drop policy if exists own_rows on portal.%I', t);
    execute format($f$
      create policy own_rows on portal.%I
        for select to authenticated
        using (client_id in (select id from portal.clients where user_id = auth.uid()))
    $f$, t);
  end loop;
end $$;

-- -------------------------------------------------------------------- grants
grant usage on schema portal to authenticated;
grant select on all tables in schema portal to authenticated;
alter default privileges in schema portal grant select on tables to authenticated;

-- anon gets nothing: the portal requires a session.
revoke all on schema portal from anon;
