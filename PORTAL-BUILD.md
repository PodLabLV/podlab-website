# PodLab Client Portal — Build Summary

> **⚠️ STALE — historical record only. Do not build from this document.**
>
> This describes the March 17, 2026 mock-data build. Its central claim is no longer
> true: the portal reads **live Supabase**, not mock data. The August 2026 migrations
> (`20260811`, `20260811b`, `20260813`) added RLS-scoped tables, auth, service-role
> write routes, and a CRM trigger — none of which are described below.
>
> **Current state and the forward plan live in
> [`PORTAL-MODULE-ARCHITECTURE.md`](./PORTAL-MODULE-ARCHITECTURE.md).**
> Kept for the design-system notes in "Design System Applied", which are still accurate.

**Built:** March 17, 2026  
**Status:** ✅ Clean build (`npm run build` passes)  
**Data:** All mock/demo — superseded, see banner above

---

## What Was Built

### Portal Layout (`/app/portal/layout.tsx`)
- **Sidebar navigation** with 5 sections: Dashboard, Deliverables, Progress, Reports, Invoices
- Active state highlighting (green accent for current page)
- Client info card at bottom (mock: Marcus Simonian, ExpansionLab)
- "Back to PodLab" link to return to main site
- **Fully responsive** — collapses to hamburger menu on mobile with slide-out drawer + overlay
- Separate from main site Navigation — portal is its own experience

### 1. Dashboard (`/portal`) 
- Demo mode banner (green, dismissible-ready)
- Welcome message with client name + plan details
- **4 stat cards:** Active Projects (3), Deliverables Ready (7), This Month's ROI (4.2x), Next Milestone (Mar 22)
- **Recent activity feed** — 5 items with color-coded type badges (report, campaign, content, payment, deliverable)
- **Quick links** grid to all portal sections with hover effects

### 2. Deliverables (`/portal/deliverables`)
- **11 deliverable cards** across 3 Labs (AssetsLab, VideoSalesLab, ExpansionLab)
- Lab-colored badges (blue, purple, green)
- File type icons (PDF 📄, MP4 🎬, ZIP 📁, DOC 📝)
- Status badges: Ready (green), In Progress (yellow), Pending (gray)
- Download button for Ready items, file size display
- **Lab filter buttons** at top — filter by All, AssetsLab, VideoSalesLab, ExpansionLab

### 3. Progress Tracker (`/portal/progress`)
- **Pipeline legend** showing 5 stages: Discovery → Strategy → Production → Review → Delivered
- **4 active project cards** with:
  - Lab badge + project name
  - Visual stage pipeline (green bars for completed/current stages)
  - Progress bar with percentage
  - Start date + estimated completion
  - Assigned team member with avatar initials
- Projects span VideoSalesLab (Stephen) and ExpansionLab (Dakota, TipTop)

### 4. Reports / KPI Dashboard (`/portal/reports`) — The big one
- **Month selector** dropdown (March, February, January 2026)
- **Hero stat:** "$14,700 in attributed pipeline this month" — gradient border card
- **Money Row (3 cards):** Revenue Attributed ($14,700), ROAS (5.9x), CPA ($312)
- **Conversion Funnel:** Visual horizontal bars — Impressions (48.2K) → Clicks (2,410) → Leads (186) → Calls Booked (42) → Deals Closed (8) with conversion rates between each step
- **Content Scoreboard:** Top 3 performing pieces with views, CTR, leads
- **Ad Performance:** Summary metrics + campaign table (LinkedIn, Google, Meta)
- **Recommendations:** "What We're Doing Next Month" — 5 strategic bullets

### 5. Invoices (`/portal/invoices`)
- **Summary cards:** Total Invested ($21,000), Current Monthly ($3,500), Next Payment (Apr 1)
- **Desktop:** Full table with Invoice ID, Date, Description, Amount, Status, Receipt link
- **Mobile:** Card layout with same data, optimized for small screens
- **8 invoices** with realistic data (ExpansionLab monthly splits, VideoSalesLab package, AssetsLab)
- Status badges: Paid (green), Pending (yellow), Overdue (red)

---

## Design System Applied

- **Background:** `#0A0A0A` (portal bg), `#0F0F0F` (sidebar)
- **Cards:** `bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Accent:** `#2ADD1B` green throughout (badges, active states, CTAs, highlights)
- **Font:** Michroma (via `font-display` class) for all headings, uppercase + tracking
- **All pages:** `'use client'` components
- **Responsive:** Mobile-first with `sm:`, `lg:` breakpoints throughout

## Mock Data Notes

The demo data is modeled after a realistic **$3,500/month ExpansionLab client** (Simonian Law Group):
- Monthly split payments ($1,500 on 1st + $1,500 on 15th)
- Previous VideoSalesLab ($10K) and AssetsLab ($1.5K) purchases
- Realistic funnel metrics, ad spend, and content performance
- Team members assigned to actual PodLab roles (Stephen, Dakota, TipTop)

## Next Steps

- [ ] Wire Supabase for real client data (auth + RLS)
- [ ] Add client login/auth flow (replace demo mode)
- [ ] Connect Stripe for real invoice data
- [ ] Add file download URLs to deliverables
- [ ] Make month selector functional with historical data
- [ ] Add email notifications for new deliverables/reports
