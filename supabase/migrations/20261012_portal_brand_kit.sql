-- PodLab Portal — Brand page: logos, brand kit, b-roll (Hiram, 2026-10-08)
--
-- Clients upload their own logos, colors, fonts, brand guide and b-roll so the
-- team stops chasing them by text. Same model as deliverables: clients read
-- their own rows through RLS and never write; every write goes through
-- app/api/portal/brand with the service role.
--
-- Additive and idempotent: safe to run twice.

-- ── 1. The kit itself (one row per client) ─────────────────────────────
create table if not exists public.portal_brand_kits (
  client_id   uuid primary key references public.portal_clients(id) on delete cascade,
  colors      jsonb not null default '[]'::jsonb,   -- [{ "hex": "#2ADD1B", "name": "Primary green" }]
  fonts       jsonb not null default '[]'::jsonb,   -- [{ "name": "Michroma", "use": "Headings" }]
  notes       text,                                  -- do's and don'ts, in their words
  -- Read-only link for editors (/portal/kit/<token>). Null until staff make one;
  -- rotating it kills every copy of the old link.
  share_token text unique,
  updated_by  text,
  updated_at  timestamptz default now()
);

-- ── 2. Files and links ─────────────────────────────────────────────────
create table if not exists public.portal_brand_assets (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  kind         text not null check (kind in ('logo', 'guide', 'font', 'broll')),
  -- Logos only: primary | icon | white | dark | other
  variant      text,
  label        text,
  storage_path text,          -- object path in the client-brand bucket, never a URL
  external_url text,          -- a Drive / Dropbox / WeTransfer link for anything too big to upload
  filename     text,
  size_bytes   bigint,
  mime_type    text,
  uploaded_by  text,
  uploaded_by_kind text not null default 'client',  -- client | staff
  -- Removing hides the row; the file stays in storage until staff purge it.
  removed_at   timestamptz,
  created_at   timestamptz default now(),
  constraint portal_brand_assets_has_target check (storage_path is not null or external_url is not null)
);

create index if not exists portal_brand_assets_client_idx
  on public.portal_brand_assets(client_id, kind, created_at desc) where removed_at is null;

-- ── 3. RLS: select only, own rows ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['brand_kits', 'brand_assets']
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

-- The share token is staff business; clients never need to read it.
revoke select on public.portal_brand_kits from authenticated;
grant select (client_id, colors, fonts, notes, updated_by, updated_at) on public.portal_brand_kits to authenticated;

-- ── 4. Private bucket ──────────────────────────────────────────────────
-- No storage policies: access is service role plus short-lived signed URLs the
-- app mints after an ownership check. 5 GB per file (phone b-roll); the
-- project-wide upload limit in Supabase settings must be at least this.
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-brand', 'client-brand', false, 5368709120)
on conflict (id) do update
  set public          = false,
      file_size_limit = excluded.file_size_limit;
