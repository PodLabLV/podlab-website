# Monday.com CRM Buildout — PodLab LV

**Built:** 2026-03-17  
**Status:** ✅ Complete  

---

## Summary

| Board | ID | Action | Status |
|-------|----|--------|--------|
| Sales Pipeline | 18400694687 | Updated (groups + columns) | ✅ |
| Clients | 18400694446 | Updated (groups + columns + items) | ✅ |
| Content Calendar (Social Media Planner) | 18389748986 | Updated (groups + columns) | ✅ |
| Beaker Affiliates | **18404208366** | Created new | ✅ |
| Email Campaigns | **18404208415** | Created new | ✅ |
| Contacts | 18395895903 | Queried (read-only) | ✅ |

---

## 1. Sales Pipeline (ID: 18400694687)

**Action:** Cleaned up — added 8 pipeline stage groups and 8 tracking columns.

### Groups Created
| Group | ID |
|-------|----|
| Cold Leads | group_mm1hvfxv |
| Warm Leads (Assessment Taken) | group_mm1h1gnt |
| Discovery Call Scheduled | group_mm1hpds7 |
| Discovery Call Done | group_mm1hnbwz |
| Proposal Sent | group_mm1h74hz |
| Negotiation | group_mm1hrwqh |
| Closed Won | group_mm1hyry1 |
| Closed Lost | group_mm1hr3ya |

### Columns Added
| Column | Type | ID |
|--------|------|----|
| Lead Source | Dropdown (Website, Assessment, Referral, Beaker, Podcast, Cold Email, LinkedIn, Other) | dropdown_mm1hf1ez |
| Lab Interest | Dropdown (AssetsLab, BrandLab, SiteLab, VideoSalesLab, ExpansionLab) | dropdown_mm1hx0sm |
| Deal Value | Numbers | numeric_mm1hscfw |
| Contact Email | Email | email_mm1h2bvd |
| Contact Phone | Phone | phone_mm1h63t8 |
| Next Action | Text | text_mm1hes2x |
| Next Action Date | Date | date_mm1h8en5 |
| Notes | Long Text | long_text_mm1hknfy |

**Pre-existing columns kept:** Name, Person, Status, Date.

---

## 2. Clients Board (ID: 18400694446)

**Action:** Added 3 groups, 7 new columns, and 5 active client items.

### Groups Created
| Group | ID |
|-------|----|
| Active Clients | group_mm1h5bsz |
| Past Clients | group_mm1hwx48 |
| Prospects | group_mm1hj8mw |

### Columns (existing + new)
| Column | Type | ID | Status |
|--------|------|----|--------|
| Contact Person | Text | text_mm0qe9ft | Existed |
| Email | Email | email_mm0qjh8z | Existed |
| Phone | Phone | phone_mm0qn0kd | Existed |
| Lab(s) Purchased | Dropdown (AssetsLab–ExpansionLab) | dropdown_mm1hdmxd | **New** |
| Monthly Revenue | Numbers | numeric_mm1h736w | **New** |
| Total Revenue | Numbers | numeric_mm1haepg | **New** |
| Client Status | Status | color_mm1hp611 | **New** |
| Start Date | Date | date_mm1h5wkn | **New** |
| Payment Status | Status | color_mm1hntvs | **New** |
| Next Payment Date | Date | date_mm1h1aee | **New** |

### Client Items Added (Active Clients group)
| Client | Item ID | Contact | Monthly Rev |
|--------|---------|---------|-------------|
| ISW | 11524157458 | Ronnie Akrawi | $4,000 |
| Simonian Rugs | 11524159558 | Melissa Simonian | $3,500 |
| Vortex Insulation | 11524157708 | — | $3,500 |
| Good 4 The People | 11524157405 | Lee Wells Jr | — |
| CSG Custom Specialties | 11524262986 | Harold Hanshew | — |

**Note:** The board also had 6 pre-existing demo items (Acme Corp, Globex, etc.) in the default group. Consider deleting those.

---

## 3. Content Calendar / Social Media Planner (ID: 18389748986)

**Action:** Added 5 weekly groups and 7 content tracking columns. Existing groups (PodLab LV, ISW) and columns preserved.

### Groups Created
| Group | ID |
|-------|----|
| Week 1 (March 17-23) — Launch Week | group_mm1hzkb8 |
| Week 2 (March 24-30) — Lab Spotlight | group_mm1hxk6g |
| Week 3 (March 31 - April 6) — Client Proof | group_mm1hvdgv |
| Week 4 (April 7-13) — Value Series | group_mm1hzmzy |
| Week 5 (April 14-17) — Beaker Launch | group_mm1hyz32 |

### Columns Added
| Column | Type | ID |
|--------|------|----|
| Post Date | Date | date_mm1hb6e2 |
| Platform | Dropdown (LinkedIn, Instagram, YouTube, TikTok, Facebook) | dropdown_mm1hk1q3 |
| Content Type | Dropdown (Educational, Sales, BTS, Testimonial, Ad) | dropdown_mm1hdggp |
| Caption | Long Text | long_text_mm1hfyx7 |
| Video File | Text | text_mm1h7cgf |
| Content Status | Status | color_mm1hkkef |
| Link | Link | link_mm1h3e9b |

**Pre-existing columns kept:** Posting Schedule, Post Copy, Content Category, Lead, Image Design, Design Status, Edit URL, Edited Image, platform posting statuses.

---

## 4. Beaker Affiliates (ID: 18404208366) — NEW

**Action:** Created from scratch.

### Groups
| Group | ID |
|-------|----|
| Applied | group_mm1h4266 |
| Under Review | group_mm1h2bmq |
| Active Beakers | group_mm1h6kt2 |
| Inactive | group_mm1hn1tp |

### Columns
| Column | Type | ID |
|--------|------|----|
| Name | (default) | name |
| Email | Email | email_mm1haw5h |
| Beaker ID | Text | text_mm1hfxsw |
| Audience Size | Numbers | numeric_mm1h5n5h |
| Referrals Made | Numbers | numeric_mm1hywdd |
| Total Commission | Numbers | numeric_mm1hgjwh |
| Beaker Status | Status | color_mm1h7aa1 |
| Join Date | Date | date_mm1hjyar |

---

## 5. Email Campaigns (ID: 18404208415) — NEW

**Action:** Created from scratch with 3 Instantly campaign items.

### Groups
| Group | ID |
|-------|----|
| Active Campaigns | group_mm1h8zpc |
| Draft | group_mm1hr1a3 |
| Paused | group_mm1hm3ax |
| Completed | group_mm1hbjbw |

### Columns
| Column | Type | ID |
|--------|------|----|
| Campaign Name | (default) | name |
| Type | Dropdown (Cold Outreach, Beaker Recruitment, Podcast Guest) | dropdown_mm1hd0f3 |
| Leads Loaded | Numbers | numeric_mm1has7e |
| Emails Sent | Numbers | numeric_mm1hmrty |
| Open Rate % | Numbers | numeric_mm1hkf1f |
| Reply Rate % | Numbers | numeric_mm1hpdnk |
| Meetings Booked | Numbers | numeric_mm1hxazy |
| Campaign Status | Status | color_mm1hmv2j |

### Campaign Items (Draft group)
| Campaign | Item ID |
|----------|---------|
| Founder Bottleneck (30/day) | 11524191076 |
| Beaker Recruitment (20/day) | 11524191288 |
| How It Started Podcast (15/day) | 11524177500 |

---

## 6. Contacts Export

**File:** `MONDAY-CONTACTS.md` (same directory)

### Summary
- **Contacts board (18395895903):** 22 items — mostly test data (dummy "Alex" entries + TechVenture Labs test records). 3 real leads: Troy, Amna, and "email him to follow up" (needs cleanup).
- **Clients board (18400694446):** 11 items — 5 real clients (ISW, Simonian, Vortex, G4P, CSG) + 6 demo items (Acme Corp, Globex, etc.)
- **Total with email:** ~16 (mostly test/demo data)

### Cleanup Needed
1. **Delete test items** from Contacts board (the "+14155550147 - Alex" duplicates and "TechVenture Labs" test entries)
2. **Delete demo items** from Clients board (Acme Corp, Globex, Soylent, Initech, Umbrella, Stark Industries)
3. **Add real contact emails** to the 5 active client items (ISW, Simonian, Vortex, G4P, CSG)

---

## 7. Existing Boards (Not Modified)

These boards were left as-is:
- **Clients/Projects** (18249114820) — Has groups for ISW, Simonian, Vortex, PodLab
- **Deals** (18400694463) — Basic deals tracker
- **LinkedIn Podcast Outreach** (18399411700) — Outreach tracking
- Various sprint/project boards

---

## Next Steps

1. **Clean up demo/test data** — Delete dummy items from Contacts and Clients boards
2. **Add real emails** to the 5 active clients on the Clients board
3. **Populate Content Calendar** — Add actual content items to weekly groups
4. **Move existing pipeline items** — Any leads in old groups should be moved to the new pipeline stages
5. **Delete old empty groups** — The Sales Pipeline had 2 empty "Group Title" default groups
6. **Set up automations** — Consider Monday.com automations for:
   - Moving items between pipeline stages
   - Sending notifications on status changes
   - Auto-updating dates
7. **Connect Instantly** — Link Email Campaigns board to Instantly metrics (manual or via API)

---

## Board Quick Reference

| Board | ID | URL |
|-------|----|-----|
| Sales Pipeline | 18400694687 | https://podlablv.monday.com/boards/18400694687 |
| Clients | 18400694446 | https://podlablv.monday.com/boards/18400694446 |
| Content Calendar | 18389748986 | https://podlablv.monday.com/boards/18389748986 |
| Beaker Affiliates | 18404208366 | https://podlablv.monday.com/boards/18404208366 |
| Email Campaigns | 18404208415 | https://podlablv.monday.com/boards/18404208415 |
| Contacts | 18395895903 | https://podlablv.monday.com/boards/18395895903 |
| Clients/Projects | 18249114820 | https://podlablv.monday.com/boards/18249114820 |
