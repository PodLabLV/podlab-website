-- PodLab Portal — daily client digest (Hiram, 2026-10-07)
--
-- One email a day, only when something changed. Changes are found by diffing a
-- per-client snapshot instead of keeping history tables:
--   snapshot = { v: 1, boards: [board ids],
--                cards: { <card id>: { column, video_url, resolved_client_comment_ids[] } } }
-- Script/deliverable versions are compared by created_at > last_sent_at.
-- Written only by /api/cron/portal-digest with the service role.

create table if not exists public.portal_digest_state (
  client_id    uuid primary key references public.portal_clients(id) on delete cascade,
  last_sent_at timestamptz,
  snapshot     jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- Service role only: RLS on, no client policies.
alter table public.portal_digest_state enable row level security;
revoke all on public.portal_digest_state from anon, authenticated;
grant all on public.portal_digest_state to service_role;

-- The client's switch, on /portal/profile.
alter table public.portal_clients
  add column if not exists digest_opt_out boolean not null default false;
