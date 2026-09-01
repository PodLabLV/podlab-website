-- ============================================================
-- Portal Phase 1 — Payments
--
-- portal_invoices has existed since 20260811 and holds zero rows, because the
-- Stripe webhook writes to Monday.com and stops. Real money has moved and none
-- of it is visible in the portal. This makes that table the record.
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

-- ── 1. Stripe identity on the client ─────────────────────────────────
-- Matching by customer id is exact; matching by email is a guess that breaks
-- the moment someone pays from a personal address. Store the id at provisioning.
alter table public.portal_clients
  add column if not exists stripe_customer_id text;

create unique index if not exists portal_clients_stripe_customer_idx
  on public.portal_clients (stripe_customer_id)
  where stripe_customer_id is not null;

-- ── 2. Invoices, extended ────────────────────────────────────────────
alter table public.portal_invoices
  add column if not exists stripe_invoice_id  text,
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_id    uuid,
  add column if not exists currency           text default 'usd',
  add column if not exists due_on             date,
  add column if not exists paid_at            timestamptz,
  add column if not exists hosted_invoice_url text,
  add column if not exists pdf_url            text,
  add column if not exists amount_paid_cents  int default 0,
  add column if not exists attempt_count      int default 0,
  add column if not exists updated_at         timestamptz default now();

-- The webhook upserts on this. Partial, because rows seeded by hand have no
-- Stripe id and several nulls must not collide.
create unique index if not exists portal_invoices_stripe_idx
  on public.portal_invoices (stripe_invoice_id)
  where stripe_invoice_id is not null;

comment on column public.portal_invoices.hosted_invoice_url is
  'Stripe-hosted payment page. The portal renders status; Stripe renders the card form. No card data ever touches this database.';

-- ── 3. Subscriptions ─────────────────────────────────────────────────
create table if not exists public.portal_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.portal_clients(id) on delete cascade,
  stripe_subscription_id text unique,
  product_label          text,
  amount_cents           int  not null default 0,
  interval               text default 'month',
  status                 text default 'active',   -- active | past due | canceled | paused
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  started_on             date,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── 4. Payments ──────────────────────────────────────────────────────
create table if not exists public.portal_payments (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid not null references public.portal_clients(id) on delete cascade,
  invoice_id               uuid references public.portal_invoices(id) on delete set null,
  stripe_payment_intent_id text,
  stripe_charge_id         text,
  kind                     text default 'payment',    -- payment | refund | dispute
  amount_cents             int  not null,
  status                   text default 'succeeded',  -- succeeded | failed | pending
  method_label             text,                      -- "Visa ending 4242". Never a full number.
  failure_reason           text,
  occurred_at              timestamptz default now(),
  created_at               timestamptz default now()
);

-- A payment intent can legitimately produce several rows (a failed attempt then
-- a success), so the uniqueness is per intent AND status, not per intent.
create unique index if not exists portal_payments_intent_idx
  on public.portal_payments (stripe_payment_intent_id, status)
  where stripe_payment_intent_id is not null;

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
