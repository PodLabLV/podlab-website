-- Portal v2, track C (docs/PORTAL-V2.md): onboarding, generation jobs, the Assets library.
--
-- portal_onboarding  one row per client: the AssetsLab intake answers (saved as
--                    they type), the branding choice (upload / help) and the
--                    brand questionnaire, and the approved profile summary.
-- portal_jobs        generation work for the Mac mini worker
--                    (scripts/portal-jobs-worker.py): assetslab | vsl_pack | brand_kit.
--                    Claimed atomically through portal_claim_job().
-- portal_assets      + source_job_id (which job made it) and library (where it
--                    lives in Assets once approved: docs | branding | videos | broll).
--
-- Additive and idempotent. Clients read their own rows; every write goes
-- through the service role (app/api/portal/onboarding, the worker).

-- ── 1. Onboarding ──────────────────────────────────────────────────────
create table if not exists public.portal_onboarding (
  client_id           uuid primary key references public.portal_clients(id) on delete cascade,
  answers             jsonb not null default '{}'::jsonb,   -- { question id: answer } (lib/portal/onboarding-questions.ts)
  brand_mode          text check (brand_mode in ('upload', 'help')),
  brand_answers       jsonb not null default '{}'::jsonb,   -- brand questionnaire, when brand_mode = 'help'
  submitted_at        timestamptz,
  submitted_by        text,
  -- Filled when the client approves their AssetsLab: the Assets tab's profile summary.
  profile             jsonb,
  profile_approved_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── 2. Generation jobs ─────────────────────────────────────────────────
create table if not exists public.portal_jobs (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  kind         text not null check (kind in ('assetslab', 'vsl_pack', 'brand_kit')),
  status       text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  input        jsonb not null default '{}'::jsonb,
  output       jsonb,
  error        text,
  attempts     int not null default 0,
  -- One job per real event (e.g. onboarding:<client>:assetslab); a double submit queues nothing new.
  ref          text unique,
  claimed_by   text,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz,
  updated_at   timestamptz not null default now()
);
create index if not exists portal_jobs_queue_idx on public.portal_jobs (created_at) where status = 'queued';
create index if not exists portal_jobs_client_idx on public.portal_jobs (client_id, created_at desc);

-- Claim the oldest queued job. skip locked: two workers never get the same row.
-- A running job older than 2 hours is treated as a dead worker and handed out
-- again, up to 3 attempts.
create or replace function public.portal_claim_job(worker text, kinds text[] default null)
returns setof public.portal_jobs
language sql
volatile
security definer
set search_path = public
as $$
  update public.portal_jobs j
     set status = 'running', attempts = j.attempts + 1, claimed_by = worker,
         started_at = now(), updated_at = now(), error = null
   where j.id = (
     select id from public.portal_jobs
      where attempts < 3
        and (status = 'queued' or (status = 'running' and started_at < now() - interval '2 hours'))
        and (kinds is null or kind = any(kinds))
      order by created_at
      for update skip locked
      limit 1)
  returning j.*;
$$;
revoke all on function public.portal_claim_job(text, text[]) from public, anon, authenticated;
grant execute on function public.portal_claim_job(text, text[]) to service_role;

-- ── 3. Assets: provenance + library placement ──────────────────────────
alter table public.portal_assets add column if not exists source_job_id uuid references public.portal_jobs(id) on delete set null;
alter table public.portal_assets add column if not exists library text check (library in ('docs', 'branding', 'videos', 'broll'));
create index if not exists portal_assets_source_job_idx on public.portal_assets (source_job_id) where source_job_id is not null;

-- ── 4. RLS: select only, own rows (teammates included) ────────────────
do $$
declare t text;
begin
  foreach t in array array['onboarding', 'jobs']
  loop
    execute format('alter table public.portal_%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.portal_%I', t);
    execute format(
      'create policy own_rows on public.portal_%I for select to authenticated '
      'using (client_id in (select public.portal_my_client_ids()))', t);
    execute format('grant select on public.portal_%I to authenticated', t);
    execute format('grant all on public.portal_%I to service_role', t);
    execute format('revoke all on public.portal_%I from anon', t);
  end loop;
end $$;

-- Clients see a job's state, not its prompt input or raw output.
revoke select on public.portal_jobs from authenticated;
grant select (id, client_id, kind, status, created_at, started_at, finished_at) on public.portal_jobs to authenticated;

notify pgrst, 'reload schema';

-- TO UNDO:
--   alter table public.portal_assets drop column if exists library, drop column if exists source_job_id;
--   drop function if exists public.portal_claim_job(text, text[]);
--   drop table if exists public.portal_jobs, public.portal_onboarding;
