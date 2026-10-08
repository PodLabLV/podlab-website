-- PodLab Portal — Scripts & Revisions + Deliverables & Files (2026-10-08)
--
-- Ported from PR #21 (20260902_portal_scripts.sql + 20260903_portal_deliverables.sql),
-- stripped of what depended on #21 infrastructure that never ran:
--   * RLS reads portal_clients.user_id (main's model), not portal_client_users.
--   * No portal_broadcast realtime triggers and no portal_events table. Side
--     effects (Slack, CRM timeline, portal_activity) happen in the API routes.
--
-- Clients read through RLS and never write. Every write goes through a
-- service-role route under app/api/portal/{scripts,deliverables}.
--
-- Additive and idempotent: safe to run twice, touches no existing rows except
-- giving portal_assets a few nullable columns.

-- ── 1. Scripts ──────────────────────────────────────────────────────────
create table if not exists public.portal_scripts (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.portal_clients(id) on delete cascade,
  title                text not null,
  lab                  text,
  kind                 text default 'vsl',        -- vsl | hook | faq | short | founder
  status               text default 'in review',  -- draft | in review | changes requested | approved | shot | published
  current_version      int  not null default 0,
  shoot_date           date,
  source               text default 'manual',     -- vsllab | hooklab | realtorlab-pack | manual
  -- Five takes of the same open are five arms of one trial, not five scripts.
  trial_group          text,
  -- When the client last sent notes. Client notes newer than this are "unsent".
  changes_requested_at timestamptz,
  sort_order           int  default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Versions are IMMUTABLE. A revision is a new row, never an edit: a client who
-- approved v3 has to be able to prove what v3 said.
create table if not exists public.portal_script_versions (
  id              uuid primary key default gen_random_uuid(),
  script_id       uuid not null references public.portal_scripts(id) on delete cascade,
  client_id       uuid not null references public.portal_clients(id) on delete cascade,
  version_no      int  not null,
  body            text not null,          -- markdown; blocks split on blank lines
  word_count      int,
  runtime_seconds int,                    -- at 150 wpm, delivered-to-camera pace
  author_name     text,
  author_kind     text default 'podlab',  -- podlab | ai
  note            text,                   -- "v3: tightened the open, cut the stat"
  created_at      timestamptz default now(),
  unique (script_id, version_no)
);

-- quoted_text is the durable anchor: block indexes shift when a paragraph is
-- added above, the quote does not. block_index is only a hint.
create table if not exists public.portal_script_comments (
  id           uuid primary key default gen_random_uuid(),
  version_id   uuid not null references public.portal_script_versions(id) on delete cascade,
  script_id    uuid not null references public.portal_scripts(id) on delete cascade,
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  parent_id    uuid references public.portal_script_comments(id) on delete cascade,
  block_index  int,                       -- null = a note on the whole script
  quoted_text  text,
  body         text not null,
  author_name  text not null,
  author_kind  text not null default 'client',   -- client | staff
  status       text not null default 'open',     -- open | resolved | carried
  -- Carried into a new version but its quoted line is gone: flagged, not dropped.
  orphaned     boolean not null default false,
  resolved_at  timestamptz,
  created_at   timestamptz default now()
);

-- Same evidence shape as the executed Beaker agreements (20260819).
create table if not exists public.portal_script_approvals (
  id                  uuid primary key default gen_random_uuid(),
  version_id          uuid not null references public.portal_script_versions(id) on delete cascade,
  script_id           uuid not null references public.portal_scripts(id) on delete cascade,
  client_id           uuid not null references public.portal_clients(id) on delete cascade,
  approved_by_name    text not null,
  approved_by_email   text,
  approved_ip         text,
  approved_user_agent text,
  approved_at         timestamptz default now(),
  unique (version_id)
);

create index if not exists portal_scripts_client_idx         on public.portal_scripts(client_id, sort_order);
create index if not exists portal_script_versions_script_idx on public.portal_script_versions(script_id, version_no desc);
create index if not exists portal_script_comments_version_idx on public.portal_script_comments(version_id, created_at);
create index if not exists portal_script_comments_open_idx   on public.portal_script_comments(script_id, status) where status = 'open';
create index if not exists portal_script_approvals_script_idx on public.portal_script_approvals(script_id);

-- ── 2. Deliverables ─────────────────────────────────────────────────────
-- current_version 0 = a legacy row with only a url and no versions. Those keep
-- rendering exactly as before (15 live rows at the time of writing).
alter table public.portal_assets
  add column if not exists current_version      int not null default 0,
  add column if not exists approved_version     int,
  add column if not exists approved_at          timestamptz,
  add column if not exists approved_by          text,
  add column if not exists approved_by_email    text,
  add column if not exists approved_ip          text,
  add column if not exists approved_user_agent  text,
  add column if not exists changes_requested_at timestamptz,
  add column if not exists updated_at           timestamptz default now();

comment on column public.portal_assets.status is
  'Ready | In Progress | Pending (legacy) | in review | changes requested | approved';

-- storage_path is an object path inside the private bucket, never a URL. The
-- app mints a short-lived signed URL per request.
create table if not exists public.portal_asset_versions (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references public.portal_assets(id) on delete cascade,
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  version_no   int  not null,
  storage_path text,
  -- Long-form video belongs on YouTube/Vimeo/Drive; Storage egress is not a CDN plan.
  external_url text,
  size_bytes   bigint,
  mime_type    text,
  note         text,
  uploaded_by  text,
  created_at   timestamptz default now(),
  unique (asset_id, version_no),
  constraint portal_asset_versions_has_target
    check (storage_path is not null or external_url is not null)
);

create table if not exists public.portal_asset_comments (
  id           uuid primary key default gen_random_uuid(),
  version_id   uuid not null references public.portal_asset_versions(id) on delete cascade,
  asset_id     uuid not null references public.portal_assets(id) on delete cascade,
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  -- Seconds into a video. Null for a document or a general note.
  time_seconds numeric,
  body         text not null,
  author_name  text not null,
  author_kind  text not null default 'client',  -- client | staff
  status       text not null default 'open',    -- open | resolved
  resolved_at  timestamptz,
  created_at   timestamptz default now()
);

create index if not exists portal_asset_versions_asset_idx  on public.portal_asset_versions(asset_id, version_no desc);
create index if not exists portal_asset_comments_version_idx on public.portal_asset_comments(version_id, time_seconds nulls first, created_at);

-- ── 3. RLS: select only, own rows ───────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['scripts','script_versions','script_comments','script_approvals',
                           'asset_versions','asset_comments']
  loop
    execute format('alter table public.portal_%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select id from public.portal_clients where user_id = auth.uid()))', t);
    execute format('grant select on public.portal_%I to authenticated', t);
    execute format('grant all on public.portal_%I to service_role', t);
    execute format('revoke all on public.portal_%I from anon', t);
  end loop;
end $$;

-- ── 4. Private bucket ───────────────────────────────────────────────────
-- No storage policies for anon or authenticated: access is service role plus
-- the short-lived signed URLs the app mints after an ownership check. 500 MB
-- is for finished cuts, not masters; compress first.
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-deliverables', 'client-deliverables', false, 524288000)
on conflict (id) do update
  set public          = false,
      file_size_limit = excluded.file_size_limit;
