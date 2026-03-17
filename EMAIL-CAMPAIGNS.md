# PodLab Email Campaigns — Instantly Setup

**Created:** 2026-03-17  
**Platform:** Instantly (via Maton Gateway API)  
**Status:** All campaigns in DRAFT — ready for leads + activation  
**Workspace:** PodLab LV (org: `823ad557-e69c-472f-acb2-d729b7c64c45`)

---

## Sending Accounts

5 warmed accounts on `levaignitescope.org` domain (secondary domain to protect podlablv.com reputation):

| Email | Status | Warmup Score |
|-------|--------|--------------|
| carly@levaignitescope.org | Active (1) | 100 |
| charles@levaignitescope.org | Active (1) | 100 |
| lydia@levaignitescope.org | Active (1) | 100 |
| donald@levaignitescope.org | Active (1) | 100 |
| ethan@levaignitescope.org | Active (1) | 100 |

**Note:** `info@podlablv.com` is NOT configured as a sending account in Instantly. The levaignitescope.org domain is used for cold outreach to protect the primary domain's deliverability. This is industry best practice.

**⚠️ To add info@podlablv.com as a sending account**, you'd need to:
1. Connect the email via SMTP/IMAP or Google/Microsoft OAuth in Instantly
2. Warm it up for 2-4 weeks before cold sending
3. Set up SPF, DKIM, and DMARC for podlablv.com (if not already done)

---

## Campaign Settings (All Campaigns)

- **Schedule:** Weekdays 9 AM – 5 PM Pacific (America/Dawson timezone)
- **Text only:** Yes (plain text, no HTML formatting)
- **Stop on reply:** Yes
- **Stop on auto-reply:** Yes  
- **Open tracking:** Disabled (improves deliverability)
- **Link tracking:** Disabled (improves deliverability)
- **Sending accounts:** All 5 levaignitescope.org accounts
- **Email gap:** 15 minutes between sends

---

## Campaign 1: Founder Bottleneck — Cold Outreach

**Campaign ID:** `89197c01-3964-4783-89f0-c6e632bd0377`  
**Status:** Draft (0)  
**Daily limit:** 30 emails/day  
**Target:** Service-based founders doing $1M–$8M  

### Email 1 — Day 0 (Initial Contact)

**Subject:** `quick question, {{firstName}}`

```
Hey {{firstName}},

I work with service-based founders doing $1M-$8M who hit the same wall — the business can't grow because it can't sell without them in the room.

Everything runs through the founder. Every deal. Every pitch. Every "let me hop on a quick call."

We help founders build video sales assets that do the selling for them. Record once, deploy everywhere, close while you sleep.

If that sounds like your world, there's a free 2-min assessment that'll show you exactly where your bottleneck is:

https://podlablv.com/assessment/start

No pitch. No call. Just clarity.

— Hiram
```

**Delay after:** 3 days

### Email 2 — Day 3 (Case Study Follow-Up)

**Subject:** `Re: quick question, {{firstName}}`

```
Hey {{firstName}},

Quick follow-up — wanted to share something relevant.

Austin ran a consulting firm doing $3.1M. Smart guy, great at what he does. But every deal needed him on camera, on calls, on stage.

We built him 5 video sales assets. His team started closing without him. Revenue hit $4.72M in 8 months. He took his first real vacation in 4 years.

The bottleneck wasn't his team — it was that his expertise lived only in his head.

If you're curious where your bottleneck sits:
https://podlablv.com/assessment/start

Takes 2 minutes.

— Hiram
```

**Delay after:** 4 days

### Email 3 — Day 7 (Value Add — Content as Infrastructure)

**Subject:** `content isn't marketing`

```
{{firstName}},

Most founders think content = social media posts and blogs. That's marketing.

What we build is different — content as sales infrastructure.

Think: a video that replaces your discovery call. A walkthrough that handles objections before the prospect ever talks to your team. An asset that qualifies leads 24/7.

The founders who scale past $3M all figure this out eventually. The ones who figure it out early save 2-3 years of grinding.

If you want to see where your business sits on that curve:
https://podlablv.com/assessment/start

Happy to share more either way.

— Hiram
```

**Delay after:** 7 days

### Email 4 — Day 14 (Graceful Close)

**Subject:** `closing the loop`

```
{{firstName}},

Last note from me on this — don't want to be that person clogging your inbox.

If now's not the right time, totally get it. Running a business at your level means a thousand priorities competing for attention.

The assessment will be there whenever you're ready:
https://podlablv.com/assessment/start

Either way, respect what you're building. Keep going.

— Hiram

P.S. If you know another founder who might benefit, feel free to forward this along.
```

---

## Campaign 2: Beaker Recruitment — Affiliate Partners

**Campaign ID:** `51f0647c-f193-4fa8-98ff-a382317d662f`  
**Status:** Draft (0)  
**Daily limit:** 20 emails/day  
**Target:** Coaches, consultants, networkers who know founders  

### Email 1 — Day 0 (Introduction)

**Subject:** `earn 20% helping founders you already know`

```
Hey {{firstName}},

Quick question — do you know a founder who's the bottleneck in their business?

The one who can't take a week off because every deal needs them in the room?

We run PodLab — we turn founder expertise into video sales assets so the business can sell without the founder present. Our clients are service-based founders doing $1M-$8M.

We just launched our Beaker program: refer a founder, earn 20% on their first lab ($300-$2,000 per referral).

No selling required. You just make the intro — we handle everything.

If that's interesting, here's the quick apply:
https://podlablv.com/affiliate/apply

Happy to answer any questions.

— Hiram
PodLab LV
```

**Delay after:** 3 days

### Email 2 — Day 3 (Program Details)

**Subject:** `Re: earn 20% helping founders you already know`

```
{{firstName}},

Following up on the Beaker program — wanted to give you the quick breakdown:

→ You refer a founder who's the bottleneck in their biz
→ They go through our assessment (takes 2 min)
→ If they buy a lab, you earn 20% commission
→ Tracked via your unique UTM link — fully transparent
→ Payouts monthly, no cap

Our labs range from $1,500 to $10,000, so a single referral can put $300-$2,000 in your pocket.

Three Beakers are already earning passive income from their network. Just warm intros, no pitch decks.

Apply here if you want in:
https://podlablv.com/affiliate/apply

— Hiram
```

**Delay after:** 4 days

### Email 3 — Day 7 (Graceful Close)

**Subject:** `last call — Beaker program`

```
{{firstName}},

Last note on this — totally understand if it's not your thing.

Just wanted you to know the Beaker program is there if you ever meet a founder who needs it. Think of it as getting paid for introductions you'd probably make anyway.

No pressure, no quota, no contract. Just value for everyone involved.

https://podlablv.com/affiliate/apply

Appreciate your time either way.

— Hiram
```

---

## Campaign 3: How It Started — Podcast Guest Outreach

**Campaign ID:** `0f0b7204-e70b-40c5-8e11-376f6ecba134`  
**Status:** Draft (0)  
**Daily limit:** 15 emails/day  
**Target:** Founders with interesting stories, $1M+ revenue  

### Email 1 — Day 0 (Invitation)

**Subject:** `your story could inspire 1000 founders`

```
Hey {{firstName}},

I run a podcast called How It Started — real conversations with founders about the messy, honest journey of building something from scratch.

Not the highlight reel. The real stuff. The moments that almost broke you and the ones that changed everything.

I came across your work and thought your story would resonate with our audience of service-based founders doing $1M-$8M.

Would you be open to a 45-minute conversation? We handle production, editing, distribution — you just show up and be real.

If you're interested:
https://podlablv.com/how-it-started/apply

Either way, respect what you've built.

— Hiram Andino
Founder, PodLab LV
```

**Delay after:** 5 days

### Email 2 — Day 5 (Details & Social Proof)

**Subject:** `Re: your story could inspire 1000 founders`

```
{{firstName}},

Quick follow-up on the podcast invite.

How It Started is about founder origin stories — the real ones. We've had founders share how they went from side hustle to $5M, from burnout to breakthrough, from failure to framework.

What guests get:
→ Professional production (we handle everything)
→ Full episode distributed across all platforms
→ Clips for your own social channels
→ Exposure to our audience of growth-stage founders

It's a conversation, not an interview. No gotcha questions — just two founders talking about what it actually takes.

If you're open to it:
https://podlablv.com/how-it-started/apply

— Hiram
```

**Delay after:** 5 days

### Email 3 — Day 10 (Graceful Close)

**Subject:** `last invite — How It Started podcast`

```
{{firstName}},

Last note on this — I know your inbox is full and your calendar is fuller.

If the timing doesn't work, no worries at all. The invite stands whenever you're ready.

https://podlablv.com/how-it-started/apply

Keep building.

— Hiram
```

---

## API Calls & Responses

### Connection Verification
```
GET https://ctrl.maton.ai/connections/80ed11c4-e00c-4a6e-b61d-271eb9f7e35a
Headers: Authorization: Bearer {MATON_API_KEY}

Response: Connection active, provider: "instantly"
```

### List Sending Accounts
```
GET https://gateway.maton.ai/instantly/api/v2/accounts?limit=50
Headers: Authorization: Bearer {MATON_API_KEY}, Maton-Connection: {CONN_ID}

Response: 5 accounts on levaignitescope.org, all status=1 (active), warmup_score=100
```

### Create Campaign 1 (Founder Bottleneck)
```
POST https://gateway.maton.ai/instantly/api/v2/campaigns
Headers: Authorization: Bearer {MATON_API_KEY}, Maton-Connection: {CONN_ID}, Content-Type: application/json

Body: {name, campaign_schedule, email_list, sequences (4 steps), text_only: true, 
       stop_on_reply: true, daily_limit: 30, open_tracking: false, link_tracking: false}

Response: 200 OK
  id: "89197c01-3964-4783-89f0-c6e632bd0377"
  status: 0 (Draft)
```

### Create Campaign 2 (Beaker Recruitment)
```
POST https://gateway.maton.ai/instantly/api/v2/campaigns
Headers: (same)

Body: {name, campaign_schedule, email_list, sequences (3 steps), text_only: true,
       stop_on_reply: true, daily_limit: 20, open_tracking: false, link_tracking: false}

Response: 200 OK
  id: "51f0647c-f193-4fa8-98ff-a382317d662f"
  status: 0 (Draft)
```

### Create Campaign 3 (Podcast Guest Outreach)
```
POST https://gateway.maton.ai/instantly/api/v2/campaigns
Headers: (same)

Body: {name, campaign_schedule, email_list, sequences (3 steps), text_only: true,
       stop_on_reply: true, daily_limit: 15, open_tracking: false, link_tracking: false}

Response: 200 OK
  id: "0f0b7204-e70b-40c5-8e11-376f6ecba134"
  status: 0 (Draft)
```

### Verification (GET each campaign)
All 3 campaigns confirmed with correct email steps, sending accounts, and draft status.

---

## Next Steps to Go Live

### 1. Add Leads
Upload lead lists (CSV) via Instantly UI or API:
```
POST /api/v2/leads
{
  "campaign": "{campaign_id}",
  "leads": [
    {"email": "founder@company.com", "first_name": "John", "company_name": "Acme"}
  ]
}
```

Required fields per lead: `email`, `first_name` (used in `{{firstName}}` personalization)

### 2. Verify Landing Pages Exist
- [ ] `podlablv.com/assessment/start` — Bottleneck Assessment
- [ ] `podlablv.com/affiliate/apply` — Beaker Program Application
- [ ] `podlablv.com/how-it-started/apply` — Podcast Guest Application

### 3. Activate Campaigns
```
POST /api/v2/campaigns/{id}/activate
```
Start with Campaign 1 (Founder Bottleneck) first — it's the revenue driver.

### 4. Consider Adding
- **A/B test variants** — add variant B subjects to each step for split testing
- **Custom tracking domain** — set up a tracking subdomain on levaignitescope.org
- **Unsubscribe link** — add `{{unsubscribe}}` footer if required by your market
- **Warm up podlablv.com** — add info@podlablv.com as a sending account + warm for 3-4 weeks for higher trust sends

### 5. Monitor
- Check Instantly dashboard for open rates, reply rates, bounce rates
- Pause campaigns if bounce rate > 5%
- Iterate on subject lines based on open rates after first 100 sends

---

## Important Notes

1. **Sending domain:** levaignitescope.org (NOT podlablv.com) — this protects your primary domain reputation
2. **All campaigns are DRAFT** — they won't send until activated with leads added
3. **Delay logic:** The `delay` field on each step is the wait BEFORE the next email. Last email has delay=0 (end of sequence).
4. **Personalization:** Uses `{{firstName}}` — make sure lead data includes `first_name` field
5. **Deliverability settings:** Open tracking OFF, link tracking OFF, text-only ON — maximizes inbox placement
6. **Daily limits:** Conservative (30/20/15) — can increase after monitoring deliverability for 1-2 weeks
