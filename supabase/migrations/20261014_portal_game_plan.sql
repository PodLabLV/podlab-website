-- PodLab Portal — Game Plan (Hiram, 2026-10-08)
--
-- One living 90-day plan per client, per pillar (People, Operations, Sales,
-- Marketing, Content): the outcome as a number, three priorities, and where it
-- stands. The weekly actions stay in portal_action_items (source "Game Plan ·
-- <pillar>"); this table holds the plan they roll up to.
--
-- Same model as the rest of the portal: clients read their own rows through
-- RLS and never write; TipTop and staff write through server routes.
-- Additive and idempotent: safe to run twice.

create table if not exists public.portal_game_plans (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  pillar      text not null check (pillar in ('People', 'Operations', 'Sales', 'Marketing', 'Content')),
  outcome     text not null,             -- "4 more cohort seats by Nov 30"
  metric      text,                      -- what gets counted: "seats sold"
  baseline    numeric,                   -- where it started
  target      numeric,                   -- the number to hit
  current     numeric,                   -- latest check-in
  due_on      date,                      -- the 90-day finish line
  priorities  jsonb not null default '[]'::jsonb,  -- ["Offer page", "Warm list", "Follow-up cadence"]
  status      text not null default 'on track' check (status in ('on track', 'at risk', 'off track', 'done')),
  last_check_in_at timestamptz,
  last_check_in    text,                 -- one line from the latest weekly check-in
  updated_by  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (client_id, pillar)
);

alter table public.portal_game_plans enable row level security;
drop policy if exists own_rows on public.portal_game_plans;
create policy own_rows on public.portal_game_plans for select to authenticated
  using (client_id in (select id from public.portal_clients where user_id = auth.uid()));
grant select on public.portal_game_plans to authenticated;
grant all on public.portal_game_plans to service_role;
revoke all on public.portal_game_plans from anon;
