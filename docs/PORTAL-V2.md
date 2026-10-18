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
