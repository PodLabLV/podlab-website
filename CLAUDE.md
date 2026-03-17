# CLAUDE.md - PodLab Website (podlab-site)

**Project:** PodLab Marketing Website  
**Live URL:** https://podlablv.com  
**Repo:** https://github.com/PodLabLV/podlab-website  
**Context Scope:** Project-specific (overrides global when in this repo)

---

## Project Overview

Marketing website for PodLab's 5-Lab Growth System. Converts $1M-$8M founders from founder-dependent to systems-driven through strategic video assets.

**Purpose:**
- Lead generation (drive traffic to assessment)
- Education (explain 5-Lab system)
- Conversion (book Foundation calls)
- Brand positioning (professional, ROI-focused, founder-to-founder)

**Not a blog.** Not a content site. This is a conversion machine.

---

## Tech Stack

**Framework:** Next.js 15 (App Router)  
**Styling:** Tailwind CSS + custom CSS  
**Hosting:** Vercel (auto-deploy on push to main)  
**Language:** TypeScript  
**Package Manager:** npm (not pnpm for this project)

**Key Dependencies:**
- React 19
- Next.js 15
- Tailwind CSS 3
- TypeScript 5

**No database** (static site, all content is code)  
**No backend** (forms go to Calendly, assessment is separate)

---

## Project Structure

```
/podlab-site
├── app/                       # Next.js App Router pages
│   ├── page.tsx              # Homepage
│   ├── services/page.tsx     # 5 Labs detailed
│   ├── about/page.tsx        # Team, mission, story
│   ├── contact/page.tsx      # Contact + Calendly
│   ├── case-studies/page.tsx # Client results
│   ├── assessment/           # Lead magnet
│   ├── affiliate/page.tsx    # PodLab Beaker
│   ├── how-it-started/       # Podcast landing
│   ├── blog/                 # Blog posts (5 articles)
│   ├── layout.tsx            # Root layout (nav, footer)
│   └── globals.css           # Global styles
├── components/               # Reusable UI components
│   ├── Navigation.tsx        # Header nav
│   ├── ImageWithHover.tsx    # B&W → color hover effect
│   ├── StatsBar.tsx          # Stats section
│   ├── TestimonialQuotes.tsx # Testimonials
│   └── FadeIn.tsx            # Scroll animations
├── public/                   # Static assets
│   ├── /labs                 # Lab logos (B&W + color)
│   ├── /about                # Team photos (B&W + color)
│   ├── /studio               # Pod photos (B&W + color)
│   ├── /videos               # Testimonials, montages
│   └── /logos                # Client logos
├── .vercel/                  # Vercel deployment config
├── .next/                    # Build output (gitignored)
├── package.json              # Dependencies
├── next.config.ts            # Next.js config
├── tailwind.config.ts        # Tailwind config
└── tsconfig.json             # TypeScript config
```

**Important:** `public/videos/*-original.mp4` files are gitignored (too large). Use compressed versions only.

---

## Key Commands

**Development:**
```bash
npm run dev          # Start dev server (http://localhost:3000)
```

**Build & Deploy:**
```bash
npm run build        # Build for production (test before deploy)
npm start            # Run production build locally
vercel --prod        # Deploy to production (auto on git push)
```

**Other:**
```bash
npm run lint         # Check for TypeScript/linting errors
```

---

## Code Style (Project-Specific)

**TypeScript:**
- All components are TypeScript (`.tsx` files)
- Explicit types for props (no `any`)
- Use `interface` for component props

**Components:**
- Functional components only (no classes)
- Props destructured in function signature
- Export as default (not named exports)

**Example:**
```tsx
interface HeroProps {
  title: string;
  subtitle: string;
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <section>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}
```

**Styling:**
- Tailwind utility classes preferred
- Custom CSS only when necessary (in `globals.css`)
- Responsive: mobile-first (`sm:`, `md:`, `lg:`)
- Dark theme: black backgrounds (`bg-black`, `bg-[#1A1A1A]`)
- Neon green accent: `#39FF14`

**Images:**
- All images have B&W and color versions
- Hover effect: B&W → color on hover (see `ImageWithHover.tsx`)
- Use Next.js `<Image>` component (not `<img>`)
- Always provide `width` and `height`

---

## Design System

**Colors:**
- Black: `#000000`
- Dark gray: `#1A1A1A`
- Medium gray: `#2E2E2E`
- Neon green: `#39FF14`
- White: `#FFFFFF`

**Typography:**
- Headings: Bold, direct, no fluff
- Body: Clean, readable, ROI-focused
- No "startup speak" or hype language

**Imagery:**
- B&W → color hover effect (signature style)
- Professional studio photos
- Real team photos (not stock)
- Client logos (social proof)

**Layout:**
- Full-width hero sections
- Contained content (max-width containers)
- Clear CTAs (Calendly buttons, assessment links)
- Mobile responsive (always test mobile)

---

## Gotchas / What Claude Gets Wrong

1. **Video file sizes:** NEVER use `*-original.mp4` files. They're 134 MB+. Use compressed versions (28 MB, 9.8 MB).

2. **Image paths:** All images are in `/public`. Reference as `/path/to/image.png` (not `public/path`).

3. **Hover effects:** B&W → color is CSS-based (`filter: grayscale()`). Don't replace images manually.

4. **Navigation:** Header is sticky (`fixed top-0`). Don't forget z-index for overlays.

5. **Calendly embeds:** Use iframe, not Calendly's React component (Next.js SSR issues).

6. **Blog posts:** Individual pages, not dynamic routing. Each post is `app/blog/{slug}/page.tsx`.

7. **Assessment:** Assessment page is in this repo (`app/assessment/`), but the actual assessment tool is separate (HTML/JS in `/business-growth-system/founder-bottleneck-assessment/`).

8. **YouTube embeds:** Use iframe with `loading="lazy"` for performance.

9. **Vercel auto-deploy:** Every push to `main` triggers deploy. Test locally first.

10. **TypeScript strict mode:** Enabled. All props must be typed. No `any`.

---

## Off-Limits Files

**Never modify without asking:**
- `.vercel/` (Vercel deployment config, auto-generated)
- `package-lock.json` (npm lockfile, don't hand-edit)
- `.next/` (build output, auto-generated)

**Never commit:**
- `node_modules/` (gitignored)
- `.env` files (if we add them later)
- `.DS_Store` (Mac system files, gitignored)
- `*-original.mp4` (too large, gitignored)

---

## How to Find Info

**Architecture:**
- This file (CLAUDE.md)
- README.md (if it exists, we should create one)
- Markdown files in root (DEPLOYMENT-COMPLETE.md, SEO-COMPLETE.md, etc.)

**Components:**
- `/components` folder (Navigation, ImageWithHover, etc.)

**Pages:**
- `/app` folder (each page is a subfolder with `page.tsx`)

**Assets:**
- `/public` folder (images, videos, logos)

**Recent changes:**
- Git log (`git log --oneline`)
- Markdown update files (LATEST-UPDATES.md, etc.)

---

## Deployment Process

**Current setup:**
1. Code is in GitHub: https://github.com/PodLabLV/podlab-website
2. Vercel watches `main` branch
3. Push to `main` → auto-deploy to https://podlablv.com
4. Build time: ~30 seconds
5. No manual deployment needed (unless using `vercel --prod` CLI)

**If build fails:**
1. Check Vercel dashboard for error logs
2. Run `npm run build` locally to reproduce
3. Fix errors
4. Push fix to `main`
5. Vercel retries automatically

**Custom domains:**
- podlablv.com → main site (configured in Vercel)
- portal.podlablv.com → client portal (separate project)
- assessment.podlablv.com → could be future subdomain for assessment

---

## Content Strategy

**Pages:**
1. **Homepage:** Hero, problem, solution, 5-Lab system, social proof, CTA
2. **Services:** Deep dive on each Lab (AssetsLab → ExpansionLab)
3. **About:** Hiram's story, team, mission/vision/values
4. **Contact:** Calendly embed, portal login link
5. **Case Studies:** Client results (Simonian: $3.1M → $4.72M)
6. **Assessment:** Lead magnet (Founder Bottleneck Assessment)
7. **Affiliate:** PodLab Beaker referral program
8. **How It Started:** Podcast landing page
9. **Blog:** 5 articles (founder bottlenecks, duplication, etc.)

**Tone:**
- Direct, no fluff
- Founder-to-founder (not agency-to-client)
- ROI-focused, not hype-driven
- "Record once, sell forever" messaging

**CTAs:**
- Book Foundation Call (Calendly)
- Take Assessment (lead magnet)
- Watch How It Works (video)

---

## Testing Checklist

Before deploying changes:

- [ ] Run `npm run build` (no errors)
- [ ] Test on localhost:3000
- [ ] Check mobile view (responsive)
- [ ] Test all CTAs (links work, Calendly loads)
- [ ] Verify images load (no 404s)
- [ ] Check hover effects (B&W → color)
- [ ] Test video embeds (YouTube, local videos)
- [ ] Check console for errors (browser dev tools)
- [ ] Lighthouse score (aim for 90+ performance)

---

## Common Tasks

### Add a new page:
1. Create `/app/{page-name}/page.tsx`
2. Add to navigation in `/components/Navigation.tsx`
3. Test locally
4. Push to main

### Update team photos:
1. Add B&W and color versions to `/public/about/`
2. Update `/app/about/page.tsx`
3. Use `ImageWithHover` component for hover effect

### Add a blog post:
1. Create `/app/blog/{slug}/page.tsx`
2. Follow existing post structure
3. Add to blog index (`/app/blog/page.tsx`)
4. Test locally, push

### Change Calendly link:
1. Update all instances in codebase (`grep -r "calendly.com"`)
2. Common locations: Contact page, homepage CTA, footer
3. Test that new link works

---

## Integration Points

**External systems this site connects to:**
1. **Calendly** (booking widget) → iframes on Contact, homepage
2. **YouTube** (video embeds) → iframes for testimonials, demos
3. **Assessment tool** (separate) → link from homepage, nav
4. **Client portal** (separate) → link from Contact page
5. **Google Analytics** (future) → not yet implemented

**Future integrations planned:**
1. Email capture (Mailchimp or ConvertKit)
2. Assessment results → Supabase
3. Typeform → Monday.com webhooks
4. Stripe payment links (for direct purchases)

---

## Version History

**Feb 26, 2026:** Initial deployment
- All pages complete
- B&W → color hover effects
- Mobile responsive
- SEO optimized

**Mar 3, 2026:** GitHub repo created
- Code committed to https://github.com/PodLabLV/podlab-website
- Vercel auto-deploy configured
- Large video files removed from repo

---

## Next Steps (Planned)

1. Create README.md (installation, development, deployment)
2. Add email capture to assessment
3. Connect to Monday.com (lead tracking)
4. Set up Google Analytics
5. A/B test CTA placement
6. Create /testimonials page (separate from case studies)

---

**Last updated:** 2026-03-03  
**Maintained by:** Hiram + AI assistants (TipTop)  
**Questions?** Check this file first, then git history, then ask.
