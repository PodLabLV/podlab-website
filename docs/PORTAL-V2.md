# Portal v2 — four tabs (Hiram, 2026-10-18)

**Goal:** the client portal is too busy. Collapse ~15 pages into four tabs a client understands at a
glance, plus a profile menu and a notifications bell. Everything already built stays reachable;
nothing a client relies on is deleted. Read `docs/PORTAL-HUB.md` first — it maps every existing page,
table and component, most of which v2 reuses.

## The shell

```
┌───────────────────────────────────────────────────────────────────────┐
│ PodLab PORTAL      Dashboard  TipTop  Assets  Projects      [🔥 3]     │ ← hot potato (top right)
│                                                                       │
│                         (tab content)                                 │
│                                                                       │
│ [JD] Jane Doe ▾  ← profile (bottom left): email, password, credits,   │
│                    payments, team, notifications, sign out            │
└───────────────────────────────────────────────────────────────────────┘
```
Mobile: tabs become a bottom bar; profile and hot potato stay in the header. No emojis in UI (SVG
icons only — PodLab rule). Brand: podlablv.com portal styling already in the repo.

| Route | Tab | Owner track |
|---|---|---|
| `/portal` | **Dashboard** | A |
| `/portal/tiptop` | **TipTop** | D |
| `/portal/assets` | **Assets** | C |
| `/portal/projects` | **Projects** | B |
| `/portal/profile` | Profile (bottom-left menu) | A |
| `/portal/welcome` | First-login onboarding (not a tab) | C |

Old routes (`/portal/deliverables`, `/scripts`, `/brand`, `/intake`, `/delivery`, `/progress`,
`/reports`, `/invoices`, `/actions`, `/document`, `/forms`…) keep working; v2 nav simply doesn't list
them, and each new tab links into the existing detail views where those are better than a rebuild
(e.g. a script opens `/portal/scripts/[id]`, a cut opens the existing player with timestamped notes).
Staff/admin view (`/portal/admin`) is unchanged.

## Tabs

**Dashboard (A)** — "where am I": project progress (delivery phases + their CRM boards' stage from
`crm.content_boards.stage`), payments (`portal_invoices`), KPIs & targets (`portal_game_plans`
metric/baseline/target/current + `portal_report_metrics`), credit balance (`portal_credit_balance`)
with Buy credits, **What we're waiting on you for** (open `waiting` notifications), and their
**referral link** (Beaker affiliate program — reuse `lib/beaker-ref.ts`; link + what they earn).

**TipTop (D)** — full-page chat (reuse `lib/tiptop/*`, `portal_tiptop_threads`). Role, in order:
understand the business (asks questions, saves answers to intake/profile), map the action plan
(writes `portal_action_items` + `portal_game_plans` targets), build assets (queues generation jobs,
see C), support (answers from their account), accountability (weekly check-in on targets and open
items; nudges via notifications). Books calls (existing tool). The floating launcher on other tabs
stays.

**Assets (C)** — the library the team works from: profile summary (business, offer, audience from
intake / AssetsLab), docs (Clarity Document, AssetsLab PDF, brand kit, scripts once approved),
branding (logos, colors, fonts, style guide — reuse the Brand page + Drive uploads), b-roll, finished
videos (approved/delivered `portal_assets`). Uploads go to the client's Drive folder exactly like the
logo upload does today (`lib/portal/drive.ts`).

**Projects (B)** — everything that needs review, edits or approval in one list: scripts, cuts/videos
(CRM board cards + `portal_assets` versions), docs (AssetsLab PDF, VSL pack, brand kit), landing pages
(link + approve). Filters: Needs you · In progress · Approved. Approve / request changes reuse the
existing evidence-capturing flows. **Submit footage for editing:** pick an edit type, upload to Drive
(same mechanism as brand uploads) or paste a link, spend credits → a card is created on their CRM
content board (`crm.content_cards`, list "Editing") and a ledger row debits the credits.

## Credits (B)

| Pack | Price | Per credit |
|---|---|---|
| 1 credit | $250 | $250 |
| 3 credits | $600 | $200 |
| 8 credits | $1,400 | $175 |
| Monthly: 10 credits/mo | $1,500/mo | $150 (rollover capped at 1 month) |

What a credit buys: **1** = short-form edit (≤90s vertical, captions, 2 revision rounds) · **2** =
long-form / VSL edit · **4** = premium edit + FAQs · **+1** = rush (48h) or extra revision round.
Packs expire after 90 days. Pricing lives in ONE shared file (`lib/portal/credits.ts`). Purchase =
Whop checkout (payments are Whop-only); the grant is a ledger row written when the payment lands
(Whop webhook lives in the CRM repo, `podlab-crm/src/app/api/webhooks/whop`; key the grant by Whop
payment id so retries can't double-credit).

## Onboarding + generation (C)

First login → `/portal/welcome`: (1) AssetsLab intake — rebuilt from the current AssetsLab form,
prefilled from the free-VSL application (`crm.leads` columns) so they only answer what's missing,
saves as they type; (2) branding — upload logo/colors/fonts, OR "I need help" → short brand
questionnaire for the brandkit skill; (3) done → `onboarding_completed_at`.
On submit, a **generation job** is queued (`portal_jobs`, C owns the table): AssetsLab PDF always;
VSL pack (script, confirmation, FAQ scripts) when they have a VSL shoot booked; brand kit when they
asked for help. Jobs run on the Mac mini (Hermes cron, like the pre-interview prep automation) via
`claude -p` with the existing skills (`assetslab`, `vsllab`, `brandkit`), and the outputs land in
Drive + `portal_assets` so they appear in **Projects** for review. Approved items flow to their
place (brand kit → Assets/branding, AssetsLab → Assets/docs + profile summary).

## Notifications (D writes delivery; everyone writes rows)

Any event a client should know about inserts a `portal_notifications` row (use `ref` to dedupe).
The hot potato (A) shows unread `done` rows and open `waiting` rows. Delivery (D): email via the
existing portal email (`lib/portal-email.ts`) and SMS via Twilio when `notify_sms` (respect STOP,
8am–9pm client timezone), batched so a client gets one message per burst, not ten.

## Team logins (A)

`portal_client_members` exists (invite by email, role). Profile → Team: owners invite teammates,
see who has access, remove. Every member sees the same client portal.

## Rules for every track

- Next 15 App Router, TypeScript, Tailwind, existing patterns. `npx tsc --noEmit` and `npm run build`
  must pass (this repo uses **npm** + package-lock.json — never create a pnpm lockfile).
- Migrations: one file per track, `supabase/migrations/20261018_portal_v2_<track>.sql`, additive only,
  RLS on + the same client read policy pattern as `20261017_portal_client_members.sql`, test inside
  `begin; … rollback;` first, apply with `node ~/Desktop/podlab-crm-setter/scripts/run-migration.mjs`.
- Shared tables (`portal_notifications`, `portal_credit_ledger`, `portal_credit_balance`) already
  exist (`20261018_portal_v2_core.sql`) — don't recreate them.
- Never send a real email/SMS or charge anything while building. No production deploys.

## Track D as built (TipTop tab + notification delivery)

- **`/portal/tiptop`**: the launcher's thread full-page (`TipTopThread` in `TipTopPanel.tsx`), beside a strip
  (`TipTopStrip.tsx`, data from `GET /api/portal/tiptop/context`): her notes on the business, Game Plan targets
  with pace, open action items with due dates (past due flagged), builds. The floating launcher hides on this
  route; `tiptop:open` events and `?ask=` send prompts into the page's chat. View-as shows the strip read-only.
- **New TipTop tools**: `remember_business` (her notes, `portal_tiptop_profile`; no confirm card, visible on the
  tab), `update_action_items` (title/detail/due, confirm), `queue_asset_build` (`portal_jobs` row: kind
  assetslab|vsl_pack|brand_kit, input `{brief, source, requested_by}`; one active per kind, max 4 per 30 days;
  denied with a "flag it" reason while the table is missing). Prompt: "Your four jobs" section.
- **Weekly check-in**: `/api/cron/tiptop-checkin`, Mondays 16:00 UTC. Active clients with a live plan or open
  items get a data-written opener in their thread (id `checkin-<ISO week>`, no model call) and a `waiting`
  notification (`checkin:<week>`), resolved when they reply or log a check-in. `?dry=1` previews.
- **Delivery**: `/api/cron/portal-notify`, every 15 min. Per client: one email (and one text) per burst
  (burst settles after 10 min quiet, never held over 60 min), max one of each per hour, rows from the last 48 h,
  skips read rows and resolved `waiting` rows. Email needs `notify_email` and not `digest_opt_out`; SMS needs
  `notify_sms`, `sms_consent_at` (stamped by a trigger whenever notify_sms turns on), no `sms_opted_out_at`,
  an E.164-able phone, Twilio env, and 8am–9pm in `portal_clients.timezone`. Rows are claimed before sending
  and released on failure. Twilio error 21610 and inbound STOP (`/api/twilio/portal-sms`, signature-checked)
  turn SMS off. `?dry=1` previews. Logic: `lib/portal/notify-delivery.ts` (`npm run test:notify`).
- Migration `20261018_portal_v2_d.sql` (applied): `portal_tiptop_profile`, `portal_action_items.due_on`,
  SMS consent columns + trigger, delivery index.

## Track E as built (Beaker tab)

**Who sees it.** `resolveBeaker()` (`lib/portal/beaker-account.ts`) matches the signed-in user to an approved
`crm.affiliates` row of kind `affiliate` (JV partners stay in the CRM), in order: `profile_id` = their auth user id
(the login the CRM creates when it approves a Beaker, same Supabase project, same password), their login email
once confirmed, or, for an account owner, their `portal_clients.email`. Nothing in a request can name an affiliate.
`/api/portal/whoami` now returns `{ staff, beaker }`; `usePortal().isBeaker` carries it. Tabs come from
`tabsFor()` in `lib/portal/tabs.ts`: not a Beaker = the same four tabs; client + Beaker = five; Beaker with no
client record = Beaker only (the shell redirects every other route to `/portal/beaker` and hides the bell, potatoes
and TipTop; Profile shows login + sign out; the account menu lists Profile and Beaker). Staff view-as resolves the
viewed client's Beaker record read-only. `/portal/referrals` still works (credit redemption lives there) and
lights up the Beaker tab; the Dashboard referral card links to `/portal/beaker`.

**`/portal/beaker`** (`app/portal/beaker/page.tsx` + `components/portal/BeakerView.tsx`), one screen:
link (copy, QR drawn locally with `qrcode-generator`) and "how you earn" from `lib/affiliate-terms.ts`; Refer
someone (name, email or phone, business, note); My referrals (CRM stage → Submitted / Talking / Bought / Not a fit,
`plainStatus()`), with earned per referral; Money (earned, on hold, ready, paid out, next payout, payout setup
steps Whop → terms → W-9, payout history, 1099 note); Toolkit (text, email, social post with the link and the
§7.1 commission disclosure; who to send; the rules with agreement sections).

**Numbers** (`GET /api/portal/beaker`, service role, scoped to the resolved affiliate id):
`crm.affiliate_commission_ledger` → earned (non-void sum), on hold (`held` + `disputed`), ready (`payable`, no
`payout_id`; same rule as the CRM's `payableFor`), per-referral earned; `crm.affiliate_payouts` (status `sent`) →
paid out + history; `crm.leads.affiliate_id` → referrals; next payout = 1st or 14th Pacific (CRM bridge `nextRun`).

**Writes** (`POST /api/portal/beaker`) go through the existing CRM bridge (`crm.podlablv.com/api/beaker/portal`,
`PORTAL_BRIDGE_SECRET`, set in Vercel production): `refer` → the CRM's own `addReferral` (dedupe, §2.4
"already in our system" rule, attribution, team alerts), `linkWhop`, `acceptTerms`, W-9 upload. After a referral
a `done` notification is written for Beakers with a client record. Without the secret every write answers 503.

**Notifications.** `/api/cron/beaker-notify` (hourly, `?dry=1` for staff) reads the last 3 days per Beaker:
link-credited leads, `crm.pipeline_events` stage moves (one row per lead per plain status), new commission and
clawback rows, sent payouts; `notify()` with `beaker:*` refs, so reruns never repeat. Logic:
`lib/portal/beaker-notify.ts` (`npm run test:beaker`).

**Gap: Beakers with no client record get no notifications.** `portal_notifications.client_id` is NOT NULL and
the bell, feed and delivery cron are all keyed by client. Today that is every real Beaker (charles-mui). Proposed
minimal change (not applied; `loadFeed`, the bell and `notify-run` would also need to read by user):

```sql
alter table public.portal_notifications alter column client_id drop not null,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add constraint portal_notifications_owner_chk check (client_id is not null or user_id is not null);
create unique index if not exists portal_notifications_user_ref_idx on public.portal_notifications (user_id, ref) where client_id is null;
```

Other open points: the agreement (§4.5) says payouts within 15 days after month end, while the CRM runs on the
1st and 14th (phase111), which is what the tab says; the CRM bridge strips `_` from emails before matching, so a
Beaker whose email has an underscore can see the tab but not write until that is fixed in the CRM.
