-- ============================================================
-- Portal Phase 2 — Scripts & Revisions
--
-- The module with no equivalent today. portal_comments is document-level and
-- unanchored: it cannot express "tighten line 14."
--
-- Four tables:
--   portal_scripts           the thing being written
--   portal_script_versions   IMMUTABLE. A revision is a new row, never an edit.
--   portal_script_comments   anchored to a block, threaded, carries the quote
--   portal_script_approvals  who validated which version, with evidence
--
-- Versions are immutable because a client who approved v3 must be able to prove
-- what v3 said. Editing a version in place destroys that, and "the script we
-- shot is not the script I approved" is a conversation nobody wants to have.
--
-- Run AFTER 20260831_portal_roles.sql (RLS reads portal_client_users) and
-- 20260831c_portal_realtime.sql (portal_broadcast lives there).
--
-- Safe + additive. Every statement is idempotent.
-- ============================================================

-- ── 1. Scripts ───────────────────────────────────────────────────────
create table if not exists public.portal_scripts (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.portal_clients(id) on delete cascade,
  title           text not null,
  lab             text,
  kind            text default 'vsl',    -- vsl | hook | faq | short | founder
  status          text default 'draft',  -- draft | in review | changes requested | approved | shot | published
  current_version int  default 1,
  shoot_date      date,
  source          text,                  -- vsllab | hooklab | scriptbuilder | realtorlab | manual
  /* Hook variants belong to one trial: five takes of the same VSL open are five
     arms, not five unrelated scripts. Null for a standalone script. */
  trial_group     text,
  sort_order      int  default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── 2. Versions ──────────────────────────────────────────────────────
create table if not exists public.portal_script_versions (
  id              uuid primary key default gen_random_uuid(),
  script_id       uuid not null references public.portal_scripts(id) on delete cascade,
  client_id       uuid not null references public.portal_clients(id) on delete cascade,
  version_no      int  not null,
  body            text not null,          -- markdown; blocks split on blank lines
  word_count      int,
  runtime_seconds int,                    -- at 150 wpm, so the client sees length
  author_name     text,
  author_kind     text default 'podlab',  -- podlab | client | ai
  note            text,                   -- "v3: tightened the open, cut the stat"
  created_at      timestamptz default now(),
  unique (script_id, version_no)
);

-- ── 3. Comments ──────────────────────────────────────────────────────
-- quoted_text is what makes a note survive a rewrite: block indexes shift when
-- a paragraph is added above, so the quote is the durable anchor and the index
-- is only a hint.
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
  status       text default 'open',       -- open | resolved
  /* Set when a note was carried into a new version but its quoted text no
     longer appears. Flagged for a human rather than silently dropped. */
  orphaned     boolean default false,
  resolved_at  timestamptz,
  created_at   timestamptz default now()
);

-- ── 4. Approvals ─────────────────────────────────────────────────────
-- Same evidence shape as the executed Beaker agreements in 20260819: identify
-- exactly what was approved, by whom, from where. One approval per version.
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

create index if not exists portal_scripts_client_idx
  on public.portal_scripts(client_id, sort_order);
create index if not exists portal_script_versions_script_idx
  on public.portal_script_versions(script_id, version_no desc);
create index if not exists portal_script_comments_version_idx
  on public.portal_script_comments(version_id, created_at);
create index if not exists portal_script_comments_open_idx
  on public.portal_script_comments(client_id, status)
  where status = 'open';

-- ── 5. RLS — select only, membership scoped ──────────────────────────
-- Clients read; they do not write. Comments and approvals both land through
-- server routes holding the service role, which is also where Slack, the CRM
-- timeline, and the event log get written.
do $$
declare t text;
begin
  foreach t in array array['scripts','script_versions','script_comments','script_approvals']
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

-- ── 6. Broadcast ─────────────────────────────────────────────────────
-- A client's comment should appear on the producer's screen live, and the
-- producer's v2 on the client's, without either refreshing.
do $$
declare t text;
begin
  foreach t in array array['scripts','script_versions','script_comments','script_approvals']
  loop
    execute format('drop trigger if exists trg_portal_broadcast on public.portal_%I', t);
    execute format(
      'create trigger trg_portal_broadcast after insert or update or delete on public.portal_%I '
      'for each row execute function public.portal_broadcast()', t);
  end loop;
end $$;
