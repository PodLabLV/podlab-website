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
| **Brand** | Logos (each shown on light and dark, tagged main / icon / white / dark), colors (hex), fonts, brand guide, font files, do's and don'ts, and b-roll (uploads up to 5 GB per file, or a pasted Drive/Dropbox link). "Still needed" lists what editors are missing. | `portal_brand_kits`, `portal_brand_assets`, private bucket `client-brand` |
| **Deliverables** | Versioned files. Video cuts get chapters and timestamped notes. Approve or send notes. | `portal_assets` + `portal_asset_versions` / `_comments` |
| **Scripts** | Versioned scripts, notes pinned to a line, approval with evidence, teleprompter. | `portal_scripts*` |
| **Action Items, Progress, Reports, Invoices** | As before. Invoices mirror from Whop. | `portal_*` |
| **Profile** | Name, phone, business, website, timezone, the daily update email switch. Login email changes go through info@. | `portal_clients` |
| **TipTop** | Their guide, launcher on every portal page. Knows their account, nudges open items, files timestamped revisions, edits their Clarity Document (client confirms each edit; every version kept, Restore never deletes), updates their profile, books calls, suggests the product for a locked element (once), flags anything else to the team. | `lib/tiptop/*`, `portal_document_versions`, `portal_tiptop_threads` |

## Sidebar: groups, badges and the build level

- **Groups:** Dashboard, then **Your turn** (Intake, Scripts, Deliverables, Brand, Action Items), **Your build** (Growth Chain, Production, Clarity Document, Delivery), **Results** (Progress & Delivered, Reports), and **Account** (Your Answers, Invoices, Profile), which stays collapsed until opened.
- **Hidden until there's something there:** a page with nothing in it yet (no scripts, no reports, no invoices…) drops out of the sidebar but still works by URL. With no nav data (staff, or the call failed) everything shows.
- **Badges:** a green count is what's waiting on the client (scripts and deliverables to review, open action items, intake questions left, brand gaps, cuts to watch). The group header totals it ("3 waiting"). A check means their side is done (intake submitted, brand kit complete).
- **Build level:** points for what moves their build:

  | Mission | Points |
  |---|---|
  | Submit intake | 100 |
  | Growth Chain check | 50 |
  | Main logo | 60 |
  | Icon + white logo | 40 |
  | Colors + fonts | 40 |
  | B-roll | 60 |
  | Each script approved | 30 |
  | Each deliverable approved | 20 |
  | Each action item closed | 15 |
  | Delivered by PodLab: Clarity Document | 100 |
  | Delivered by PodLab: each delivery phase | 25 |
  | Delivered by PodLab: each video approved or posted | 10 |
  | Delivered by PodLab: each Growth Chain element | 100 |

  Levels: Kickoff 0 · Foundation 100 · Building 250 · Momentum 450 · Launch 700 · Scale 1000 · Systemized 1400 · Duplicated 1900 · Legacy 2500.
- **Next mission:** the first undone client mission, shown under the bar with its points. Delivered-by-PodLab items never show as a next mission. "All missions" expands the full list.
- **Level-up:** the card flashes green once per new level, remembered per browser.
- TipTop sees the level and next mission too.
- Code: `lib/portal/game.ts` (pure; tests `npm run test:game`), `app/api/portal/nav` (built on the TipTop overview), `components/portal/SidebarNav.tsx`.

## Hot Potato (who's turn it is)

Every open item has one holder, client or team. The potato passes when the item changes hands, and heats by the day: **warm** (0–1), **getting hot** (2–3), **on fire** (4–6), **smoking** (7+). Clocks start at launch (Oct 9 2026), so items that were already open start warm.

| Item | Holder | Since |
|---|---|---|
| Script / deliverable in review | client | current version published |
| Script / deliverable with changes requested | team (PodLab) | notes sent |
| Intake not submitted | client | intake assigned |
| Top open action item (one at a time) | client | created |
| Brand gap (no logo, missing versions, colors, fonts) | client | client created |
| Cuts to watch (one potato per client: "6 cuts to watch") | client | the cut's Drive file last changed (else card start); cuts from 2+ weeks before launch don't count |
| Unresolved client notes on a card | the card's editor | oldest open note |
| Client hit **Looks good** | editor | the approval |
| Notes fixed, no newer cut yet | editor | last client note |
| No cut and past due | editor | due date |

- **Looks good** (Production, on any cut not yet done) leaves a resolved comment `Looks good. Approved in the portal.` on the editor's card, pings #revisions, and passes the potato. It never reopens the card, isn't counted as a "fixed note", and the digest skips it.
- **Client view:** a Hot potatoes tray in the sidebar ("On you" / "On PodLab", with who and what day), a potato badge in the mobile top bar, and at day 7 smoke over the whole portal. The smoke parts around a **Pass the potato** button; **Wave the smoke away** clears it for the session. It hides on the page where they'd act, and TipTop stays reachable above it. All motion stops for reduced-motion users.
- **Staff:** `/portal/potatoes` (sidebar: Staff → Hot potatoes) shows every client, the team's potatoes grouped by holder, and heat counts.
- **Slack:** a morning scoreboard at 15:05 UTC (`/api/cron/potatoes`, `vercel.json`): team first by holder, then a line per client. `?dry=1` with a staff session previews it.
- **TipTop** sees both sides and leads with the client's hottest potato, playful and never scolding, and names who holds PodLab's.
- Code: `lib/portal/potato.ts` (pure: heat, holder rules, scoreboard; `npm run test:potato`), `lib/portal/potato-server.ts`, `app/api/portal/potatoes`, `components/portal/HotPotato.tsx`, `app/portal/potatoes`.

## TipTop as business guide

TipTop runs on **Opus 5.5** (fallback Sonnet 5.5, then Sonnet 5; override with `TIPTOP_MODEL` / `TIPTOP_FALLBACK_MODELS`), with up to 12 tool steps and 4,500 output tokens a turn. A heavy "read the file and draft" turn costs about $0.30; a normal chat turn about $0.05–0.10 (prompt caching is on).

| Tool | What it does | Confirm card |
|---|---|---|
| `read_client_file` | Application and studio intake, portal intake answers, brand kit, what they bought, scripts list | no |
| `read_intake` / `read_script` | Every intake question (id, section, required, current answer); a script's full current text | no |
| `save_intake_answers` | Section co-pilot: saves up to 12 drafted answers, optionally submits (refused while required answers are empty) | yes, shows each answer |
| `update_brand_kit` | Colors, fonts, notes on the Brand page (merge or replace; never guessed hex codes) | yes, shows swatches |
| `create_action_items` | Game plan: up to 8 dated actions under People / Operations / Sales / Marketing / Content, with required **coaching** (goal as a number, the math, the order, first move) shown on the card. Refused past 25 open items. Source reads `Game Plan · <pillar>` | yes, coaching plus the list |
| `draft_script` | Hook / FAQ / short / social / ad / VSL / email / founder script saved as **Draft** (our turn) with author TipTop. Slack pings the team. Max 10 waiting | yes, shows the script |

- **PodLab reviews every script draft.** Staff see them on the client's Manage page (**TipTop's script drafts**) and press **Send to client for review**, which sets the status to in review and tells the client. Only then can the client approve it.
- **Brief:** the "Business guide" section of `lib/tiptop/prompt.ts` covers how she maps a business, coaches each pillar, runs the co-pilot, builds a game plan, writes in PodLab voice, and reads efficiently (the client file once, at most two document reads a turn, then act).
- **Tested live** against a real client file (no writes): she drafted intake answers from the Clarity Document, said what only the client can answer, built a two-week sales plan with the math, and wrote a 30-second hook with a placeholder CTA instead of inventing one.
- Code: `lib/tiptop/guide.ts`, tools in `lib/tiptop/tools.ts`, the panel in `components/portal/tiptop/TipTopPanel.tsx`. Tests: `npm run test:guide`.

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
- **Inline playback:** uploaded files, YouTube links and **Google Drive cuts** play inline with a live clock, so pausing stamps the note. Drive cuts (99% of card `video_url`s) stream through `/api/portal/stream`: an HMAC link per card or deliverable version (6 hours, minted after the ownership check), the Drive file id looked up server-side, and Range requests passed through to Google so seeking works. If the portal's Google account can't see the file (a cut in a drive `portal-uploads@…` isn't a member of), the player falls back to "Open on Google Drive" and the client picks the time by chapter or types it. Frame.io and Vimeo still open in a new tab.

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

## Brand page (logos, brand kit, b-roll)

- **Where files land:** straight into the client's own PodLab OS Drive folder when one is linked (Manage → Drive folder): b-roll → `03- Content/02- B-Roll`, logos → `01- Company/02- Brand Kit & Logos/01- Logo`, guides and fonts → `…/02- Brand Kit`. Folders are matched by name (renumbering is fine) and created from the template if missing. When the linked folder is a person with a business layer ("Sharlene Ruiz / The Collected View / 01- Company…"), the one subfolder holding the 01–07 sections is used. The browser uploads to Google in 16 MB resumable chunks (no size cap; a dropped connection resumes). Rows store `storage_path = "drive:<file id>"`; registering checks the file really sits in that client's folder.
  - **Auth is keyless:** Vercel OIDC → Google Workload Identity Federation (project `rational-armor-436121-b1`, pool/provider `vercel`) → impersonates `portal-uploads@rational-armor-436121-b1.iam.gserviceaccount.com`, a Content manager on PodLab OS. Env: `GCP_PROJECT_ID`, `GCP_PROJECT_NUMBER`, `GCP_SERVICE_ACCOUNT_EMAIL`, `GCP_WORKLOAD_IDENTITY_POOL_ID`, `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` (production). Only the production environment is granted in Google; add a principal for `environment:development` to test locally.
  - **Previews:** `<img>` can't send a login, so Drive thumbnails and files ≤ 100 MB stream through `/api/portal/brand/file` with an HMAC link (1 hour, per asset and variant). Bigger files open in Drive (team only; clients see "In your PodLab folder").
  - **Fallback:** no Drive folder linked, or Google errors → the private `client-brand` bucket as before.
- **Client side:** `/portal/brand`. Bucket uploads go straight from the browser to the private `client-brand` bucket via a signed upload URL (`POST /api/portal/brand` intent `sign`, then a PUT, then `register`), so a 4 GB phone clip never passes through a function. One upload at a time with a progress bar. Bigger than 5 GB, or a whole folder: paste a link.
- **Gaps:** no logo, a missing main / icon / white version, no colors, no fonts. The first gap shows on the dashboard's **Next up** and in TipTop's open loops. B-roll is never a gap.
- **Slack:** one message per finished batch in #revisions ("Sharlene (The Collected View) added 6 b-roll files (3.2 GB)") with the staff link. The CRM timeline and the client's activity feed get a line too.
- **Remove** hides the file (`removed_at`); the object stays in storage until staff purge it.
- **Staff:** Clients → Manage → **Open their brand page** (`/portal/brand?client=<id>`). Staff can upload for the client, and:
  - **Make editor link:** `/portal/kit/<token>`, a read-only page with every logo, color, font, note and b-roll item and download links. No login, so outside editors can use it. Links inside expire after an hour; reloading the page mints fresh ones.
  - **Put it on their cards:** adds `Brand kit: <link>` to every card on the client's linked boards (replacing an older link line, never stacking). The line starts with a word, so it's never read as a video chapter.
  - **New link** rotates the token; the old link stops working at once. Run "Put it on their cards" again after.
- **Upload size:** the bucket allows 5 GB per file, but Supabase also has a project-wide limit (Dashboard → Storage → Settings → Upload file size limit). It must be at least 5 GB, or bigger files fail with "too big" and the page tells the client to paste a link.
- Code: `lib/portal/brand.ts` (validation, gaps), `lib/portal/brand-server.ts` (loader), `lib/portal/drive.ts` (Drive auth, folders, sessions, signed previews), `app/api/portal/brand`, `app/api/portal/kit`, `app/portal/brand`, `app/portal/kit/[token]`. Tests: `npm run test:brand`.

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
   - Copies live in `supabase/migrations/` (2026-10-07 → 2026-10-12).
2. **Site:** merge the hub PR, then deploy podlab-site to production from the main worktree.
   - Agents can't run production deploys; run them in the Terminal app.
   - The CLI often ends with `fetch failed` even when the deploy worked. Check `vercel ls --prod` before retrying.
3. **Env vars:** already set: `RESEND_API_KEY`, `SLACK_WEBHOOK_URL`, Supabase keys, `NEXT_PUBLIC_SITE_URL`. Needed for the daily digest: `CRON_SECRET` (`openssl rand -hex 32`; Vercel sends it to the cron automatically). Optional: `PORTAL_PUBLISH_KEY`, `REVISIONS_SLACK_WEBHOOK_URL` (a #revisions channel for client revision alerts). TipTop needs AI Gateway enabled on the Vercel project (OIDC auth, no key). Optional: `TIPTOP_MODEL`, `TIPTOP_FALLBACK_MODELS`, `TIPTOP_REQUESTS_PER_MINUTE`, `TIPTOP_APPROVAL_SECRET`.

## Security notes

- **Client access is read-only.** Clients can only read their own rows (RLS `user_id = auth.uid()`). Every write goes through a server route that re-resolves the caller from the bearer token.
- **Staff routes** re-check `portal_staff` on every call. The browser's staff flag only decides what renders.
- **Sign-in links** carry the token to `/api/portal/access`, which keeps it in an httpOnly cookie and redirects to a clean `/login/set-password`. So the token never appears in a page URL the analytics tags (GA, Clarity, PostHog, Meta) record. The token is spent only when a password is submitted.
- **Board security:** CRM cards are only reachable through boards linked to that client. A guessed card id gets a 404.
