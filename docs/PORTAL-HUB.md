# PodLab Portal — the client hub

**Live at:** podlablv.com/portal (podlablv.com proxies `/portal`, `/login` and `/api/portal/*` to this app).
**Built:** October 2026. This replaces "Client Portal", and every client-facing page now uses the podlablv.com brand.

The portal is the one place a client goes for everything PodLab. Staff keep working where they already work (the CRM boards, the CRM pipeline), and the portal reads from there.

---

## What a client sees

| Page | What it does | Where the data lives |
|---|---|---|
| **Dashboard** | Welcome note and stat strip. **Next up** lists what's waiting on them: scripts to approve, cuts to watch, deliverables to review, their Growth Chain constraint, the intake, action items. Below that: their build and recent activity. | everything below |
| **Growth Chain** | The eight elements, each Locked (not bought), Building (bought, in delivery) or Unlocked (delivered). Shows their constraint, the 8-question check, and the product that closes each gap. | `portal_client_products`, `portal_client_elements`, `lib/growth-chain.ts` |
| **Clarity Document** | Their strategy document, with comments. | `private/clarity/**` or `document_url` |
| **Intake** | The portal questionnaire. Saves as they type. | `portal_intake_*` |
| **Your Answers** | What they told us (free-VSL application, studio intake, portal intake), read-only, with links to what we built from it. | `crm.leads` + `portal_intake_answers` |
| **Delivery** | The phases of their build. | `portal_delivery_phases` |
| **Production** | Every video on their CRM boards, live, with its stage. Chapters, a player, and **timestamped revision notes** that land on the editor's card. | `crm.content_*` via `portal_client_boards` |
| **Deliverables** | Versioned files. Video cuts get chapters and timestamped notes. Approve or send notes. | `portal_assets` + `portal_asset_versions` / `_comments` |
| **Scripts** | Versioned scripts, notes pinned to a line, approval with evidence, teleprompter. | `portal_scripts*` |
| **Action Items, Progress, Reports, Invoices** | As before. Invoices mirror from Whop. | `portal_*` |
| **Profile** | Name, phone, business, website, timezone, the daily update email switch. Login email changes go through info@. | `portal_clients` |
| **TipTop** | Their guide, launcher on every portal page. Knows their account, nudges open items, files timestamped revisions, edits their Clarity Document (client confirms each edit; every version kept, Restore never deletes), updates their profile, books calls, suggests the product for a locked element (once), flags anything else to the team. | `lib/tiptop/*`, `portal_document_versions`, `portal_tiptop_threads` |

## Video chapters and timestamped revisions

Chapters use the same lines YouTube reads from a video description, so editors write them once:

```
0:00 Hook
0:18 The problem
0:52 Proof
1:40 Call to action
```

- **On a CRM card (Production):** put the lines anywhere in the card's description. The portal picks up any line that starts with a time.
- **On a deliverable version:** send `chapters` (that text, or `[{ "t": 18, "title": "The problem" }]`) when publishing the version, or later with `POST /api/portal/deliverables { "intent": "chapters", "versionId", "chapters" }`.
- **What the client does:**
  - They jump by chapter, pause where something should change, and type the note. The time and chapter fill in automatically.
  - On the card, the editor sees: **`[0:42 · The problem] cut the pause`**, signed `<name> (client, via portal)`. Slack and the CRM timeline are pinged too.
- **Inline playback:** uploaded files and YouTube links play inline with a live clock. Drive, Frame.io and Vimeo links open in a new tab, and the client picks the chapter or types the time.

## The revision loop (client ↔ editor)

| Step | What happens |
|---|---|
| Client leaves a note | On **Production** (or through TipTop) it lands on the editor's CRM card as `[0:42 · Hook] note`, signed `<name> (client, via portal)`. On a **video deliverable tied to a card** (staff → Manage → *Video deliverables and editor cards*), the notes copy onto the card when the client presses Send. |
| Card already past review | A note on a card in **Quality check** or **Approved** moves it back to **Revising**. The CRM won't let it leave Revising until every comment is resolved, so client notes can't be skipped. **Posted** cards aren't moved; Slack flags them for a re-cut decision. |
| Editor is told | Slack names the card's editor. Set `REVISIONS_SLACK_WEBHOOK_URL` (a #revisions channel webhook) to keep these out of the main channel; without it they go to the main webhook. |
| Editor fixes it | Ticking the comment resolved in the CRM shows **Fixed** on the client's note, and "2 of 3 of your notes fixed" on the video. |
| Client is told | The daily digest email (below) lists new cuts, fixed notes, approvals and new versions. Clients can switch it off in Profile. |
| Delivered | **Progress & Delivered** (and the dashboard) lists approved or posted videos, approved files and scripts, and finished phases, with dates. |

## Daily update email (digest)

One email a day at 15:00 UTC (8am Pacific in summer, 7am in winter), and only to a client with news. Sections appear only when they changed since the last digest:

- **New cuts ready to watch:** a card on their linked boards got a new `video_url`.
- **Your notes were fixed:** one of their own portal notes on a card was marked resolved. The note is quoted without its `[0:42 · Chapter]` tag.
- **Approved / Posted:** a card moved into Approved or Posted.
- **New versions to review:** script or deliverable versions published since the last digest. Versions of draft scripts are skipped.
- **Waiting on you:** scripts and deliverables in review, open action items. This only rides along with a change; it never sends an email on its own.

How it works:

- `portal_digest_state` keeps a snapshot per client (each card's column, video link and resolved client notes). Each run diffs against it, emails the difference, and saves the new snapshot.
- **The first run for a client only takes the snapshot**, so existing state never floods anyone. A board linked later is baselined the same way.
- If a send fails, the snapshot is kept, so the next day's email carries the changes. One client failing never stops the run.
- **Who gets it:** clients with a login, a real email (not `.invalid`), and the Profile switch on (`digest_opt_out = false`).
- Code: `lib/portal/digest.ts` (diff + email), `lib/portal/digest-run.ts` (reads, sends, saves), `app/api/cron/portal-digest`. Tests: `npm run test:digest`.
- **Preview without sending (staff):** `GET /api/cron/portal-digest?dry=1` with your portal session token (optionally `&clientId=`). It returns the would-be emails, HTML included, and saves nothing.
- The cron needs `CRON_SECRET` in Vercel. Without it, the route answers 401 to everything except staff previews.

## Staff: running it

You need a row in `portal_staff`. info@ already has one. Staff get **Clients · staff** in the portal sidebar.

1. **Invite a client:** Clients → enter or confirm their email → **Send invite**.
   - The email goes from info@ via Resend. They set a password in one step and land on their dashboard.
   - If the email doesn't arrive, **Copy the link** and text it to them.
   - Locked out? **Send new link**.
2. **Manage a client:** Clients → **Manage**.
   - **What they bought:** tick the products. This drives the Growth Chain. Edits and recordings unlock nothing.
   - **Growth Chain:** elements unlock on their own when every delivery phase tagged with that element is done. **Mark delivered** does it by hand. The override menu is for when the automatic state is wrong.
   - **Production boards:** link their CRM boards. Linked boards appear on their Production page.
   - **Scripts from their application:** free-VSL clients have scripts drafted by the CRM from their application. Edit them in the CRM first, then **Publish**, which sends them as v1 for review. Already-published titles are skipped.
3. **Publishing from scripts and skills:** `POST /api/portal/scripts` and `POST /api/portal/deliverables` accept a staff session or the `x-portal-publish-key` header (only when `PORTAL_PUBLISH_KEY` is set in Vercel). Payloads are in the Scripts & Deliverables PR.

## Deploying

1. **Database:** run every migration once, in order: `bash ~/podlab-portal-migrations/RUN-ALL.sh` in the macOS Terminal app.
   - Each file is safe to run twice, and the script stops at the first failure.
   - Copies live in `supabase/migrations/` (2026-10-07 → 2026-10-10; nine files).
2. **Site:** merge the hub PR, then deploy podlab-site to production from the main worktree.
   - Agents can't run production deploys; run them in the Terminal app.
   - The CLI often ends with `fetch failed` even when the deploy worked. Check `vercel ls --prod` before retrying.
3. **Env vars:** already set: `RESEND_API_KEY`, `SLACK_WEBHOOK_URL`, Supabase keys, `NEXT_PUBLIC_SITE_URL`. Needed for the daily digest: `CRON_SECRET` (`openssl rand -hex 32`; Vercel sends it to the cron automatically). Optional: `PORTAL_PUBLISH_KEY`, `REVISIONS_SLACK_WEBHOOK_URL` (a #revisions channel for client revision alerts). TipTop needs AI Gateway enabled on the Vercel project (OIDC auth, no key). Optional: `TIPTOP_MODEL`, `TIPTOP_FALLBACK_MODELS`, `TIPTOP_REQUESTS_PER_MINUTE`, `TIPTOP_APPROVAL_SECRET`.

## Security notes

- **Client access is read-only.** Clients can only read their own rows (RLS `user_id = auth.uid()`). Every write goes through a server route that re-resolves the caller from the bearer token.
- **Staff routes** re-check `portal_staff` on every call. The browser's staff flag only decides what renders.
- **Sign-in links** carry the token to `/api/portal/access`, which keeps it in an httpOnly cookie and redirects to a clean `/login/set-password`. So the token never appears in a page URL the analytics tags (GA, Clarity, PostHog, Meta) record. The token is spent only when a password is submitted.
- **Board security:** CRM cards are only reachable through boards linked to that client. A guessed card id gets a 404.
