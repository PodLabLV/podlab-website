-- ============================================================
-- Portal Phase 1 — Payments
--
-- portal_invoices has existed since 20260811. This makes it, and the two
-- tables below, the client-facing record of money. (Written for Stripe;
-- rewritten processor-neutral for Whop before it was ever applied.)
--
-- Three shapes:
--   portal_invoices      — what was billed (extended below)
--   portal_subscriptions — recurring retainers
--   portal_payments      — individual movements, INCLUDING the failures
--
-- Failed charges get a row on purpose. An invoice that silently stays "Pending"
-- because a card expired is the single most expensive kind of missing data in
-- a service business.
--
-- Run AFTER 20260831_portal_roles.sql (RLS reads portal_client_users) and
-- 20260831c_portal_realtime.sql (the broadcast function is defined there).
--
-- Safe + additive. Every statement is idempotent.
-- ============================================================

-- ── 1. Processor identity ────────────────────────────────────────────
-- REWRITTEN 2026-09-27, before this file was ever applied: Whop replaced
-- Stripe. Every processor id is now `processor` + `external_id`, so the next
-- processor change is a data change, not a migration. There is no customer-id
-- column on portal_clients any more: the CRM matches a payment to its client
-- through portal_clients.crm_lead_id, and it is the CRM's Whop webhook that
-- writes these tables (podlab-crm, src/app/api/webhooks/whop).
--
-- podlab-crm phase103 already added the invoice columns below in production;
-- every statement here is `if not exists`, so this file is a no-op for them.

-- ── 2. Invoices, extended ────────────────────────────────────────────
alter table public.portal_invoices
  add column if not exists processor          text,
  add column if not exists external_id        text,
  add column if not exists crm_link_id        uuid,
  add column if not exists subscription_id    uuid,
  add column if not exists currency           text default 'usd',
  add column if not exists due_on             date,
  add column if not exists paid_at            timestamptz,
  add column if not exists hosted_invoice_url text,
  add column if not exists pdf_url            text,
  add column if not exists amount_paid_cents  int default 0,
  add column if not exists attempt_count      int default 0,
  add column if not exists updated_at         timestamptz default now();

-- The webhook writes on this. Partial, because rows seeded by hand have no
-- processor id and several nulls must not collide. Same name as phase103.
create unique index if not exists portal_invoices_external_idx
  on public.portal_invoices (processor, external_id)
  where external_id is not null;

comment on column public.portal_invoices.hosted_invoice_url is
  'Processor-hosted payment page (Whop pay_online_url). The portal renders status; the processor renders the card form. No card data ever touches this database.';

-- ── 3. Subscriptions ─────────────────────────────────────────────────
create table if not exists public.portal_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.portal_clients(id) on delete cascade,
  processor              text not null default 'whop',
  external_id            text,                    -- Whop membership id
  product_label          text,
  amount_cents           int  not null default 0,
  interval               text default 'month',
  status                 text default 'active',   -- active | past due | canceled | paused
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  started_on             date,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now(),
  unique (processor, external_id)
);

-- ── 4. Payments ──────────────────────────────────────────────────────
create table if not exists public.portal_payments (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid not null references public.portal_clients(id) on delete cascade,
  invoice_id               uuid references public.portal_invoices(id) on delete set null,
  processor                text not null default 'whop',
  external_id              text,                  -- Whop payment id
  kind                     text default 'payment',    -- payment | refund | dispute
  amount_cents             int  not null,
  status                   text default 'succeeded',  -- succeeded | failed | pending
  method_label             text,                      -- "Visa ending 4242". Never a full number.
  failure_reason           text,
  occurred_at              timestamptz default now(),
  created_at               timestamptz default now()
);

-- A payment can legitimately produce several rows (a failed attempt then a
-- success), so the uniqueness is per payment AND status, not per payment.
create unique index if not exists portal_payments_external_idx
  on public.portal_payments (processor, external_id, status)
  where external_id is not null;

create index if not exists portal_subscriptions_client_idx on public.portal_subscriptions(client_id);
create index if not exists portal_payments_client_idx      on public.portal_payments(client_id, occurred_at desc);
create index if not exists portal_invoices_due_idx         on public.portal_invoices(client_id, due_on);

-- ── 5. RLS — select only, membership scoped ──────────────────────────
do $$
declare t text;
begin
  foreach t in array array['subscriptions','payments']
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
-- A payment landing should move the client's screen without a refresh.
do $$
declare t text;
begin
  foreach t in array array['subscriptions','payments']
  loop
    execute format('drop trigger if exists trg_portal_broadcast on public.portal_%I', t);
    execute format(
      'create trigger trg_portal_broadcast after insert or update or delete on public.portal_%I '
      'for each row execute function public.portal_broadcast()', t);
  end loop;
end $$;
