# Glassy Black Container Site-Wide Rollout

**Date:** 2026-02-26 18:49 PST  
**Status:** IN PROGRESS

---

## Container Style

**Standard Glassy Black Container:**
```jsx
<div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-border/30">
  {/* Content */}
</div>
```

**Key Properties:**
- bg-black/70 (70% opacity black)
- backdrop-blur-sm (frosted glass effect)
- rounded-2xl (rounded corners)
- p-8 md:p-12 (responsive padding)
- border border-border/30 (subtle border)

---

## Pages to Update

### Homepage (`/app/page.tsx`)
- [x] Problem Section (already done - reference implementation)
- [x] Solution Section (done)
- [ ] Additional text-heavy sections (if any)

### Services Page (`/app/services/page.tsx`)
- [ ] Lab detail sections
- [ ] Process descriptions
- [ ] Text-heavy content areas

### About Page (`/app/about/page.tsx`)
- [ ] Team bios
- [ ] Company story
- [ ] Values section

### Case Studies Page (`/app/case-studies/page.tsx`)
- [ ] Case study narratives
- [ ] Results descriptions

### Contact Page (`/app/contact/page.tsx`)
- [ ] FAQ answers
- [ ] Text descriptions

### Blog Pages
- [ ] Blog post content
- [ ] Individual articles

### Assessment Pages
- [ ] VSL landing page
- [ ] Quiz pages

---

## Progress Log

### Homepage ✅
**Problem Section (Line ~81):**
- ✅ Added glassy container around body text
- ✅ Title stays outside (prominent)
- ✅ B&W → Color hover effect on background

**Solution Section (Line ~134):**
- ✅ Wrapped prose content in glassy container
- ✅ Maintained inner card styling with reduced opacity (bg-tertiary/50)
- ✅ Closed container properly

### Services Page ✅
**Labs Detail Section (Line ~153):**
- ✅ Wrapped each Lab's left-side content in glassy container
- ✅ Title, tagline, description, deliverables, outcome, pricing all inside
- ✅ Reduced inner deliverables card opacity (bg-tertiary/50, border/20)
- ✅ Applied to all labs via .map()

### About Page ✅
**Founder Story Section (Line ~63):**
- ✅ Wrapped entire "The Bottleneck That Built PodLab" story in glassy container
- ✅ All subsections: Problem, Breaking Point, Search, Solution, Mission
- ✅ Reduced inner results card opacity (bg-tertiary/50, border accent/30)
- ✅ CTA stays outside container

### Contact Page ✅
**FAQ Section (Line ~164):**
- ✅ Wrapped FAQ Q&A content in glassy container
- ✅ All FAQ items inside
- ✅ Maintains hover effects on individual questions

---

## Next Steps
1. [ ] Case Studies page (story sections)
2. [ ] Blog pages (article content)
3. [ ] Assessment pages (content blocks)
4. [ ] Podcast page (if text-heavy sections exist)
5. [ ] Affiliate page (if text-heavy sections exist)

---

## Notes
- Cards/boxes that are already styled (like Labs cards, stat cards) may not need the glassy treatment - they have their own design
- Focus on sections with paragraph text, body copy, descriptions
- Preserve existing hover effects and animations
- Test each section after applying
