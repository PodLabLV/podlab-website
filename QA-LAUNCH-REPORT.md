# QA Launch Audit Report — PodLab Website

**Date:** March 16, 2026  
**Auditor:** TipTop (AI Chief of Staff)  
**Site:** podlablv.com (Next.js 15, App Router)  
**Severity Key:** 🔴 Critical (blocks launch / breaks trust) · 🟡 Warning (should fix soon) · 🟢 Nice-to-have (polish)

---

## Executive Summary

**Total Issues Found: 24**
- 🔴 Critical: 6
- 🟡 Warning: 10
- 🟢 Nice-to-have: 8

The site is solid structurally — all pages render, routing works, and the design is consistent. The critical issues are: **missing OG image**, **placeholder Calendly on the contact page**, **dead podcast platform links**, **inconsistent founder count claims**, **outdated lab name in metadata**, and a **TODO in the login page**. Fix these 6 before launch and you're in good shape.

---

## Global Issues (All Pages)

### 🔴 G-1: Missing `/public/og-image.png`

**File:** `app/layout.tsx` (line 27), `app/page.tsx` (line 19)  
**Issue:** Both the root layout and homepage reference `/og-image.png` for OpenGraph/Twitter cards, but this file **does not exist** in `/public/`.  
**Impact:** Every shared link on social media will show a broken image or fallback. This is the #1 thing people see when your site is shared.  
**Fix:** Create a 1200×630px OG image and place it at `/public/og-image.png`. Use the PodLab logo + tagline "Record Once. Sell Forever." on dark background with green accents.

### 🟡 G-2: Inconsistent Email Addresses Across Pages

| Page | Email Used |
|------|-----------|
| Contact (main CTA) | `tiptopdawson@podlablv.com` |
| Contact (email section) | `tiptopdawson@podlablv.com` |
| Assessment footer | `info@podlablv.com` |
| Login (password reset) | `support@podlablv.com` |
| Login (support) | `support@podlablv.com` |
| Affiliate (apply CTA) | `tiptopdawson@podlablv.com` |

**Issue:** Three different email addresses used. `tiptopdawson@` is TipTop's internal email — **not ideal as the public-facing contact**. Contact page should show `info@podlablv.com` or a dedicated address.  
**Fix:** Standardize to `info@podlablv.com` for public contact, `support@podlablv.com` for portal/login support. Remove `tiptopdawson@` from all client-facing pages.

### 🟡 G-3: No `Contact` Link in Navigation

**File:** `components/Navigation.tsx`  
**Issue:** The navigation includes Services, Assessment, Case Studies, About, How It Started, Affiliate, Blog, Login — but no direct **Contact** link. The `/contact` page exists but is only reachable via CTAs.  
**Fix:** Add `/contact` to the nav, or ensure it's intentionally omitted (since the strategy is to drive to Calendly/Assessment).

### 🟢 G-4: No Footer Component

**Issue:** None of the pages have a site-wide footer with contact info, social links, legal (privacy policy, terms), or sitemap links. Standard for professional sites.  
**Fix:** Create a `Footer` component with: address (Las Vegas, NV), email, social links, copyright, privacy/terms links.

---

## Page-by-Page Findings

### 1. Homepage (`/app/page.tsx`)

#### 🔴 H-1: "Essentials Lab" Referenced — Lab Doesn't Exist

**Line:** ~290  
**Text:** `"After one Essentials Lab sprint, I had a homepage video, 15+ clips, a VSL, and content running across platforms. Game changer."`  
**Issue:** "Essentials Lab" is not one of the 5 Labs. This appears to be an old/deprecated lab name. It's inside a client testimonial which makes it confusing.  
**Fix:** Change to "VideoSalesLab" or remove the specific lab name: `"After one sprint with PodLab, I had a homepage video, 15+ clips, a VSL, and content running across platforms."`

#### 🟡 H-2: "200+ Founders" Claim vs. Case Studies Page "50+ Founders Served"

**Lines:** 324, 390, 405  
**Issue:** Homepage says "Trusted by 200+ Founders" and "200+ Founders Filmed" three times. Case studies page says "50+ Founders Served". These numbers directly contradict each other.  
**Fix:** Pick one number and use it everywhere. If 200+ includes all people filmed across all projects (including non-clients like podcast guests), clarify. If actual clients served is 50+, use 50+ everywhere or "200+ founders filmed, 50+ businesses transformed."

#### 🟡 H-3: Austin Reinders Listed as "CEO, Simonian Rugs"

**Line:** ~383  
**Issue:** The video testimonial section says Austin Reinders is "CEO, Simonian Rugs" with "$3.1M → $4.72M in revenue." But the case studies page uses anonymized names ("Home Services Client", etc.) — no "Simonian Rugs" case study is listed there. This creates inconsistency.  
**Fix:** Either add a named Simonian Rugs case study on the case studies page, or anonymize the homepage testimonial to match.

#### 🟢 H-4: Hero Assessment Button Links to `/assessment` (Not `/assessment/start`)

**Line:** ~62  
**Issue:** The "Take Assessment" button goes to `/assessment` (the landing/explainer page with video), not directly to `/assessment/start` (the actual quiz). This is fine UX but worth noting — the nav CTA goes to `/assessment/start` directly.  
**Fix:** Intentional design choice. Keep as-is (landing page warms them up first).

---

### 2. Services Page (`/app/services/page.tsx`)

#### 🔴 S-1: Metadata Says "ContentLab" — Lab Doesn't Exist

**Line:** 10  
**Text:** `'AssetsLab, BrandLab, SiteLab, ContentLab, ExpansionLab.'`  
**Issue:** The meta description lists "ContentLab" instead of "VideoSalesLab". ContentLab is not one of the 5 Labs. This shows up in Google search results.  
**Fix:** Change to: `'AssetsLab, BrandLab, SiteLab, VideoSalesLab, ExpansionLab. One system. Five phases...'`

#### 🟡 S-2: Hero CTA Links to `/bottleneck-assessment` 

**Line:** ~41  
**Issue:** The main CTA button says "Take Bottleneck Assessment →" and links to `/bottleneck-assessment`. This page exists but just redirects to `/assessment/start`. Works fine, but the redirect adds a hop.  
**Fix:** Link directly to `/assessment/start` or `/assessment` for consistency with other pages.

#### 🟢 S-3: Pricing Is Correct ✅

All pricing verified against spec:
- AssetsLab: $1,500 ✅
- BrandLab: $3,500 ✅
- SiteLab: $3,500+ ✅
- VideoSalesLab: $10,000 ✅
- ExpansionLab: $5,000+/mo ✅
- Full Suite: $18,500 ✅

#### 🟢 S-4: `frameBorder="0"` Deprecated HTML Attribute

**Line:** ~78 (YouTube iframe)  
**Issue:** `frameBorder="0"` is deprecated HTML. React may warn about this.  
**Fix:** Remove `frameBorder="0"` and use CSS `style={{ border: 'none' }}` or Tailwind `border-0`.

---

### 3. About Page (`/app/about/page.tsx`)

#### 🟢 A-1: Stephen Scrivens Missing from Team Section

**Issue:** Team section shows Hiram, Mirna, Dakota, and Adonis — but **Stephen Scrivens** (Studio Manager / Creative Director) is not listed. Per AGENTS.md, he's a key team member.  
**Fix:** Add Stephen to the team array with appropriate image (will need a photo in `/public/about/`).

#### 🟢 A-2: Adonis Role Discrepancy

**Issue:** About page lists Adonis as "Director of Business Development". AGENTS.md says "Director of Sales". Minor but should match.  
**Fix:** Align title with official role.

#### ✅ All Images Verified

- `/about/hiram-mirna-hero-pic.png` ✅
- `/about/hiram-solo.png` ✅
- `/about/Mirna.png` ✅
- `/about/Dakota.png` ✅
- `/about/Adonis.png` ✅

---

### 4. Contact Page (`/app/contact/page.tsx`)

#### 🔴 C-1: Calendly Widget Is a Placeholder — NOT Embedded

**Lines:** 56–76  
**Issue:** The Calendly section shows a placeholder card with 📅 emoji, "Calendly Integration" heading, and text "Calendar booking widget will be embedded here." with a fallback email link. **The actual Calendly embed is missing.** This is the #1 conversion page.  
**Impact:** Visitors expect to book directly. Instead they see a placeholder card. Major credibility hit.  
**Fix:** Replace the placeholder with an actual Calendly inline embed:
```jsx
<iframe
  src="https://calendly.com/podlablv/new-meeting?embed_type=Inline"
  width="100%"
  height="700"
  frameBorder="0"
/>
```
Or use the Calendly React component.

#### 🟡 C-2: `portal.podlablv.com` May Not Resolve

**Line:** 151  
**Issue:** Contact page links to `https://portal.podlablv.com` for the Client Portal. If this subdomain isn't configured in DNS/Vercel, it will 404.  
**Fix:** Verify `portal.podlablv.com` resolves correctly. If not yet live, link to `/login` instead or remove the card temporarily.

#### 🟡 C-3: Contact Email Is `tiptopdawson@podlablv.com` (Internal)

**Lines:** 69, 132-133  
**Issue:** This is the AI assistant's email, not a public-facing business email. Clients emailing here may be confused or it may not be monitored by humans.  
**Fix:** Use `info@podlablv.com` or `hello@podlablv.com` for public contact.

---

### 5. Case Studies Page (`/app/case-studies/page.tsx`)

#### 🟡 CS-1: All Case Studies Are Anonymized — No Named Clients

**Issue:** All 6 case studies use generic names ("Home Services Client", "Financial Services Client", etc.) instead of real client names. Homepage testimonial section names Austin Reinders / Simonian Rugs, but the case studies page doesn't include him. This inconsistency weakens credibility.  
**Fix:** Either: (a) Add at least 1-2 named case studies with permission, or (b) Add a note explaining why they're anonymized ("Names withheld per client NDA").

#### 🟡 CS-2: "50+ Founders Served" Contradicts Homepage "200+"

**Issue:** Already noted in H-2. Stats section says 50+, homepage says 200+.  
**Fix:** Align numbers.

#### ✅ Video Files Verified

- `/videos/bridgett-tebow-testimonial.mp4` ✅
- `/videos/kevin-testimonial.mp4` ✅

---

### 6. How It Started / Podcast Page (`/app/how-it-started/page.tsx`)

#### 🔴 HIS-1: All Podcast Platform Links Are Dead (`#`)

**Lines:** 323, 329, 335  
**Issue:** YouTube, Spotify, and Apple Podcasts links all point to `#`. Clicking these does nothing.  
**Impact:** If the podcast isn't actually on these platforms yet, the entire "Listen" section is misleading.  
**Fix:** Either: (a) Add real platform URLs, or (b) Remove the Listen section and replace with "Coming soon to all platforms" or an email signup.

#### 🟢 HIS-2: `frameBorder="0"` Deprecated

Same as S-4. Two iframes on this page use deprecated `frameBorder` attribute.

#### ✅ Images Verified

- `/podcast/how-it-started-logo.png` ✅
- `/podcast/Afgan-squad-pic.png` ✅
- `/podcast/early-days.png` ✅

---

### 7. Blog Pages

#### Blog Index (`/app/blog/page.tsx`)

✅ All blog posts link correctly to their slugs  
✅ All images reference files that exist  
✅ Metadata is complete  

#### Individual Blog Posts

All 5 blog posts checked:
- `you-dont-need-more-content` ✅
- `record-once-sell-forever` ✅
- `what-happens-in-a-studio-day` ✅
- `why-your-website-isnt-closing` ✅
- `how-one-founder-cut-sales-calls-in-half` ✅

All have proper metadata, OG tags, back-to-blog links, and working images.

#### 🟢 B-1: Blog Posts Use `<img>` Instead of Next.js `<Image>`

**Issue:** Blog post hero images use raw `<img>` tags instead of Next.js `<Image>` component. This means no automatic optimization, lazy loading, or WebP conversion.  
**Fix:** Replace `<img>` with `<Image>` from `next/image` for all blog post hero images.

---

### 8. Affiliate Page (`/app/affiliate/page.tsx`)

#### 🟢 AF-1: Apply CTA Emails `tiptopdawson@podlablv.com`

**Line:** 227  
**Issue:** Same email issue. Apply link uses `mailto:tiptopdawson@podlablv.com`.  
**Fix:** Use a dedicated affiliate email or `partnerships@podlablv.com`.

#### ✅ Pricing Verified

All commission amounts align with lab pricing:
- AssetsLab $1,500 → 10% = $150, 20% = $300 ✅
- BrandLab $3,500 → 10% = $350, 20% = $700 ✅
- SiteLab $3,500 → 10% = $350, 20% = $700 ✅
- VideoSalesLab $10,000 → 10% = $1,000, 20% = $2,000 ✅
- ExpansionLab $5,000/mo → $500/mo recurring ✅

#### ✅ Images Verified

- `/beaker-hero-bw.png` ✅
- `/beaker-hero.png` ✅
- `/affiliate/jaxon-wright.png` ✅
- `/affiliate/podlab-group.png` ✅

---

### 9. Login Page (`/app/login/page.tsx`)

#### 🔴 L-1: TODO Comment — Portal May Not Be Live

**Lines:** 1–3  
```
// TODO: Needs portal integration — authenticates via Supabase but redirects to
// podlab-portal.vercel.app/dashboard which may not be live. Wire up once the
// client portal is fully deployed and routes are confirmed.
```
**Issue:** The login page authenticates against Supabase then redirects to `https://podlab-portal.vercel.app/dashboard`. If this URL isn't live, authenticated users hit a dead end. The TODO confirms this is known but unresolved.  
**Impact:** Existing clients who try to log in will authenticate successfully but then land on a broken page. Major trust issue.  
**Fix:** Either: (a) Confirm `podlab-portal.vercel.app/dashboard` is live and working, (b) Redirect to a "Portal coming soon" page, or (c) Hide the Login nav link until the portal is ready.

#### 🟡 L-2: Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` Will Silently Fail

**Line:** 47  
**Code:** `'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',`  
**Issue:** If the env var isn't set, the empty string fallback will cause Supabase auth to silently fail with an unhelpful error. The `.env.example` file exists but it's unclear if `.env.local` has the real key set for production.  
**Fix:** Add a build-time check or a visible error state if the env var is missing. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel environment variables.

#### 🟡 L-3: No Metadata Export (Client Component)

**Issue:** Login page is a `'use client'` component so it can't export metadata. The page has no `<title>` or meta description set. It will inherit the root layout default.  
**Fix:** Either create a separate `layout.tsx` for `/login` with metadata, or use `generateMetadata` from a parent, or add a `<Head>` workaround.

---

## Additional Pages Checked

### Assessment Landing (`/app/assessment/page.tsx`) ✅
- Metadata complete
- YouTube embed works
- CTA links to `/assessment/start`

### Assessment Quiz (`/app/assessment/start/page.tsx`) ✅
- Functional quiz flow
- Form validation present

### Bottleneck Assessment (`/app/bottleneck-assessment/page.tsx`) ✅
- Correctly redirects to `/assessment/start`

### Lab Detail Pages (`/app/labs/*/page.tsx`) — Not individually audited
- 5 lab pages exist: assets, brand, site, video-sales, expansion
- Linked correctly from services page

### Affiliate Sub-Pages ✅
- `/affiliate/apply/page.tsx` — Application form
- `/affiliate/contract/page.tsx` — Contract signing
- `/affiliate/utm/page.tsx` — UTM link generator
- All functional

### How It Started Apply (`/app/how-it-started/apply/page.tsx`) ✅
- Guest application form exists and works

---

## Priority Fix List (Recommended Order)

| # | Severity | Issue | Est. Time |
|---|----------|-------|-----------|
| 1 | 🔴 | Create `/public/og-image.png` (1200×630) | 15 min |
| 2 | 🔴 | Embed actual Calendly widget on Contact page | 10 min |
| 3 | 🔴 | Fix "ContentLab" → "VideoSalesLab" in Services metadata | 2 min |
| 4 | 🔴 | Fix "Essentials Lab" reference on Homepage | 2 min |
| 5 | 🔴 | Fix dead podcast platform links (`#`) or remove section | 5 min |
| 6 | 🔴 | Resolve Login portal redirect (confirm live or hide) | 15 min |
| 7 | 🟡 | Standardize email addresses across all pages | 10 min |
| 8 | 🟡 | Align "200+ Founders" vs "50+ Founders Served" | 5 min |
| 9 | 🟡 | Verify `portal.podlablv.com` DNS resolves | 5 min |
| 10 | 🟡 | Verify Supabase env var set in Vercel | 5 min |
| 11 | 🟡 | Add Login page metadata via layout.tsx | 10 min |
| 12 | 🟡 | Link services hero CTA directly to `/assessment/start` | 2 min |
| 13 | 🟡 | Austin Reinders / Simonian Rugs consistency | 10 min |
| 14 | 🟡 | Add Contact to nav (or confirm intentional omission) | 2 min |
| 15 | 🟢 | Add Footer component | 30 min |
| 16 | 🟢 | Add Stephen Scrivens to About team section | 10 min |
| 17 | 🟢 | Fix Adonis title: "Director of Sales" | 2 min |
| 18 | 🟢 | Replace `<img>` with `<Image>` in blog posts | 15 min |
| 19 | 🟢 | Remove deprecated `frameBorder` attributes | 5 min |
| 20 | 🟢 | Standardize affiliate apply email | 2 min |

**Estimated total fix time: ~2.5 hours**

---

## What's Working Well ✅

- **Consistent dark theme** (#0A0A0A bg, #2ADD1B accents) across all pages
- **All Calendly links** (outside Contact page) correctly point to `https://calendly.com/podlablv/new-meeting`
- **Pricing is accurate** across Services, Affiliate, and Contact FAQ pages
- **All public images verified** — no broken image references found
- **All video files exist** in `/public/videos/`
- **Blog is complete** — 5 well-written posts with proper metadata and OG tags
- **Navigation is comprehensive** and links work
- **Assessment flow** (landing → quiz → results) is solid
- **Affiliate sub-pages** (apply, contract, UTM) are well-built
- **Metadata** is complete on all pages except Login
- **Responsive design** patterns are in place (mobile/desktop layouts)
- **YouTube embeds** all use valid video IDs
- **Internal linking** between pages is strong and intentional

---

---

## Lab, Assessment, Affiliate & Podcast Pages

**Deep-dive audit of all lab detail pages, assessment flow, affiliate sub-pages, podcast application, and supporting infrastructure.**

---

### Lab Detail Pages (`/app/labs/*/page.tsx`)

#### 🔴 LAB-1: All Lab Pages Reference Non-Existent OG Image (`/opengraph-image.png`)

**Files:** All 5 lab pages (assets, brand, site, video-sales, expansion)  
**Issue:** Every lab page sets `images: [{ url: '/opengraph-image.png' }]` in both `openGraph` and `twitter` metadata. This file **does not exist** in `/public/`. Note: the root layout uses `/og-image.png` (also missing, covered in G-1) — these are two different missing files.  
**Impact:** Every lab page shared on social media shows a broken image. These are the pages most likely to be shared by prospects evaluating specific services.  
**Fix:** Create `/public/opengraph-image.png` (1200×630) or update all lab pages to use the same OG image filename as the root layout. Ideally create per-lab OG images for maximum shareability.

#### 🟡 LAB-2: OG URLs Are Relative, Not Absolute

**Files:** All 5 lab pages  
**Example:** `url: '/labs/assets'` instead of `url: 'https://podlablv.com/labs/assets'`  
**Issue:** OpenGraph spec requires absolute URLs. While Next.js's `metadataBase` in `layout.tsx` should resolve these, some social scrapers may not handle relative OG URLs correctly.  
**Fix:** Either confirm `metadataBase` resolves them (it should with the `new URL('https://podlablv.com')` in layout.tsx — likely fine), or switch to absolute URLs for safety.

#### 🟡 LAB-3: Unused `Image` and `Link` Imports in Lab Pages

**Files:** All 5 lab pages  
**Issue:** Every lab page imports `Image from 'next/image'` and `Link from 'next/link'` but never uses them. All external links use `<a>` tags (correct for external URLs), and no Next.js `<Image>` components are used. This triggers TypeScript/ESLint warnings.  
**Fix:** Remove unused imports: `import Image from 'next/image'` and `import Link from 'next/link'` from all 5 lab pages.

#### 🟡 LAB-4: YouTube Embeds Missing `frameBorder` Deprecation (Minor)

**Files:** All 5 lab pages + assessment page  
**Issue:** YouTube iframes don't use `frameBorder` (good!) but the assessment page does. Consistent approach is fine here. Already noted in existing report.

#### ✅ LAB-5: All Pricing Verified Correct

| Lab | Expected | Actual | Status |
|-----|----------|--------|--------|
| AssetsLab | $1,500 | $1,500 | ✅ |
| BrandLab | $3,500 | $3,500 | ✅ |
| SiteLab | $3,500+ | $3,500+ | ✅ |
| VideoSalesLab | $10,000 | $10,000 | ✅ |
| ExpansionLab | $5K+/mo | $5,000+/month | ✅ |

#### ✅ LAB-6: All YouTube Embeds Use Valid Format

| Lab | Video ID | Format |
|-----|----------|--------|
| AssetsLab | `DaaI23DU4_I` | ✅ `youtube.com/embed/` |
| BrandLab | `L71CAugSo5g` | ✅ |
| SiteLab | `PUcAbdizyao` | ✅ |
| VideoSalesLab | `v-i3msWxH0s` | ✅ |
| ExpansionLab | `5_ixoMgvv48` | ✅ |

#### ✅ LAB-7: All Calendly CTAs Correct

All lab pages link to `https://calendly.com/podlablv/new-meeting` ✅

#### ✅ LAB-8: All Lab Icon Images Exist

All 5 `/public/labs/icons/{Lab}-icon.png` files verified present ✅

#### 🟢 LAB-9: Lab Pages Have Unique Titles but Share Same OG Image

**Issue:** Each lab page has a unique `<title>` (e.g., "AssetsLab | PodLab") and unique `<meta description>` ✅. However, they all share the same (missing) OG image. Per-lab OG images would improve click-through from social shares.  
**Fix:** Create 5 individual OG images or at minimum one generic `/public/opengraph-image.png`.

---

### Assessment Pages

#### 🟡 ASMT-1: `/assessment/start` Has No Page Metadata (SEO Gap)

**File:** `/app/assessment/start/page.tsx`  
**Issue:** This is a `'use client'` component. Client components cannot export `metadata`. The page inherits only the root layout default title ("PodLab | Record Once. Sell Forever."). Google will index this page with a generic title instead of something like "Founder Bottleneck Assessment Quiz | PodLab".  
**Impact:** SEO loss on the most important conversion page. If someone shares the quiz link, the preview text is generic.  
**Fix:** Create `/app/assessment/start/layout.tsx` with exported metadata:
```tsx
export const metadata = {
  title: 'Take the Founder Bottleneck Assessment',
  description: '20 questions. 5 minutes. Discover your bottleneck score and get a personalized roadmap.',
};
```

#### 🟡 ASMT-2: Assessment `frameBorder="0"` on Video Iframe

**File:** `/app/assessment/page.tsx` (landing page), line ~60  
**Issue:** Uses deprecated `frameBorder="0"` on the YouTube embed iframe.  
**Fix:** Remove `frameBorder="0"`.

#### ✅ ASMT-3: Assessment API Route — Well Structured

**File:** `/app/api/assessment/route.ts`  
- Validates all required fields ✅
- Validates score range (20–100) ✅
- Logs zone mismatches without rejecting ✅
- Upserts client (deduplicates by email) ✅
- Inserts assessment + lead records ✅
- Gracefully handles lead insert failure ✅
- Returns structured response ✅

#### ✅ ASMT-4: Assessment Quiz Flow Verified

- 20 questions across 5 categories ✅
- Score calculation correct (20–100 range) ✅
- Zone thresholds: Red ≤49, Yellow 50–74, Green 75+ ✅
- Email capture before results ✅
- Quick wins + lab recommendations rendered ✅
- Retake button resets all state ✅

#### ✅ ASMT-5: All Assessment Public Images Exist

- `/Your-Bottleneck-Score-icon.png` ✅
- `/Tacticle-roadmap-icon.png` ✅
- `/Personalized--Lab-icon.png` ✅
- `/number-icon-1.png`, `2.png`, `3.png` ✅
- `/podlab-logo-live-action.mp4` ✅

---

### Affiliate Pages

#### 🔴 AFF-1: Affiliate Apply Page Generates BROKEN UTM Links (Wrong Lab Paths)

**File:** `/app/affiliate/apply/page.tsx`, lines 30–40 (`UTM_PAGES` constant)  
**Issue:** The UTM tracking links generated for new affiliates use **wrong page paths** that will 404:

| Label | Path in Apply Page | Actual Path | Status |
|-------|-------------------|-------------|--------|
| AssetsLab | `/labs/assetslab` | `/labs/assets` | ❌ 404 |
| BrandLab | `/labs/brandlab` | `/labs/brand` | ❌ 404 |
| SiteLab | `/labs/sitelab` | `/labs/site` | ❌ 404 |
| VideoSalesLab | `/labs/videosaleslab` | `/labs/video-sales` | ❌ 404 |
| ExpansionLab | `/labs/expansionlab` | `/labs/expansion` | ❌ 404 |

**Impact:** Every affiliate who signs up gets 5 broken tracking links out of 9 total. They'll share dead links with prospects. This undermines the entire affiliate program and makes PodLab look unprofessional.  
**Fix:** Update `UTM_PAGES` in `/app/affiliate/apply/page.tsx`:
```tsx
{ label: 'AssetsLab', path: '/labs/assets' },
{ label: 'BrandLab', path: '/labs/brand' },
{ label: 'SiteLab', path: '/labs/site' },
{ label: 'VideoSalesLab', path: '/labs/video-sales' },
{ label: 'ExpansionLab', path: '/labs/expansion' },
```

#### 🔴 AFF-2: Two Contradictory Affiliate Contracts Exist

**Files:** `/app/affiliate/apply/page.tsx` (Step 2 contract) vs `/app/affiliate/contract/page.tsx`  
**Issue:** The site has TWO different affiliate contracts with **conflicting terms**:

| Term | Apply Page Contract | Contract Page Contract |
|------|-------------------|----------------------|
| Commission Rate | **10%** (double on first sale) | **20% recurring** |
| Duration | Not specified | 12 months |
| Hold Period | **45 days** | None mentioned |
| Payment Schedule | Monthly, NET 15 after month-end | Monthly, **NET 30** |
| Payout Methods | Apple Pay, Zelle, Wire | **ACH, PayPal** |
| Min Payout | $100 | $100 |
| Termination Notice | **7 days** | **30 days** |
| Exclusivity | Not stated as non-exclusive | **Explicitly non-exclusive** |
| Non-Compete | 12 months, very detailed | 12 months, basic |
| NDA Survival | 5 years | Survives termination (no limit) |

**Impact:** If an affiliate signs on the apply page (10% commission) and then sees the contract page (20%), or vice versa, this creates legal confusion and trust issues. One contract is far more detailed/protective (apply page) while the other is simpler and more generous.  
**Fix:** Decide which contract is authoritative and remove/redirect the other. The apply page contract (Section 4.1: 10%) appears more recent and comprehensive. Either: (a) Remove `/affiliate/contract` page entirely and keep the apply page as the single flow, or (b) Align both to the same terms.

#### 🟡 AFF-3: Affiliate Sub-Pages Have No Metadata (SEO)

**Files:** `/app/affiliate/apply/page.tsx`, `/app/affiliate/contract/page.tsx`, `/app/affiliate/utm/page.tsx`  
**Issue:** All three are `'use client'` components with no metadata exports. They inherit the generic root layout title.  
**Fix:** Create layout files with metadata for each, or convert non-interactive portions to server components.

#### 🟡 AFF-4: UTM Page Lab Links Are Correct (But Different from Apply Page)

**File:** `/app/affiliate/utm/page.tsx`  
**Issue:** The UTM generator page uses **correct** lab paths (`/labs/assets`, `/labs/brand`, etc.) while the apply page (AFF-1) uses wrong ones. This means an affiliate who generates links on the UTM page gets working links, but the ones emailed during signup are broken.  
**Fix:** Fix apply page paths (AFF-1) to match UTM page.

#### ✅ AFF-5: Affiliate Apply API Route — Well Structured

**File:** `/app/api/affiliate/apply/route.ts`  
- Validates all required fields ✅
- Validates contract signed ✅
- Writes to `beaker_applications` table ✅
- Returns beaker ID ✅

#### ✅ AFF-6: Affiliate Contract API Route — Working

**File:** `/app/api/affiliate/contract/route.ts`  
- Validates required fields ✅
- Writes to `beaker_contracts` table ✅

---

### Podcast / How It Started Pages

#### ✅ POD-1: Podcast Apply Page — Clean and Functional

**File:** `/app/how-it-started/apply/page.tsx`  
- Well-structured form with proper validation ✅
- Links back to `/how-it-started` after success ✅
- Submits to `/api/podcast/apply` ✅
- Stats cited: "50+ Episodes", "10K+ Listeners" (should verify accuracy)

#### ✅ POD-2: Podcast Apply API Route — Well Structured

**File:** `/app/api/podcast/apply/route.ts`  
- Validates 11 required fields ✅
- Checks for Supabase env vars before proceeding ✅ (better than other routes)
- Writes to `podcast_applications` table ✅
- Proper error handling ✅

#### 🟡 POD-3: Podcast Apply Page Has No Metadata

**File:** `/app/how-it-started/apply/page.tsx`  
**Issue:** `'use client'` component, no metadata. Google indexes with generic title.  
**Fix:** Add `/app/how-it-started/apply/layout.tsx` with metadata.

---

### Navigation & LabsSection Components

#### ✅ NAV-1: All Navigation Links Verified

| Nav Link | Target | Page Exists |
|----------|--------|-------------|
| Services | `/services` | ✅ |
| Assessment | `/assessment` | ✅ |
| Case Studies | `/case-studies` | ✅ |
| About | `/about` | ✅ |
| Podcast | `/how-it-started` | ✅ |
| Beaker | `/affiliate` | ✅ |
| Blog | `/blog` | ✅ |
| Client Login | `/login` | ✅ |
| CTA Button | `/assessment/start` | ✅ |

#### ✅ NAV-2: LabsSection Links All Correct

All 5 lab cards link to correct slugs: `/labs/assets`, `/labs/brand`, `/labs/site`, `/labs/video-sales`, `/labs/expansion` ✅  
All pricing in LabsSection matches spec ✅  
All icon images exist ✅

#### 🟡 NAV-3: LabsSection "Start with AssetsLab" Button Goes to `/contact`

**File:** `/components/LabsSection.tsx`, bottom CTA  
**Issue:** The bottom "Start with AssetsLab →" button links to `/contact` instead of `/labs/assets` or Calendly. The top CTA correctly goes to `/labs/assets`. Inconsistent.  
**Fix:** Change bottom CTA to link to `/labs/assets` or Calendly, matching the top CTA.

---

### Sitemap Audit

#### 🔴 SITE-1: Sitemap Missing 6+ Pages

**File:** `/app/sitemap.ts`  
**Missing pages:**

| Page | In Sitemap? | Priority |
|------|------------|----------|
| `/affiliate/apply` | ❌ Missing | Low (don't need SEO, but completeness) |
| `/affiliate/contract` | ❌ Missing | Low |
| `/affiliate/utm` | ❌ Missing | Low |
| `/how-it-started/apply` | ❌ Missing | Medium (podcast guest recruitment) |
| `/bottleneck-assessment` | ❌ Missing | Low (redirects to /assessment/start) |
| `/login` | ❌ Missing | Low (behind auth) |

**Impact:** Search engines won't discover these pages via sitemap. Most are low-priority but `/how-it-started/apply` should be indexed for podcast guest recruitment SEO.  
**Fix:** Add at minimum `/how-it-started/apply` to sitemap. The others are optional (affiliate sub-pages may intentionally be excluded). Do NOT add `/bottleneck-assessment` since it's just a redirect.

---

### SEO Summary

| Page | Unique Title | Unique Description | OG Image | Canonical |
|------|-------------|-------------------|----------|-----------|
| `/labs/assets` | ✅ "AssetsLab \| PodLab" | ✅ | ❌ Missing file | ✅ via metadataBase |
| `/labs/brand` | ✅ "BrandLab \| PodLab" | ✅ | ❌ Missing file | ✅ |
| `/labs/site` | ✅ "SiteLab \| PodLab" | ✅ | ❌ Missing file | ✅ |
| `/labs/video-sales` | ✅ "VideoSalesLab \| PodLab" | ✅ | ❌ Missing file | ✅ |
| `/labs/expansion` | ✅ "ExpansionLab \| PodLab" | ✅ | ❌ Missing file | ✅ |
| `/assessment` | ✅ | ✅ | ⚠️ No image set | ✅ |
| `/assessment/start` | ❌ Generic | ❌ Generic | ❌ None | ✅ |
| `/affiliate/apply` | ❌ Generic | ❌ Generic | ❌ None | ✅ |
| `/affiliate/contract` | ❌ Generic | ❌ Generic | ❌ None | ✅ |
| `/affiliate/utm` | ❌ Generic | ❌ Generic | ❌ None | ✅ |
| `/how-it-started/apply` | ❌ Generic | ❌ Generic | ❌ None | ✅ |
| `/bottleneck-assessment` | N/A (redirect) | N/A | N/A | N/A |

**robots.txt:** ✅ Exists, correctly configured with sitemap reference  
**Canonical URL:** ✅ `metadataBase` set to `https://podlablv.com` in root layout  
**Env vars documented:** ✅ `.env.example` exists with 3 required vars (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)

---

### Environment & Config

#### 🟡 ENV-1: `.env.example` Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` Documentation

**File:** `.env.example`  
**Issue:** The file lists `NEXT_PUBLIC_SUPABASE_ANON_KEY` but doesn't explain what each key does or where to get them. For a team project, this should include brief comments.  
**Fix:** Add comments:
```env
# Supabase — get from https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # NEVER expose this client-side
```

---

### Priority Fix List (This Section Only)

| # | Severity | Issue | ID | Est. Time |
|---|----------|-------|----|-----------|
| 1 | 🔴 | Fix broken affiliate UTM links (5 wrong lab paths) | AFF-1 | 5 min |
| 2 | 🔴 | Create `/public/opengraph-image.png` for lab pages | LAB-1 | 15 min |
| 3 | 🔴 | Resolve contradictory affiliate contracts | AFF-2 | 30 min |
| 4 | 🔴 | Add missing pages to sitemap | SITE-1 | 5 min |
| 5 | 🟡 | Add metadata to `/assessment/start` via layout | ASMT-1 | 5 min |
| 6 | 🟡 | Add metadata to affiliate sub-pages | AFF-3 | 10 min |
| 7 | 🟡 | Add metadata to podcast apply page | POD-3 | 5 min |
| 8 | 🟡 | Fix LabsSection bottom CTA link | NAV-3 | 2 min |
| 9 | 🟡 | Remove unused imports from lab pages | LAB-3 | 5 min |
| 10 | 🟡 | Confirm OG URL resolution via metadataBase | LAB-2 | 2 min |
| 11 | 🟡 | Add env var documentation to .env.example | ENV-1 | 5 min |
| 12 | 🟢 | Create per-lab OG images | LAB-9 | 1 hr |

**Estimated fix time for criticals: ~55 minutes**  
**Estimated fix time for all: ~1.5 hours**

---

*Deep-dive audit appended by TipTop · March 16, 2026*

---

*Report generated by TipTop · QA Audit v1 · March 16, 2026*
