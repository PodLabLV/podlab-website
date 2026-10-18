-- Portal v2, track D (docs/PORTAL-V2.md): the TipTop tab and notification delivery.
--
-- 1. portal_tiptop_profile — TipTop's working understanding of the business
--    (business, offer, audience, numbers, goal, constraint…), one row per
--    client. She writes it as she asks questions; the client sees it on the
--    TipTop tab and can ask her to correct it.
-- 2. portal_action_items.due_on — a real due date, so the weekly check-in can
--    name what is overdue (the "due Oct 20" label in effort stays for display).
-- 3. SMS consent on portal_clients — when and how they opted in, and when they
--    texted STOP. A trigger stamps sms_consent_at whenever notify_sms turns on,
--    whatever code path turns it on, so the audit trail never depends on a UI.
-- 4. An index for the delivery cron (rows not yet emailed / texted).
--
-- Additive and idempotent: safe to run twice. Writes stay server-side
-- (service role); clients read their own rows through RLS.

-- ------------------------------------------------------------ 1. understanding
create table if not exists public.portal_tiptop_profile (
  client_id   uuid primary key references public.portal_clients(id) on delete cascade,
  facts       jsonb not null default '{}'::jsonb,   -- { business: {value, at}, offer: {...}, ... }
  updated_by  text,
  updated_at  timestamptz not null default now()
);

alter table public.portal_tiptop_profile enable row level security;
drop policy if exists own_rows on public.portal_tiptop_profile;
create policy own_rows on public.portal_tiptop_profile for select to authenticated
  using (client_id in (select public.portal_my_client_ids()));
grant select on public.portal_tiptop_profile to authenticated;
grant all on public.portal_tiptop_profile to service_role;
revoke all on public.portal_tiptop_profile from anon;

-- ------------------------------------------------------------- 2. due dates
alter table public.portal_action_items add column if not exists due_on date;
create index if not exists portal_action_items_open_due_idx
  on public.portal_action_items (client_id, due_on) where status is distinct from 'done';

-- ------------------------------------------------------------- 3. SMS consent
alter table public.portal_clients add column if not exists sms_consent_at timestamptz;
alter table public.portal_clients add column if not exists sms_consent_source text;
alter table public.portal_clients add column if not exists sms_opted_out_at timestamptz;

create or replace function public.portal_clients_sms_consent()
returns trigger language plpgsql as $$
begin
  if new.notify_sms and (tg_op = 'INSERT' or not coalesce(old.notify_sms, false)) then
    new.sms_consent_at := now();
    if tg_op = 'UPDATE' and new.sms_consent_source is not distinct from old.sms_consent_source then
      new.sms_consent_source := 'portal/profile';
    end if;
    new.sms_consent_source := coalesce(new.sms_consent_source, 'portal/profile');
    new.sms_opted_out_at := null;            -- turning it back on in the portal is a fresh opt-in
  end if;
  return new;
end;
$$;

drop trigger if exists trg_portal_clients_sms_consent on public.portal_clients;
create trigger trg_portal_clients_sms_consent
  before insert or update of notify_sms on public.portal_clients
  for each row execute function public.portal_clients_sms_consent();

-- -------------------------------------------------------------- 4. delivery
create index if not exists portal_notifications_undelivered_idx
  on public.portal_notifications (created_at) where emailed_at is null or texted_at is null;

notify pgrst, 'reload schema';

-- TO UNDO:
--   drop trigger if exists trg_portal_clients_sms_consent on public.portal_clients;
--   drop function if exists public.portal_clients_sms_consent();
--   drop index if exists public.portal_notifications_undelivered_idx;
--   drop index if exists public.portal_action_items_open_due_idx;
--   alter table public.portal_clients drop column if exists sms_consent_at, drop column if exists sms_consent_source, drop column if exists sms_opted_out_at;
--   alter table public.portal_action_items drop column if exists due_on;
--   drop table if exists public.portal_tiptop_profile;
