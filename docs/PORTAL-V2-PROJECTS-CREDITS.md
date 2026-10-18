# Portal v2 — Projects + Credits (track B)

Spec: `docs/PORTAL-V2.md` (Projects, Credits). This is what was built and how it fits together.

## Projects (`/portal/projects`)

One list of everything the client reviews, waits on, or has signed off, filtered **Needs you · In progress · Approved** (defaults to Needs you when anything is there). `GET /api/portal/projects` builds it server-side (`lib/portal/projects-server.ts`, rules in `lib/portal/projects.ts`):

| Source | Kind | Needs you when | Opens |
|---|---|---|---|
| `portal_scripts` | script | status `in review` | `/portal/scripts/<id>` (line notes, approval with evidence) |
| `portal_assets` (versioned) | doc / page / video | status `in review` | `/portal/deliverables?item=<id>` (opens and scrolls to that review) |
| `portal_assets` (legacy, url only) | doc / page | never (delivered as-is) | the deliverable, or the live URL for a landing page |
| `crm.content_cards` (linked boards + shared cards, behind the client-approval gate) | video | gated board: card in Pending Client Approval and no Looks good since the cut; older boards: the Hot Potato "cut to watch" rule | `/portal/production?card=<id>` (player, timestamped notes, Looks good) |
| `portal_submissions` | submission | never (it's on us) | stands in until its card is visible |

A video deliverable tied to a card (`portal_assets.crm_card_id`) shows once. Nothing is approved from the list itself; every action happens in the existing flow.

**Waiting notifications.** Each needs-you item has a ref (`review:script:<id>:v<n>`, `review:asset:<id>:v<n>`, `review:card:<id>:<cut time>`). Publishing a script or deliverable version writes the `waiting` row at once; approving or sending notes resolves it; a Looks good or a note on a cut resolves that card's rows. Loading Projects also syncs (`syncReviewWaiting`): adds rows for anything missing (chiefly cards reaching Pending Client Approval in the CRM) and resolves `review:` rows that no longer need the client. It skips staff previews and partial reads.

## Credits

`lib/portal/credits.ts` is the only place pricing lives: packs (1 / $250, 3 / $600, 8 / $1,400, 10 a month / $1,500), costs (short 1, long/VSL 2, premium + FAQs 4, rush +1, each extra round +1, max 3 extra), turnaround (5 / 5 / 7 business days, rush 48h), expiry (packs 90 days; monthly grants two months = one month of rollover).

**Ledger** (`portal_credit_ledger`, append-only, balance = sum). Spending takes from the lot that expires first. A lot that runs out its clock gets an `expired` row (ref `expire:<lot id>`), written before every spend; the wallet shows lapsed credits as gone even before that row exists.

**Wallet** on Projects (and `GET /api/portal/credits` for the Dashboard): balance, next expiry, history.

**Buy credits** (`/portal/projects?buy=1`): Whop checkout links from env `WHOP_CREDITS_1_URL`, `WHOP_CREDITS_3_URL`, `WHOP_CREDITS_8_URL`, `WHOP_CREDITS_MONTHLY_URL`. Unset, each pack says "Not set up yet". The links are made by `node --experimental-strip-types scripts/whop-credit-links.mjs` (`--dry` first). **Not run yet: creating live checkout links is Hiram's call.**

**Grant on payment** lives in the CRM's Whop webhook (podlab-crm branch `feat/portal-credits`): a payment whose `metadata.lab_key` (or link's `lab_key`) is a credit pack inserts `+credits` with ref `whop:<payment id>` (unique, so retries can't double-credit), matched to the portal client by deal, then by login email (owner or teammate), and leaves the client a `done` notification.

## Submit footage for editing (`/portal/projects?submit=1`)

Pick the edit type (cost shown), rush and extra rounds, name it, notes, then upload files or paste links. Files go to the client's PodLab OS folder, `03- Content / 03- Raw Videos / <date> <name>`, through the same resumable Drive upload as the Brand page (`lib/portal/drive-upload.ts`). With no Drive folder linked, links only.

`POST /api/portal/projects` intent `submit` (`lib/portal/submissions-server.ts`), in order:

1. Claim the submission (draft → submitted), so a double click can't run twice.
2. Debit via `portal_credit_spend()` (locks the wallet, checks the balance, writes `-cost` with ref `submission:<id>`). Short → back to draft, nothing spent.
3. Card on their CRM board in **Editing**: their newest linked general board, else a new board made by `crm.content_board_create`, tied to their deal and linked to the portal. The card holds the edit, due date, footage folder/files/links and notes.
4. Slack, the CRM timeline, their activity feed, and a `done` notification.

If step 3 fails, a reversing `refund` row (ref `refund:submission:<id>`) returns the credits and the submission is marked failed.

## Database

`supabase/migrations/20261018_portal_v2_b.sql` (applied 2026-10-18): `portal_submissions` (client read policy via `portal_my_client_ids()`) and `portal_credit_spend()` (service role only).

## Tests

`npm run test:credits` (pack math, expiry, FIFO wallet, project rules, links, card text). Exercised live against the QA test client (grant, spend, insufficient, double submit, refund, card in Editing, Projects list), then cleaned up.
