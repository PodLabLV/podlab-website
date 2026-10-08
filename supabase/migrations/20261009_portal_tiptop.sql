-- Portal: TipTop, the client's guide inside the portal.
--
-- Three things:
--   1. profile fields a client can now edit themselves (phone, website, timezone)
--   2. portal_document_versions: every change to a client document, append-only,
--      so TipTop can edit documents directly and anything can be rolled back
--   3. portal_tiptop_threads: the client's TipTop conversation, one row per client
--
-- Writes still only happen through server routes holding the service role.
-- Safe to re-run.

-- ---------------------------------------------------------------- profile
alter table public.portal_clients
  add column if not exists phone    text,
  add column if not exists website  text,
  add column if not exists timezone text;

-- ------------------------------------------------------- document versions
create table if not exists public.portal_document_versions (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  doc_key     text not null default 'clarity',      -- which document; 'clarity' today
  html        text not null,
  version_no  int  not null check (version_no > 0),
  author_kind text not null check (author_kind in ('client', 'staff', 'ai')),
  author_name text,
  note        text,                                 -- "As delivered", "Restored version 3", TipTop's summary
  created_at  timestamptz not null default now(),
  unique (client_id, doc_key, version_no)
);

-- History is append-only: a restore writes a new version. Rows only go away
-- with their client (on delete cascade).
create or replace function public.portal_document_versions_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'portal_document_versions is append-only; write a new version instead';
end;
$$;

drop trigger if exists trg_portal_document_versions_immutable on public.portal_document_versions;
create trigger trg_portal_document_versions_immutable
  before update on public.portal_document_versions
  for each row execute function public.portal_document_versions_immutable();

-- ---------------------------------------------------------- TipTop threads
create table if not exists public.portal_tiptop_threads (
  client_id  uuid primary key references public.portal_clients(id) on delete cascade,
  messages   jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------- RLS
alter table public.portal_document_versions enable row level security;
alter table public.portal_tiptop_threads    enable row level security;

-- A client may read their own document history. Threads have no client policy:
-- only the server route reads and writes them.
drop policy if exists own_rows on public.portal_document_versions;
create policy own_rows on public.portal_document_versions
  for select to authenticated
  using (client_id in (select id from public.portal_clients where user_id = auth.uid()));

grant select on public.portal_document_versions to authenticated;
grant all    on public.portal_document_versions to service_role;
revoke all   on public.portal_document_versions from anon;

grant all    on public.portal_tiptop_threads to service_role;
revoke all   on public.portal_tiptop_threads from anon, authenticated;
