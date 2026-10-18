-- Portal v2 core (docs/PORTAL-V2.md): the two tables every tab shares.
--
-- portal_notifications — the "hot potato" in the top-right corner, and what
--   gets emailed / texted. One row per thing the client should know:
--   direction 'done'    = what PodLab did ("Your VSL cut is ready")
--   direction 'waiting' = what we're waiting on THEM for ("Approve 2 scripts")
--   A 'waiting' row stays until resolved_at is set (the thing got done).
-- portal_credit_ledger — the edit-credit wallet. Balance = sum(delta).
--   Purchases add, footage submissions subtract, staff can adjust. Never
--   updated or deleted: a correction is a new row.

create table if not exists public.portal_notifications (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  kind         text not null,                       -- review_ready, approved, payment, credits, onboarding, message, delivered…
  direction    text not null check (direction in ('done', 'waiting')),
  title        text not null,
  body         text,
  link         text,                                -- portal path, e.g. /portal/projects?item=…
  ref          text,                                -- dedupe key, e.g. asset:<id>:v3
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  resolved_at  timestamptz,                         -- 'waiting' rows: the client did it
  emailed_at   timestamptz,
  texted_at    timestamptz,
  unique (client_id, ref)
);
create index if not exists portal_notifications_feed_idx on public.portal_notifications (client_id, created_at desc);
create index if not exists portal_notifications_open_idx on public.portal_notifications (client_id) where direction = 'waiting' and resolved_at is null;

create table if not exists public.portal_credit_ledger (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  delta       integer not null check (delta <> 0),
  reason      text not null,                        -- purchase, submission, refund, adjustment, expired
  ref         text unique,                          -- payment id / submission id: one row per real event
  expires_on  date,                                 -- purchases: 90 days (monthly: 1 month rollover)
  note        text,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists portal_credit_ledger_client_idx on public.portal_credit_ledger (client_id, created_at desc);

create or replace view public.portal_credit_balance with (security_invoker = true) as
  select client_id, coalesce(sum(delta), 0)::int as balance from public.portal_credit_ledger group by client_id;

-- Notification delivery preferences live on the client row.
alter table public.portal_clients add column if not exists notify_email boolean not null default true;
alter table public.portal_clients add column if not exists notify_sms boolean not null default false;
alter table public.portal_clients add column if not exists onboarding_completed_at timestamptz;

alter table public.portal_notifications enable row level security;
alter table public.portal_credit_ledger enable row level security;
grant all on public.portal_notifications, public.portal_credit_ledger to service_role;
grant select on public.portal_credit_balance to service_role;

notify pgrst, 'reload schema';

-- TO UNDO: drop view if exists public.portal_credit_balance; drop table if exists public.portal_credit_ledger, public.portal_notifications;
--   alter table public.portal_clients drop column if exists notify_email, drop column if exists notify_sms, drop column if exists onboarding_completed_at;
