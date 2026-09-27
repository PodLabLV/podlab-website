# PodLab Client Portal — Experience Spec

**Written:** August 31, 2026
**Companion to:** [`PORTAL-MODULE-ARCHITECTURE.md`](./PORTAL-MODULE-ARCHITECTURE.md) — that doc is
data and modules, this one is what the client feels.
**Applies to:** everything under `app/portal/` and `components/portal/`

---

## The two rules

### 1. Gamify outcomes, never engagement

A founder paying $3,500/month does not want points for logging in. Badges-for-attendance is
how a $42k/year relationship starts to feel like a language app.

But the same founder will respond hard to a system that shows them their own velocity,
because their largest hidden cost is their own delay. The delivery bottleneck at PodLab is
almost never PodLab — it is a client sitting on an approval for nine days.

So every game element in this spec rewards exactly one thing: **the behavior that shortens
their time to revenue.** Completing intake. Validating a script. Showing up to the shoot.
Nothing rewards opening the portal.

Test for any new element: *if a client did this more, would they make more money?* If no,
cut it.

### 2. The theme skins, it never obscures

A client must always be able to answer "what do I owe" and "what's next" in plain English,
on every screen, without decoding a metaphor. Every themed label carries a plain subtitle.

Premium is not a puzzle. A due date is never a riddle.

---

## Part 1 — Design tokens

### What already exists (do not re-invent)

From `tailwind.config.ts` and `app/globals.css`:

```
background      #0a0a0a    deep black — portal ground
bg-secondary    #141414    charcoal
bg-tertiary     #1a1a1a    card ground
text-primary    #fafafa
text-secondary  #c0c0c0
text-tertiary   #b0b0b0
accent          #2ADD1B    neon green
accent-hover    #85FF78
border          #2a2a2a
```

Card pattern, already used everywhere and worth keeping:
`bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl`

Animations already defined: `fade-in-up`, `neon-pulse`, `gradient`.

### What to add

**Two signal colors.** Today `StatusBadge` uses yellow for both "in progress" and "pending",
which collapses the single most important distinction in the whole portal: *we are working*
versus *you are blocking*. Split them.

```ts
// tailwind.config.ts — theme.extend.colors
signal: {
  running:  '#22D3EE',  // cyan — a reaction is running. PodLab has it.
  waiting:  '#FFB020',  // amber — needs you. You are the blocker.
  done:     '#2ADD1B',  // existing green. Validated, paid, complete.
  failed:   '#F0483E',  // overdue, failed payment, blocked phase.
}
```

Semantic rule, enforced everywhere: **green means finished, amber means the client owes an
action, cyan means PodLab is mid-reaction, red means broken.** Green stops being the
default paint and starts meaning something, which is what makes the amber items pull the eye.

**Load the mono face.** `JetBrains Mono` is declared in `tailwind.config.ts` and as
`--font-mono` in `globals.css`, but `app/layout.tsx` only imports `Inter` and `Michroma` —
so `font-mono` silently falls back to the system monospace today. Fix:

```ts
// app/layout.tsx
import { Inter, Michroma, JetBrains_Mono } from 'next/font/google';

const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });
// add jetbrains.variable to the <html> className
```

```ts
// tailwind.config.ts
mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
```

Michroma display against real mono data is the whole reason this reads as a lab instrument
rather than another SaaS dashboard. It is the highest-value hour in this document.

**Graph-paper ground.** A 32px grid at ~2% white, fixed, behind portal content only. The
main site already uses a `body::before` texture overlay — same technique, different pattern.

```css
.portal-grid::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

---

## Part 2 — Typography scale

| Role | Face | Spec |
|---|---|---|
| Page title | Michroma | `text-lg sm:text-xl uppercase tracking-wider` (existing `PageHeader`) |
| Section label | Michroma | `text-[10px] uppercase tracking-widest text-white/40` (existing `StatCard`) |
| Stat value | Inter | `text-2xl font-semibold` — mono only when it is a measurement |
| **Notebook entry** | **JetBrains Mono** | `text-xs text-white/70`, timestamp at `text-white/30` |
| **Data / IDs / money** | **JetBrains Mono** | tabular figures, so columns align |
| Body | Inter | `text-sm leading-relaxed text-white/60` |

Rule of thumb: **if it is a measurement, it is mono.** Money, durations, counts, timestamps,
version numbers, IDs. If it is language, it is Inter. If it is a heading, it is Michroma.

---

## Part 3 — Motion

`framer-motion` is already a dependency and is barely used in the portal. Spec:

```ts
const spring   = { type: 'spring', stiffness: 260, damping: 26 };   // cards, panels, badges
const liquid   = { type: 'spring', stiffness: 90,  damping: 18 };   // fill levels, progress
const stagger  = { staggerChildren: 0.04 };                          // lists and grids
```

- **Card entry:** fade + 12px rise, staggered 40ms. Never all at once.
- **Progress:** liquid fill with the slower spring, not a linear bar transition.
- **Realtime arrival:** when a row arrives over the broadcast channel, it flashes its signal
  color at 15% for 600ms and settles. This is what makes "live" legible instead of spooky —
  the client sees *that* something changed, not just different numbers.
- **Loading:** replace the generic green ring spinner in `app/portal/layout.tsx` with a stir
  loop — a slow orbiting dot inside a circle. Same footprint, different read.
- **Reduced motion:** every animation above is wrapped in `useReducedMotion()`. Fills snap,
  staggers collapse to 0, the flash becomes a static border. Non-negotiable.

---

## Part 4 — Status vocabulary

Themed label, plain subtitle, one signal color. Never ship the label alone.

| State | Label | Subtitle (always shown) | Color |
|---|---|---|---|
| draft | **Hypothesis** | Being written | `running` |
| in review | **Peer Review** | Waiting on your notes | `waiting` |
| changes requested | **Revision** | We're rewriting | `running` |
| approved | **Validated** | Locked and ready to shoot | `done` |
| shot | **In Production** | Filmed, in the edit | `running` |
| published | **Deployed** | Live | `done` |
| blocked | **Stalled** | Blocked — see the note | `failed` |

Same treatment for delivery phases and invoices. An invoice is never "Hypothesis" — money
words stay money words: Paid, Due, Overdue. **Never theme a dollar amount or a due date.**

---

## Part 5 — The five signature components

### 5.1 The Periodic Table of Labs

**Where:** dashboard hero, replacing the current four stat cards.
**What it is:** every Lab as an element tile. Status board, navigation, and expansion path
in one object.

| Z | Symbol | Lab |
|---:|---|---|
| 1 | `Es` | EssentialsLab |
| 2 | `As` | AssetsLab |
| 3 | `Br` | BrandLab |
| 4 | `Si` | SiteLab |
| 5 | `Vs` | VideoSalesLab |
| 6 | `So` | SocialLab |
| 7 | `Ex` | ExpansionLab |

Z is position in the growth system, not a real atomic number. `Si` for SiteLab is silicon
and is the one that should stay exactly as it is.

**Tile states:**
- **Owned + complete** — green fill, `neon-pulse` on hover, click goes to that Lab's deliverables.
- **In progress** — cyan outline, liquid fill to the phase percentage, slow pulse.
- **Owned + blocked on client** — amber, and it is the only amber thing on the screen.
- **Not owned** — `border-white/10`, symbol at `text-white/20`. Hover reveals one line of
  what it unlocks. No price, no button, no pitch.

**Why it earns its place:** the gap in the table *is* the upsell, and it never has to be
spoken. A client with `Es As Br Si` lit and `Vs So Ex` dark can see their own roadmap
without a sales conversation. That is the highest-leverage single component in the portal.

**Data:** `portal_clients.plan_label` plus the labs present in `portal_projects` /
`portal_assets`. Full Lab list from `lib/labs.ts`.

### 5.2 The Lab Notebook

**Where:** dashboard right column, and its own page.
**What it is:** the activity feed, reskinned as a real bench log.

```
2026-08-31  14:22  HA   Script v3 "Founder Story" → Peer Review
2026-08-30  09:04  SYS  Invoice #1043 paid — $3,500
2026-08-29  16:41  MS   Note added on v2, block 14
```

Monospace, right-aligned timestamps at `text-white/30`, actor initials in a small green
chip, append-only, never edited. Entries stream in live over the broadcast channel with the
arrival flash from Part 3.

**Data:** `portal_events` from Phase 0, verbatim. This component is free once that table
exists — it is the payoff for building the event log properly instead of scattering notify
calls.

### 5.3 Experiments

**Where:** the Scripts module, and reframing the Progress page.
**What it is:** every script and project as an experiment with three parts —

- **Hypothesis** — the offer, angle, or hook being tested. One sentence.
- **Method** — the script itself, its versions, the notes on it.
- **Result** — what it produced once it ran. Empty until it has.

This maps onto VSLLab exactly as it already works: five hook takes are five arms of one
trial. Render them as a trial — variants side by side, each with its own result column,
the winner marked. The Reports page becomes **Results**.

A client watching hook variants compete is watching an experiment. That is real science
theming, not decoration, because the underlying thing genuinely is an experiment.

### 5.4 Reaction Rate

**Where:** dashboard, one tile, prominent.
**What it is:** the client's own median response time, and what it costs them.

> **Reaction Rate — 1.4 days**
> Your median time to validate a script.
> Clients under 2 days launch roughly three weeks sooner.

**Computed as:** median of `portal_script_approvals.approved_at − portal_script_versions.created_at`
across that client's versions where the version entered Peer Review. Same math for intake
completion and asset approval; show the script number, it is the one that moves.

**Tone rules — these matter more than the math:**
- Never red. Never a frowning state. A slow client sees a neutral number and a fact.
- Never compare to other clients by name or rank. Aggregate benchmark only.
- If there is no data yet, say so — do not show 0.0 days.
- Pair it with the single oldest waiting item and a one-tap way to clear it.

This is the whole game loop, and it is honest: the number goes down when they make more
money, not when they use the portal more.

### 5.5 Discoveries

**Where:** a strip on the dashboard, full history on its own page.
**What it is:** rare milestone unlocks, framed as findings.

| Discovery | Unlocks when |
|---|---|
| **First Synthesis** | First deliverable validated |
| **Ignition** | First ad live |
| **First Signal** | First attributed booked call |
| **Critical Mass** | First $10k attributed pipeline |
| **Full Compound** | All owned Labs delivered |
| **Chain Reaction** | First referral closed |

Six, not sixty. If these fire weekly they are worthless; four a year and a founder
screenshots one. Each is a card with the date, the metric that triggered it, and a share
action that exports a branded image — which quietly turns a milestone into referral
collateral.

**Never** award a Discovery for logging in, filling a field, or clicking anything.

---

## Part 6 — Craft details

**Empty states.** `EmptyState` in `components/portal/Shared.tsx` already does the right
thing — it explains why a section is empty instead of apologizing. Rewrite the copy in lab
voice: *"This experiment hasn't run yet. Results land here once the first campaign is
live."* Honest, themed, and it never reads as a broken page.

**The signature hover.** The main site's B&W→color hover is PodLab's visual signature and
it is absent from the portal. Apply it to deliverable thumbnails and Discovery cards so the
portal reads as the same company as podlablv.com. It is CSS `filter: grayscale()`, per
`CLAUDE.md` — do not swap images.

**Sound.** One soft confirm tone on validation. Opt-in, default off, remembered per user.
Nothing else makes noise, ever.

**Mobile.** The approval flow is designed phone-first: a founder validates a script in
twenty seconds standing in a parking lot. Desktop is the wide version of that, not the
other way round.

**Density.** Cards get more padding than feels necessary. The current `p-5` on `StatCard`
is right; resist tightening it to fit more in. Space is most of what "premium" is.

---

## Part 7 — Connectivity, ordered by return

**1. SMS on "needs your approval."** Consent is already collected A2P-compliantly on every
form that takes a phone number, and the three-column consent shape is already in the schema.
Texting a founder that a script is waiting is the single biggest lever on delivery speed in
either document. Fires off `portal_events` where kind = `script.review_requested`.

**2. Presence.** *"Stephen is reviewing this script now."* Supabase Presence rides on the
Phase 0 channel — near zero cost, and it is the difference between a portal that feels
inhabited and one that feels filed.

**3. Teleprompter mode.** Validated scripts get a tablet view with adjustable scroll speed
and large type, for use on set. Functional, and it feels expensive.

**4. Magic-link login.** Removes the password-reset tax entirely. Supabase Auth supports it
natively; the current flow is email + password.

**5. Portal assistant.** `ai` v6 is installed and `app/api/chat/route.ts` exists. Scope it
strictly to that client's `portal_events` and current rows — "where are we on the VSL?"
answered from real data, refusing anything it cannot ground. A general chatbot in a client
portal is a liability; a grounded status oracle is a feature.

**6. Quarterly Lab Report PDF.** `@react-pdf/renderer` and `lib/pdf-brand.tsx` already exist
for the affiliate agreements. Same machinery, new template: a branded quarterly the client
forwards to a partner. Referral engine disguised as a feature.

---

## Part 8 — What not to build

- **No cross-client leaderboards.** Ranking paying clients against each other is how you
  lose one.
- **No points for logging in**, no daily streaks, no login rewards of any kind.
- **No mascot, no confetti storms.** One restrained moment on a Discovery, nothing more.
- **No streak-shaming.** A founder who went quiet was closing a deal.
- **Never theme a due date, a balance, or an amount owed.**
- **No fake progress.** A bar that moves because time passed rather than because work
  happened is the fastest way to lose trust in every other number on the screen.

---

## Part 9 — Where this lands in the build

None of this is a separate phase. It rides on the modules already planned.

| Piece | Phase | Note |
|---|---|---|
| Signal colors, mono face, grid ground, motion pass | **0** | ~1 day, and everything after inherits it |
| Periodic Table of Labs | **0** | Needs only the client's Lab list |
| Lab Notebook | **0** | Free once `portal_events` exists |
| Presence | **0** | Rides the broadcast channel |
| Status vocabulary | **2** | Ships with the Scripts state machine |
| Experiments / Results | **2** | Scripts + variants |
| Reaction Rate | **2** | Computed from approval timestamps |
| SMS on approval | **2** | Off `portal_events` |
| Teleprompter | **2** | Validated scripts only |
| Discoveries | **3** | Needs deliverables + metrics landed |
| Signature hover | **3** | Deliverable thumbnails |
| Quarterly PDF | **6** | Needs reporting data |
| Portal assistant | **6** | Needs a full event history to be useful |
| Magic link | any | Independent, an hour |

The only genuinely new work is the design-system pass. Everything else is presentation over
data the architecture doc already commits to producing.

---

## Part 10 — Open questions

1. **Does the client see the whole Periodic Table, or only Labs in their tier?** Showing all
   seven makes the roadmap legible; it also shows a Tier 3 client how much they don't have.
   Recommendation: show all, dim the rest, never price them.
2. **Is Reaction Rate visible to the client, or staff-only at first?** Safer to run it
   staff-only for one client cycle and check the number is fair before showing anyone.
3. **Do Discoveries notify?** A push on "Critical Mass" is a great moment. A push on all six
   is noise. Recommendation: notify on three, log the rest.
4. **Who writes the Hypothesis line on each experiment?** If PodLab writes it, it is a
   positioning statement. If the client writes it, it is a commitment. The second is more
   powerful and much harder to collect.

---

**Last updated:** August 31, 2026
