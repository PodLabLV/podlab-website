# Onboarding intake: what changed from the Typeform

**Base:** the AssetsLab Assessment Typeform ("Welcome to EssentialsLab", eo02fkmp03f.typeform.com/essentials, 34 questions) and its twin, the public `/assetslab-intake` page.
**Now:** step 1 of `/portal/welcome`. The questions live in one file, `lib/portal/onboarding-questions.ts`, shared by the page, the API and the generation worker.

**The rule for every question:** it must feed a named section of a deliverable (`feeds` on each question), or it doesn't go in. The intake exists to build the AssetsLab, and when a VSL shoot is booked, the VSL pack.

## The result

- **30 questions in 5 groups** (The basics, What you sell, Who you serve, Your market, How you sound) instead of 34 in one long stream, and fewer in practice: two uploads only appear when they apply, three basics are skipped when the application already has them, and only 10 are required.
- **Prefilled from the free-VSL application** (`crm.leads` columns first, then `raw_responses`): up to 11 answers (website, revenue, years, goals, what you do, core offer, price, other services, pain, marketing gap, what they've tried) arrive filled and marked "From your application".
- **Already on file means not asked.** Website, revenue and years in business show as one "on file" line with an Edit link.
- **Saves as they type** (800 ms debounce, the whole set per save, so nothing is lost when they leave mid-sentence), with a progress bar across all three steps.
- **Required means the deliverable breaks without it:** revenue, goals, what you do, core offer, price, mechanism, dream client, pain, outcome, brand words. Nothing else blocks submit.

## Kept

| Typeform | Now | Why |
|---|---|---|
| 5 Describe the business | What does your business do? (prefilled) | Offer one-liner, Internal DNA |
| 6 Years in business | On file, or a 4-option choice | Journey maturity, roadmap pacing |
| 9 Services offered | Everything else you sell (prefilled) | Value stack, revenue streams |
| 10 Top 3 goals | Same, prefilled | Roadmap north star, action steps |
| 11 Why now | Same, optional | Internal DNA only (never client-facing) |
| 12 What marketing should accomplish | Same, prefilled from `marketing_gap` | Action steps, hooks, pillars |
| 13 Dream client | "Describe your dream client like a person" | ICP, VSL callout |
| 14 Pain points | Same | ICP, pain hooks, VSL problem block |
| 15 Outcome | Same | Offer outcome, mission, transformation hooks |
| 16 What best clients say | Same, plus "your best result" | Brand voice in their words, VSL proof block |
| 17 Objections | Same | Positioning, VSL objections, FAQ videos |
| 18 Where customers spend time | Same, chips | Journey, content pillars |
| 19 Core offer | Same, prefilled | Offer statement, VSL offer block |
| 20 Differentiators | Same | Positioning, values |
| 21–22 MVV written down + upload | Choice; the upload only appears on "Yes, written down" | Refine instead of rebuild |
| 25–26 Materials + upload | Chips; the upload only appears when they have something | Website analysis, Internal DNA |
| 27 Customer research | 3-option choice | Internal DNA flag, action steps |
| 29 3–5 adjectives | Chips, max 5 | Brand voice personality |
| 30 Tone | Same 5 options | Tone spectrum |
| 31 Brands/voices admired | Same, optional | Reference voices |
| 34 Deadlines | Same, one line | Roadmap calendar |

## Merged

- **8 Current customers into 13 Dream client.** The skill only uses current customers to sanity-check the ICP, so the dream-client prompt asks "and how close your current clients are to that".
- **23 Competitors + 24 What they do well** are one question: "Your top 3 competitors, and what they do well".
- **28 Brand as a person into 29 Adjectives.** Two questions asked the same thing twice. Chips are faster, and the free-text version produced the same three adjectives.

## Dropped

- **1–3 Name, email, business name.** The portal knows who they are.
- **4 Website, 7 Revenue** as questions. They show as "on file" when the application has them, and are asked only when it doesn't.
- **32 Who else should be involved.** That's Profile → Team now: invite them and they get their own login.
- **33 Communication preference (ranking).** Profile has the email/SMS switches, and the portal's notifications replace the ranking.
- **The intro and end screens.** The welcome copy is the page header, and the end screen's "schedule clarity" button is on the done screen (30-minute strategy call).

## Added

- **Price** ("What does it cost?"). The VSL says the price out loud, and the AssetsLab value stack needs it. Prefilled from `offer_price`.
- **Mechanism** ("Why does your way work when the obvious alternative does not?"). The VSL formula's load-bearing block, and the one thing the vsllab skill refuses to invent. Required, so a booked VSL pack never stalls on it.
- **What you've already tried.** Prefilled from `tried_already`; feeds Internal DNA and the VSL's "without" clause.
- **Revenue buckets aligned to the pathway rule:** Pre-revenue, Under $250K, $250K–$1M, $1M–$3M, $3M–$8M, $8M+. The old "Under $1M" bucket couldn't tell the skill whether to recommend EssentialsLab or flag a sub-$250K exception. Application answers like "$350k" or "250-500K" are mapped automatically; "Under $1M" is ambiguous, so it's asked.

## Step 2: brand

Upload (the Brand page's own uploader, embedded: logos, colors, fonts, guide, straight to their Drive folder) **or** "I need help with my brand", which asks the 9 questions the brandkit skill reasons about before it draws: where we're starting (fresh, refresh, keep the logo), the feeling, the visual world (the skill's visual modes), colors to use and avoid, the meaning behind the name (the logo's core metaphor), brands whose look they admire, what it must never look like, and a tagline. "I need help" queues a brand-kit job.

## Not done (needs Hiram)

- **Formspree copy of each submission** (endpoint `xqpejdvv`, links stripped for Formshield) was requested but not built. The build environment blocked sending client answers to a third party without Hiram's own go-ahead. It's one server-side `fetch` in the submit branch of `app/api/portal/onboarding/route.ts` once he OKs it.
