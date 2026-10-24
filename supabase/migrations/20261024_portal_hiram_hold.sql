-- PodLab Portal — "Awaiting Hiram" hold gate (2026-10-24)
--
-- The automation publishes scripts and deliverables with held_for = 'hiram'.
-- A held row (and everything under it: versions, comments, approvals) is
-- invisible to the client until staff approves it on /portal/clients/[id],
-- which clears held_for and stamps held_released_at / held_released_by.
-- "Request changes" adds an INTERNAL comment the client never sees and keeps
-- the row held, so the automation revises it.
--
-- !! WARNING: any future migration that re-creates the own_rows policies on
-- !! portal_scripts, portal_assets, portal_script_versions,
-- !! portal_script_comments, portal_script_approvals, portal_asset_versions or
-- !! portal_asset_comments (e.g. a loop like 20261017_portal_client_members.sql)
-- !! MUST keep the hold conditions below (held_for is null on the parent) and
-- !! the "and not internal" condition on the two comment tables. Dropping them
-- !! leaks unreviewed drafts and internal staff notes to clients.
--
-- Additive and idempotent: safe to run twice. Existing rows stay visible
-- (held_for defaults to null). Grants are unchanged.

-- ── 1. Columns ──────────────────────────────────────────────────────────
alter table public.portal_scripts
  add column if not exists held_for         text check (held_for in ('hiram')),
  add column if not exists held_released_at timestamptz,
  add column if not exists held_released_by text;

alter table public.portal_assets
  add column if not exists held_for         text check (held_for in ('hiram')),
  add column if not exists held_released_at timestamptz,
  add column if not exists held_released_by text;

alter table public.portal_script_comments
  add column if not exists internal boolean not null default false;

alter table public.portal_asset_comments
  add column if not exists internal boolean not null default false;

create index if not exists portal_scripts_held_idx on public.portal_scripts(client_id) where held_for is not null;
create index if not exists portal_assets_held_idx  on public.portal_assets(client_id)  where held_for is not null;

-- ── 2. Client read policies ─────────────────────────────────────────────
-- Same membership check as 20261017 (portal_my_client_ids), plus the hold.
drop policy if exists own_rows on public.portal_scripts;
create policy own_rows on public.portal_scripts for select to authenticated
  using (client_id in (select public.portal_my_client_ids()) and held_for is null);

drop policy if exists own_rows on public.portal_assets;
create policy own_rows on public.portal_assets for select to authenticated
  using (client_id in (select public.portal_my_client_ids()) and held_for is null);

drop policy if exists own_rows on public.portal_script_versions;
create policy own_rows on public.portal_script_versions for select to authenticated
  using (client_id in (select public.portal_my_client_ids())
         and exists (select 1 from public.portal_scripts s where s.id = script_id and s.held_for is null));

drop policy if exists own_rows on public.portal_script_approvals;
create policy own_rows on public.portal_script_approvals for select to authenticated
  using (client_id in (select public.portal_my_client_ids())
         and exists (select 1 from public.portal_scripts s where s.id = script_id and s.held_for is null));

drop policy if exists own_rows on public.portal_script_comments;
create policy own_rows on public.portal_script_comments for select to authenticated
  using (client_id in (select public.portal_my_client_ids())
         and not internal
         and exists (select 1 from public.portal_scripts s where s.id = script_id and s.held_for is null));

drop policy if exists own_rows on public.portal_asset_versions;
create policy own_rows on public.portal_asset_versions for select to authenticated
  using (client_id in (select public.portal_my_client_ids())
         and exists (select 1 from public.portal_assets a where a.id = asset_id and a.held_for is null));

drop policy if exists own_rows on public.portal_asset_comments;
create policy own_rows on public.portal_asset_comments for select to authenticated
  using (client_id in (select public.portal_my_client_ids())
         and not internal
         and exists (select 1 from public.portal_assets a where a.id = asset_id and a.held_for is null));
