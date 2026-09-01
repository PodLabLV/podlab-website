-- ============================================================
-- Portal Phase 3 — Deliverables & Files
--
-- portal_assets has existed since 20260811 as a title and a loose URL. No
-- versions, no real storage, no approval — so "here is v2 of the edit" has
-- nowhere to live and a client has no way to say "the cut at 0:42 is long."
--
-- Adds:
--   portal_asset_versions   immutable versions, same rule as scripts
--   portal_asset_comments   timestamped notes (time_seconds for video)
--   client-deliverables     private bucket, signed URLs only
--
-- The bucket is private for the same reason affiliate-agreements is: these are
-- a client's unreleased brand assets, ad cuts, and strategy documents. Nothing
-- here is ever guessable and nothing is ever public.
--
-- Run AFTER 20260831_portal_roles.sql and 20260831c_portal_realtime.sql.
-- Safe + additive. Every statement is idempotent.
-- ============================================================

-- ── 1. Assets, extended ──────────────────────────────────────────────
alter table public.portal_assets
  add column if not exists status_detail   text,
  add column if not exists current_version int default 1,
  add column if not exists approved_at     timestamptz,
  add column if not exists approved_by     text,
  add column if not exists updated_at      timestamptz default now();

comment on column public.portal_assets.status is
  'Ready | In Progress | Pending | pending review | changes requested | approved';

-- ── 2. Versions ──────────────────────────────────────────────────────
-- storage_path is an object path inside the private bucket, never a URL. The
-- app mints a short-lived signed URL per request; a stored URL would either
-- expire in the database or, worse, not expire at all.
create table if not exists public.portal_asset_versions (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references public.portal_assets(id) on delete cascade,
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  version_no   int  not null,
  storage_path text,
  /* For anything that genuinely lives elsewhere. Long-form video belongs on
     YouTube or Vimeo — Supabase Storage egress is not a CDN plan. */
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

-- ── 3. Comments ──────────────────────────────────────────────────────
create table if not exists public.portal_asset_comments (
  id           uuid primary key default gen_random_uuid(),
  version_id   uuid not null references public.portal_asset_versions(id) on delete cascade,
  asset_id     uuid not null references public.portal_assets(id) on delete cascade,
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  /* Seconds into the video. Null for a document or a general note — this is
     what makes "the cut at 0:42 is long" a real object instead of prose. */
  time_seconds numeric,
  body         text not null,
  author_name  text not null,
  author_kind  text default 'client',    -- client | staff
  status       text default 'open',      -- open | resolved
  resolved_at  timestamptz,
  created_at   timestamptz default now()
);

create index if not exists portal_asset_versions_asset_idx
  on public.portal_asset_versions(asset_id, version_no desc);
create index if not exists portal_asset_comments_version_idx
  on public.portal_asset_comments(version_id, time_seconds nulls first, created_at);

-- ── 4. RLS — select only, membership scoped ──────────────────────────
do $$
declare t text;
begin
  foreach t in array array['asset_versions','asset_comments']
  loop
    execute format('alter table public.portal_%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select client_id from public.portal_client_users where user_id = auth.uid()))', t);
    execute format('grant select on public.portal_%I to authenticated', t);
    execute format('grant all    on public.portal_%I to service_role', t);
    execute format('revoke all   on public.portal_%I from anon', t);
  end loop;
end $$;

-- ── 5. Broadcast ─────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['asset_versions','asset_comments']
  loop
    execute format('drop trigger if exists trg_portal_broadcast on public.portal_%I', t);
    execute format(
      'create trigger trg_portal_broadcast after insert or update or delete on public.portal_%I '
      'for each row execute function public.portal_broadcast()', t);
  end loop;
end $$;

-- ── 6. Private bucket ────────────────────────────────────────────────
-- 500 MB ceiling is for finished cuts, not masters. CLAUDE.md is explicit that
-- *-original.mp4 files (134 MB+) never ship; compress before upload. Anything
-- long-form should use external_url instead of living here.
--
-- No policies are granted to anon or authenticated. Access is service-role only
-- plus the short-lived signed URLs the app mints. A read policy here would make
-- every client's unreleased assets readable by any logged-in user of the site.
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-deliverables', 'client-deliverables', false, 524288000)
on conflict (id) do update
  set public          = false,
      file_size_limit = excluded.file_size_limit;
