# PodLab Client Portal — Module Architecture

**Written:** August 31, 2026
**Repo:** `sites/podlab-site`
**Supabase project:** `tncipuxobcbkwkmpcevt` (shared with `crm.podlablv.com`)
**Status of this doc:** Build plan. Nothing in Part 4 exists yet except where marked EXISTS.
**Companion:** [`PORTAL-EXPERIENCE.md`](./PORTAL-EXPERIENCE.md) — this doc is data and
modules; that one is design tokens, the science/game layer, and what the client feels.

This supersedes `PORTAL-BUILD.md`, which describes the March 2026 mock-data build and
is now wrong on its central claim — the portal reads live Supabase, not mock data.

---

## Executive summary

The portal already has the hard part right: a read-only client, RLS on every table, and
every write funneled through a service-role route that also writes the CRM timeline. That
seam is worth protecting.

What it does not have is a module boundary. There is one 313-line data provider that
fetches eleven tables on mount and never updates again. Every feature you add makes that
fetch fatter and the blast radius wider. Before payments, scripts, or file versioning get
built, that provider has to be broken into per-module hooks with their own realtime
subscriptions. That is Phase 0 and it is not optional.

After that, six modules in this order: **Payments → Scripts & Revisions → Deliverables →
Forms → CRM Sync → Reporting.** Payments first because money visibility pays for itself in
collections and killed "did you get my check" emails. Scripts second because it is the
highest client-facing value in the list and your existing skills already generate the
content that fills it.

---

## Part 1 — What exists today

Row counts probed live against the REST API on 2026-08-31. These are real, not estimates.

### Schema — 4 migrations, all applied

| Table | Rows | Purpose | Migration |
|---|---:|---|---|
| `portal_clients` | 1 | The client account. 1:1 with an auth user. | `20260811` |
| `portal_assets` | 5 | Deliverable files. A title and a URL. | `20260811` |
| `portal_projects` | 2 | Progress bars, stage index. | `20260811` |
| `portal_invoices` | 0 | Defined, never written to. | `20260811` |
| `portal_activity` | 6 | Dashboard feed. | `20260811` |
| `portal_report_metrics` | 0 | KPI dashboard. Empty by design — honest empty state. | `20260811` |
| `portal_comments` | 0 | Revision notes on the clarity document. | `20260811b` |
| `portal_action_items` | 4 | Client to-dos. | `20260811b` |
| `portal_intake_items` | 25 | Questionnaire definition. | `20260813` |
| `portal_intake_answers` | 0 | Autosaved answers. | `20260813` |
| `portal_delivery_phases` | 5 | The delivery plan the client watches. | `20260813` |
| `portal_delivery_tasks` | 0 | Sub-tasks under a phase. | `20260813` |
| `portal_delivery_templates` | 5 | Per-product phase templates (EssentialsLab only). | `20260813` |
| `portal_staff` | 1 | Who may edit delivery. `info@podlablv.com`. | `20260813` |

Related, outside the portal prefix:

| Table | Rows | Note |
|---|---:|---|
| `crm.leads` | 893 | The real CRM. Powers `crm.podlablv.com`. |
| `crm.activities` | 1,012 | Lead timeline. The portal already writes here. |
| `public.leads` | 81 | Marketing form captures. Separate from `crm.leads`. |
| `public.clients` | 32 | Upserted by marketing form routes. |
| `public.assessments` | 44 | Bottleneck assessment results. |
| `beaker_applications` | 7 | Affiliate signups + executed agreement evidence. |
| `podcast_applications` | 34 | Podcast guest applications. |

### Pages — 9, all `'use client'`

`app/portal/` — `page.tsx` (dashboard), `document/`, `intake/`, `delivery/`, `actions/`,
`deliverables/`, `progress/`, `reports/`, `invoices/`. Sidebar and auth gate live in
`app/portal/layout.tsx`. Shared card primitives in `components/portal/Shared.tsx`.

### API — 4 routes

`app/api/portal/` — `intake/`, `delivery/`, `comments/`, `action-items/`. All service-role.

### The security model (keep this)

Clients have **no write policies anywhere**. RLS grants `select` only, scoped by
`client_id in (select id from portal_clients where user_id = auth.uid())`. `anon` is
revoked on every portal table. Every mutation goes through a server route in
`lib/portal-server.ts` that resolves the bearer token, re-checks staff status server-side,
writes the row, pings Slack, and appends to `crm.activities` — one code path so "record it
and tell the team" cannot half-happen.

The `beaker_applications` work added a second pattern worth reusing: a **private storage
bucket** (`affiliate-agreements`, `public = false`, service-role only, short-lived signed
URLs) plus **signing evidence columns** (version, consent flag, IP, user agent). Both
patterns get reused below — file storage in Deliverables, evidence in Script Approvals.

---

## Part 2 — The four structural blockers

**1. There is no realtime. Anywhere.**
`lib/portal-data.tsx` runs one `Promise.all` of eleven queries on mount and stops. No
subscriptions, no polling, no refetch on focus. A client who leaves the tab open sees a
frozen portal. Every "updating in real time" requirement in the brief dies here.

**2. Three competing sources of truth for one human.**
Marketing forms write `public.leads` + `public.clients` (81 / 32 rows). The CRM app writes
`crm.leads` (893 rows). The Calendly, Typeform, and Stripe webhooks write Monday board
`18400694687`. The same person exists in all three under three different IDs with no key
between them. `portal_clients.crm_lead_id` is the only bridge and it is only populated by
the CLOSED WON trigger.

**3. Stripe is wired to Monday, not to the portal.**
`app/api/webhooks/stripe/route.ts` verifies the signature correctly, then promotes a Monday
item and returns. It never touches `portal_invoices` — which is why that table has zero
rows while real money has moved. It handles only `checkout.session.completed` and
`payment_intent.succeeded`; subscription and failed-payment events are acknowledged and
dropped.

**4. One user per client, and no staff console.**
`portal_clients.user_id` is a `unique` 1:1 FK to `auth.users`. A client cannot invite their
marketing manager or ops lead — the account is one login. On the staff side there is no
admin UI at all: editing happens through inline controls gated by `STAFF_EMAILS`, a
hardcoded array in `lib/portal-data.tsx`. Staff also cannot select a client, because the
provider does `.from('portal_clients').select('*').limit(1)` and leans on RLS to return the
caller's own row.

---

## Part 3 — The module contract

Every module ships the same six artifacts. Same shape every time, so a module can be built,
reviewed, and deleted independently.

```
supabase/migrations/<date>_portal_<module>.sql   tables, RLS select-only, broadcast trigger
app/api/portal/<module>/route.ts                 service-role writes, CRM activity, Slack
lib/portal/<module>.ts                           types + query functions
lib/portal/use<Module>.ts                        hook: initial fetch + its OWN realtime channel
app/portal/<module>/page.tsx                     client view
app/portal/admin/<module>/page.tsx               staff view
```

Four rules that hold across all of them:

1. **Clients never write.** RLS stays `select`-only. New module, same rule.
2. **Every mutation writes `portal_events`.** Activity feed, notifications, and the CRM
   timeline all read from that one table instead of each route hand-rolling three calls.
3. **Every module owns its own realtime channel.** No shared provider refetch.
4. **Versions are immutable.** Scripts and deliverables append a new version row. Nothing
   that a client has already seen is edited in place.

---

## Part 4 — The modules

### Phase 0 — Platform

Nothing else works properly until this lands. Three pieces.

#### 0a. Realtime bus

Use **broadcast from the database**, not `postgres_changes`. Postgres Changes needs less
setup but does not scale — Supabase's own current guidance is to attach a trigger calling
`realtime.broadcast_changes()` and subscribe on a private channel. One channel per client:
`portal:<client_id>`.

```sql
-- Generic broadcast trigger. Attach to any portal table that has a client_id column.
create or replace function public.portal_broadcast()
returns trigger
security definer
set search_path = ''
as $$
declare
  v_client_id uuid := coalesce(new.client_id, old.client_id);
begin
  if v_client_id is not null then
    perform realtime.broadcast_changes(
      'portal:' || v_client_id::text,  -- topic: one private channel per client
      tg_op,                           -- event
      tg_op,                           -- operation
      tg_table_name,                   -- table
      tg_table_schema,                 -- schema
      new,                             -- new record
      old                              -- old record
    );
  end if;
  return null;
end $$;

-- Attach to every client-scoped table. Idempotent.
do $$
declare t text;
begin
  foreach t in array array[
    'assets','projects','invoices','activity','report_metrics','comments',
    'action_items','intake_answers','delivery_phases','delivery_tasks'
  ]
  loop
    execute format('drop trigger if exists trg_broadcast on public.portal_%I', t);
    execute format(
      'create trigger trg_broadcast after insert or update or delete on public.portal_%I '
      'for each row execute function public.portal_broadcast()', t);
  end loop;
end $$;
```

`portal_clients` needs its own variant — its key is `id`, not `client_id`.

The authorization policy on `realtime.messages` is what keeps one client off another
client's channel. Supabase's documented example is `using (true)`, which is far too
permissive here — scope it to the topic:

```sql
create policy "portal clients receive own broadcasts"
on realtime.messages
for select to authenticated
using (
  realtime.topic() like 'portal:%'
  and split_part(realtime.topic(), ':', 2)::uuid in (
    select client_id from public.portal_client_users where user_id = auth.uid()
  )
);
```

> Verify `realtime.topic()` is available on this project's Realtime version before applying.
> If it is not, fall back to matching on the topic passed through `realtime.messages.topic`.

Client side, per module hook:

```ts
await supabase.realtime.setAuth()          // required for private channels
supabase
  .channel(`portal:${clientId}`, { config: { private: true } })
  .on('broadcast', { event: 'INSERT' }, apply)
  .on('broadcast', { event: 'UPDATE' }, apply)
  .on('broadcast', { event: 'DELETE' }, apply)
  .subscribe()
```

**Refactor:** delete the monolithic `Promise.all` in `lib/portal-data.tsx`. `PortalProvider`
keeps only identity — client row, access token, role — and each module hook fetches and
subscribes for itself.

#### 0b. Identity, roles, multi-user

```sql
-- A client account can have more than one login. Owner, teammate, viewer.
create table if not exists public.portal_client_users (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner',   -- owner | teammate | viewer
  invited_by text,
  created_at timestamptz default now(),
  unique (client_id, user_id)
);

-- Backfill from the existing 1:1 column, then keep portal_clients.user_id as legacy.
insert into public.portal_client_users (client_id, user_id, role)
select id, user_id, 'owner' from public.portal_clients where user_id is not null
on conflict do nothing;

alter table public.portal_staff
  add column if not exists role text not null default 'admin';  -- admin | producer | editor
```

Every RLS policy then moves from the `portal_clients.user_id` subquery to
`client_id in (select client_id from portal_client_users where user_id = auth.uid())`.
Do this once, across all tables, in the same migration.

`STAFF_EMAILS` in `lib/portal-data.tsx` gets deleted — the role comes from the session.

#### 0c. Event log

```sql
create table if not exists public.portal_events (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  module      text not null,             -- payments | scripts | deliverables | forms | delivery
  kind        text not null,             -- invoice.paid | script.approved | comment.added
  title       text not null,             -- one human line, shown in the feed
  detail      text,
  actor_name  text,
  actor_kind  text default 'system',     -- client | staff | system
  ref_id      uuid,                      -- the row this is about
  visible_to_client boolean default true,
  created_at  timestamptz default now()
);
create index if not exists portal_events_client_idx on public.portal_events(client_id, created_at desc);
```

One helper in `lib/portal-server.ts` writes the event, fans out to Slack, and appends to
`crm.activities`. Replaces the copy-pasted notify blocks in the four existing routes and
retires `portal_activity` (migrate its 6 rows in).

**Done when:** two browsers on the same client account see each other's changes without a
refresh; a staff account can switch clients; every existing route writes `portal_events`.

---

### Phase 1 — Payments

> **BUILT — Aug 31, 2026.** `20260901_portal_payments.sql`, the rewritten
> `app/api/webhooks/stripe/route.ts`, and `app/portal/invoices/page.tsx`.
> Migration not yet applied.
>
> **Required before this works:** `STRIPE_WEBHOOK_SECRET` must be set in Vercel.
> It is currently set in no environment, and the old route verified signatures
> only `if (STRIPE_WEBHOOK_SECRET)` — so production was accepting unsigned POSTs
> and creating Monday records from them. The route now fails closed, which means
> it returns 500 until the secret exists. That is deliberate: inert beats forgeable
> on an endpoint that writes financial records.

`portal_invoices` EXISTS but is empty and thin. Extend it, add two siblings, and rewrite
the Stripe webhook to actually feed it.

```sql
alter table public.portal_invoices
  add column if not exists stripe_invoice_id  text unique,
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_id    uuid,
  add column if not exists currency           text default 'usd',
  add column if not exists due_on             date,
  add column if not exists paid_at            timestamptz,
  add column if not exists hosted_invoice_url text,   -- Stripe-hosted "pay now"
  add column if not exists pdf_url            text,
  add column if not exists amount_paid_cents  int default 0,
  add column if not exists attempt_count      int default 0;

-- Retainers. ExpansionLab at $3,500/mo is the shape this exists for.
create table if not exists public.portal_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.portal_clients(id) on delete cascade,
  stripe_subscription_id text unique,
  product_label          text,
  amount_cents           int not null default 0,
  interval               text default 'month',
  status                 text default 'active',   -- active | past due | canceled | paused
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  started_on             date,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Individual movements of money, including the ones that failed.
create table if not exists public.portal_payments (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid not null references public.portal_clients(id) on delete cascade,
  invoice_id               uuid references public.portal_invoices(id) on delete set null,
  stripe_payment_intent_id text unique,
  stripe_charge_id         text,
  kind                     text default 'payment',    -- payment | refund | dispute
  amount_cents             int not null,
  status                   text default 'succeeded',  -- succeeded | failed | pending
  method_label             text,                      -- "Visa ending 4242"
  failure_reason           text,
  occurred_at              timestamptz default now(),
  created_at               timestamptz default now()
);
```

**Webhook rewrite** (`app/api/webhooks/stripe/route.ts`). Keep the existing Web Crypto
signature verification — it is correct, including the 5-minute replay tolerance. Replace the
Monday-only body with a real event map:

| Stripe event | Writes |
|---|---|
| `invoice.paid` | `portal_invoices` (status Paid, `paid_at`), `portal_payments`, event `invoice.paid` |
| `invoice.payment_failed` | invoice status Overdue, `portal_payments` (failed + reason), event, **Slack alert** |
| `invoice.finalized` | upsert invoice with `hosted_invoice_url` + `pdf_url` |
| `customer.subscription.created/updated/deleted` | `portal_subscriptions` |
| `charge.refunded` | `portal_payments` kind refund |
| `checkout.session.completed` | keep the existing lead-promotion path, plus write the invoice |

Match the Stripe customer to a portal client by `stripe_customer_id` first, email second.
Store `stripe_customer_id` on `portal_clients` when a client is provisioned.

**Never store card data.** "Pay now" is a link to `hosted_invoice_url`. The portal renders
status; Stripe renders the payment form.

**Client view:** what is owed, what is due next, one-click pay, receipts, full history.
**Staff view:** who is overdue and by how many days.

**Done when:** a real Stripe test invoice paid in the sandbox appears in the client's
Invoices tab within a second, with no refresh, and a `portal_events` row lands on the CRM
lead timeline.

---

### Phase 2 — Scripts & Revisions

The module you named that has no equivalent today. `portal_comments` is document-level and
unanchored — it cannot express "tighten line 14."

```sql
create table if not exists public.portal_scripts (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.portal_clients(id) on delete cascade,
  title           text not null,
  lab             text,
  kind            text default 'vsl',    -- vsl | hook | faq | short | founder
  status          text default 'draft',  -- draft | in review | changes requested | approved | shot | published
  current_version int  default 1,
  shoot_date      date,
  source          text,                  -- vsllab | hooklab | scriptbuilder | manual
  sort_order      int  default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Immutable. A revision is a new row, never an edit.
create table if not exists public.portal_script_versions (
  id              uuid primary key default gen_random_uuid(),
  script_id       uuid not null references public.portal_scripts(id) on delete cascade,
  client_id       uuid not null references public.portal_clients(id) on delete cascade,
  version_no      int  not null,
  body            text not null,          -- markdown, one block per paragraph
  word_count      int,
  runtime_seconds int,                    -- estimated at 150 wpm, so the client sees length
  author_name     text,
  author_kind     text default 'podlab',  -- podlab | client | ai
  note            text,                   -- "v3: tightened the open, cut the stat"
  created_at      timestamptz default now(),
  unique (script_id, version_no)
);

-- Anchored to a block, and carries the quoted text so the note survives a rewrite.
create table if not exists public.portal_script_comments (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.portal_script_versions(id) on delete cascade,
  script_id   uuid not null references public.portal_scripts(id) on delete cascade,
  client_id   uuid not null references public.portal_clients(id) on delete cascade,
  parent_id   uuid references public.portal_script_comments(id) on delete cascade,
  block_index int,                        -- null = a note on the whole script
  quoted_text text,
  body        text not null,
  author_name text not null,
  author_kind text not null default 'client',
  status      text default 'open',        -- open | resolved
  resolved_at timestamptz,
  created_at  timestamptz default now()
);

-- Same evidence shape as the executed Beaker agreements. One approval per version.
create table if not exists public.portal_script_approvals (
  id                   uuid primary key default gen_random_uuid(),
  version_id           uuid not null references public.portal_script_versions(id) on delete cascade,
  client_id            uuid not null references public.portal_clients(id) on delete cascade,
  approved_by_name     text not null,
  approved_by_email    text,
  approved_ip          text,
  approved_user_agent  text,
  approved_at          timestamptz default now(),
  unique (version_id)
);
```

**The multiplier: your skills already write this content.** `vsllab`, `hooklab`,
`scriptbuilder`, and `realtorlab-pack` all produce scripts today and drop them into files.
Give them a write path — `POST /api/portal/scripts` inserting the script plus version 1 —
and generation lands in the client's portal instead of a PDF someone has to email.

**Flow:** PodLab posts v1 → status `in review` → client comments inline → status
`changes requested` → PodLab posts v2 answering the open comments → client approves →
`approved`, locked, teleprompter view unlocked for the shoot. Comments carry forward to the
new version by `quoted_text` match, and any that no longer match get flagged rather than
silently dropped.

**Done when:** a client leaves a comment on line 14 and it appears on the producer's screen
live; approving v3 locks it and puts an entry on the CRM lead.

---

### Phase 3 — Deliverables & Files

`portal_assets` EXISTS, holding 5 rows of title-plus-URL. It has no versions, no real file
storage, and no approval.

```sql
alter table public.portal_assets
  add column if not exists status_detail   text,
  add column if not exists current_version int default 1,
  add column if not exists approved_at     timestamptz,
  add column if not exists approved_by     text;

create table if not exists public.portal_asset_versions (
  id           uuid primary key default gen_random_uuid(),
  asset_id     uuid not null references public.portal_assets(id) on delete cascade,
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  version_no   int  not null,
  storage_path text,                     -- object path inside client-deliverables. Never a public URL.
  external_url text,                     -- for things that genuinely live elsewhere
  size_bytes   bigint,
  mime_type    text,
  note         text,
  uploaded_by  text,
  created_at   timestamptz default now(),
  unique (asset_id, version_no)
);

-- Timestamped notes, so "the cut at 0:42 is long" is a real object.
create table if not exists public.portal_asset_comments (
  id           uuid primary key default gen_random_uuid(),
  version_id   uuid not null references public.portal_asset_versions(id) on delete cascade,
  client_id    uuid not null references public.portal_clients(id) on delete cascade,
  time_seconds numeric,                  -- null for non-video
  body         text not null,
  author_name  text not null,
  author_kind  text default 'client',
  status       text default 'open',
  created_at   timestamptz default now()
);

-- Private, exactly like affiliate-agreements. Signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-deliverables', 'client-deliverables', false, 524288000)  -- 500 MB
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
```

**Video caveat, from `CLAUDE.md`:** never let a raw `*-original.mp4` into this bucket.
Compress first. A 500 MB ceiling is for finished cuts, not masters. Long-form video should
stay on YouTube/Vimeo behind `external_url` — Supabase Storage egress is not a CDN plan.

Note that Vercel Functions now accept 100 MB request bodies, so a direct upload route is
viable for documents and short cuts. Anything larger should use a signed upload URL and go
browser-to-storage without touching a function.

**Done when:** staff uploads v2 of a video, the client sees it appear live with a version
picker, leaves a note at 0:42, and approves — all of it on the CRM timeline.

---

### Phase 4 — Forms

Generalize `portal_intake_items` / `portal_intake_answers` (which already work, with
autosave) into a form engine, then point the seven public forms at it so "track forms" is
one query.

```sql
create table if not exists public.portal_forms (
  id          uuid primary key default gen_random_uuid(),
  form_key    text not null unique,       -- assetslab-intake | bottleneck | essentialslab | contact
  title       text not null,
  description text,
  audience    text default 'client',      -- client | public
  active      boolean default true,
  created_at  timestamptz default now()
);

create table if not exists public.portal_form_fields (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references public.portal_forms(id) on delete cascade,
  section    text,
  prompt     text not null,
  help       text,
  kind       text not null default 'longtext',  -- text | longtext | choice | url | number
  options    jsonb,
  required   boolean default false,
  sort_order int default 0
);

create table if not exists public.portal_form_submissions (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.portal_forms(id) on delete cascade,
  client_id    uuid references public.portal_clients(id) on delete cascade,
  crm_lead_id  uuid,                       -- public submissions have no portal client yet
  email        text,
  status       text default 'in progress', -- sent | opened | in progress | submitted | reviewed
  sent_at      timestamptz,
  opened_at    timestamptz,
  submitted_at timestamptz,
  reviewed_at  timestamptz,
  created_at   timestamptz default now()
);

create table if not exists public.portal_form_answers (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.portal_form_submissions(id) on delete cascade,
  field_id      uuid not null references public.portal_form_fields(id) on delete cascade,
  value         text,
  updated_at    timestamptz default now(),
  unique (submission_id, field_id)
);
```

Migrate the 25 `portal_intake_items` rows into `portal_form_fields` under a
`client-intake` form. Keep the existing autosave route behavior — it works.

**SMS consent stays intact.** Every public form already writes the
`sms_consent` / `sms_consent_at` / `sms_consent_source` triple for A2P 10DLC. That shape
must survive the migration on every form that takes a phone number; a carrier audit needs
to read one pattern.

**Done when:** one staff screen shows every form, every client, and where each one stopped.

---

### Phase 5 — CRM Sync

**Decision required: `crm.leads` is canonical.** It has 893 rows against `public.leads`'s 81,
and it backs a shipped app. Everything else becomes a writer or a mirror.

Work:

1. Point the marketing form routes at `crm.leads` (upsert by lowered email) instead of
   `public.leads` + `public.clients`. Keep writing `raw_responses`.
2. Backfill: match the 81 `public.leads` and 32 `public.clients` into `crm.leads` by email,
   then leave those tables read-only rather than dropping them.
3. Monday becomes a downstream mirror driven by `portal_events`, not a parallel truth. The
   board ID is hardcoded in three webhook routes — move it to an env var on the way through.
4. Extend the existing `portal_seed_from_won_lead()` trigger to also seed the Stripe
   customer, the default script set for the product, and the intake form submission.
5. Add `portal_clients.stripe_customer_id` so payments can match without an email lookup.

**Done when:** a person exists once, and stage changes in either direction propagate.

---

### Phase 6 — Reporting, Notifications, Admin console

**Reporting.** `portal_report_metrics` EXISTS and is empty on purpose. Feed it on a Vercel
cron from the ad platforms, keyed by `period_label`. The Reports page UI already renders a
funnel, money row, and content scoreboard — it needs data, not a rebuild.

**Notifications.**

```sql
create table if not exists public.portal_notifications (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.portal_clients(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,  -- null = whole account
  event_id   uuid references public.portal_events(id) on delete cascade,
  title      text not null,
  href       text,
  read_at    timestamptz,
  created_at timestamptz default now()
);
```

Driven entirely off `portal_events`. In-app bell via the existing realtime channel, email
through `lib/notifications.ts` (Resend, already built), Slack through `notifySlack`.

**Admin console.** `app/portal/admin/` — client switcher, then one page per module. This is
the surface you actually work from, and it does not exist today.

---

## Part 5 — Build order

| Phase | Module | Depends on | Why here |
|---|---|---|---|
| 0 | Platform: realtime, roles, events | — | Everything else assumes it |
| 1 | Payments | 0 | Money visibility; collections; kills status emails |
| 2 | Scripts & Revisions | 0 | Highest client-facing value; skills already feed it |
| 3 | Deliverables & Files | 0, 2 | Reuses the version + approval pattern from Scripts |
| 4 | Forms | 0 | Mostly consolidation of things that already work |
| 5 | CRM Sync | 1, 4 | Needs payments and forms landed to be worth unifying |
| 6 | Reporting, Notifications, Admin | 0, 5 | Reads everything above |

Phases 1 and 2 are independent of each other and can run in parallel once 0 is in.

---

## Part 6 — Decisions needed

1. **Does `crm.leads` win?** This doc assumes yes. If Monday is meant to stay the operating
   surface, Phase 5 inverts and the portal writes Monday first.
2. **Stripe subscriptions or invoices for retainers?** The mock data models a $3,500/mo
   client paid as two $1,500 splits, which is neither. Pick one before Phase 1.
3. **Where does finished video live?** Supabase Storage is fine for documents and short
   cuts; long-form belongs on YouTube/Vimeo behind `external_url`.
4. **Client teammates — invite flow or staff-provisioned?** Affects whether Phase 0b needs
   an invite email path or just an admin screen.
5. **Does the client see the delivery plan and the script queue, or only what is ready?**
   Changes how much of `portal_delivery_*` is exposed.

---

## Appendix — Re-verify current state

```bash
set -a; . ./.env.local; set +a
U="$NEXT_PUBLIC_SUPABASE_URL"; K="$SUPABASE_SERVICE_ROLE_KEY"

# Row count for any portal table
curl -sI "$U/rest/v1/portal_clients?select=*" \
  -H "apikey: $K" -H "Authorization: Bearer $K" \
  -H "Range: 0-0" -H "Prefer: count=exact" | grep -i content-range

# Same against the crm schema
curl -sI "$U/rest/v1/leads?select=*" \
  -H "apikey: $K" -H "Authorization: Bearer $K" -H "Accept-Profile: crm" \
  -H "Range: 0-0" -H "Prefer: count=exact" | grep -i content-range
```

---

**Sources for the realtime approach:**
[Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast) ·
[Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) ·
[Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)

**Last updated:** August 31, 2026
