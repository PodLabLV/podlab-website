# PodLab Site — Deploy Readiness Report

**Generated:** 2026-03-16 23:23 PDT  
**Project:** podlab-site (Next.js 15.5.12)  
**Vercel Project:** `prj_isQTxApHnjfSxiQXkEoRnCuFTLN6` / `podlab-site`

---

## 1. Build Test ✅

`npm run build` — **PASSED** (exit code 0)

- Compiled successfully in 4.1s
- 35 static pages generated, 4 dynamic API routes
- No errors, no warnings
- First Load JS shared: 102 kB (healthy)
- Largest page: Homepage at 160 kB first load

---

## 2. Missing Assets ✅

All 39 image/video `src` references in the codebase were verified against `/public`. **Every file exists.**

No 404 risk from static asset references.

---

## 3. Environment Variables ✅

**Required variables (3):**
| Variable | Used In | `.env.local` |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | API routes, login page | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Login page | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes (assessment, affiliate, podcast) | ✅ Set |

**⚠️ Action needed:** Verify these are also set in **Vercel Environment Variables** for production. The `.env.local` only works locally.

**Bonus:** `.env.example` exists (untracked) — good practice.

---

## 4. Vercel Config ✅

- **`vercel.json`:** Does not exist (not required — Next.js defaults are fine)
- **`.vercel/project.json`:** ✅ Present and correct
  - `projectId`: `prj_isQTxApHnjfSxiQXkEoRnCuFTLN6`
  - `orgId`: `team_XhrXlij0vqDLRSpnlwEdm30B`
  - `projectName`: `podlab-site`

No issues.

---

## 5. Git Status ⚠️

**Branch:** `main`  
**Last 5 commits:**
```
00b878c feat: Premium login page with animations, password toggle, remember me, better UX
1069ad4 feat: Add client portal login page and navigation link
7dcc2dd Remove large original video files from repo (use compressed versions)
01559d4 Initial commit - PodLab website (Next.js 15)
```

**⚠️ 23 modified files + 20 untracked files/dirs are NOT committed.** This includes:

**Modified (key files):**
- `app/page.tsx`, `app/layout.tsx`, `app/services/page.tsx`, `app/about/page.tsx`
- `components/Navigation.tsx`
- `next.config.ts`, `package.json`, `package-lock.json`
- All blog pages, assessment pages, affiliate page, case-studies, contact, login

**Untracked (new features):**
- `app/api/` (assessment, affiliate, podcast API routes)
- `app/labs/` (individual lab pages)
- `app/how-it-started/apply/`, `app/affiliate/apply/`, `app/affiliate/contract/`, `app/affiliate/utm/`
- `app/sitemap.ts` (dynamic sitemap)
- `components/LabsSection.tsx`, `components/PodsSection.tsx`, `components/HomePageWrapper.tsx`, `components/animations.tsx`, `components/ui/`
- `public/blog/`, `public/brand/`, `public/case-studies/`, `public/labs/`, `public/review/`
- `public/videos/bridgett-tebow-testimonial.mp4`, `public/videos/kevin-testimonial.mp4`
- `CLAUDE.md`, `.env.example`

**⚡ This means the current deployed version on Vercel is very different from local.** A `git add . && git commit` + push is needed to deploy these changes.

---

## 6. Package.json ✅

**Dependencies (6):** All appropriate and needed.
| Package | Version | Purpose |
|---|---|---|
| `next` | ^15.1.6 | Framework |
| `react` / `react-dom` | ^19.0.0 | UI |
| `@supabase/supabase-js` | ^2.99.0 | Database/auth |
| `framer-motion` | ^12.34.3 | Animations |
| `lucide-react` | ^0.577.0 | Icons |

**DevDependencies (8):** Standard Next.js + TypeScript + Tailwind + ESLint toolchain. No bloat.

No missing dependencies detected (build passes clean).

---

## 7. Large Files ❌

**Total `/public/videos/` size: 530 MB** — this is a deployment problem.

| File | Size | Status |
|---|---|---|
| `austin-testimonial-original.mp4` | **226 MB** | ❌ Should be deleted (compressed version exists) |
| `client-montage-original.mp4` | **134 MB** | ❌ Should be deleted (compressed version exists) |
| `kevin-testimonial.mp4` | **92 MB** | ⚠️ Needs compression (too large for Vercel) |
| `podlab-logo-animation-optimized.gif` | **57 MB** | ⚠️ Very large GIF |
| `bridgett-tebow-testimonial.mp4` | **40 MB** | ⚠️ Borderline — consider compression |
| `podlab-logo-animation.gif` | **30 MB** | ⚠️ Duplicate of brand/ version |
| `podlab-logo-live-action.gif` | **30 MB** | ⚠️ Large GIF (MP4 version exists) |
| `brand/logo-animation.gif` | **30 MB** | ⚠️ Large GIF |
| `austin-testimonial.mp4` | **28 MB** | ⚠️ Acceptable but could be smaller |

**Recommendations:**
1. **Delete** `austin-testimonial-original.mp4` and `client-montage-original.mp4` (360 MB saved)
2. **Compress** `kevin-testimonial.mp4` to ~10-15 MB (ffmpeg: `-crf 28 -preset slow`)
3. **Consider** hosting videos on a CDN/external service instead of `/public`
4. **Vercel limit:** Serverless function + static assets have size limits. 530 MB of video is risky.

---

## 8. next.config.ts ✅

```typescript
images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] }
redirects: /bottleneck-assessment → /assessment (permanent)
           /bottleneck-assessment/start → /assessment/start (permanent)
```

- Wildcard remote image pattern is permissive but fine for a marketing site
- Redirects are correct (old assessment URLs → new)
- No issues

---

## 9. Favicon ✅

`app/favicon.ico` exists (3.6 KB). Correctly placed for Next.js App Router.

**Note:** There's also `public/favicon.png` — the `.ico` in `app/` takes precedence. No conflict.

---

## 10. robots.txt ✅

`public/robots.txt` exists with correct content:
```
User-agent: *
Allow: /
Sitemap: https://podlablv.com/sitemap.xml
```

**Note:** `public/sitemap.xml` was deleted (shows in git status as deleted), but `app/sitemap.ts` exists as an untracked file — this is the dynamic sitemap replacement. ✅ Good pattern, but **it won't work until committed and deployed.**

---

## Summary

| Check | Status | Notes |
|---|---|---|
| 1. Build | ✅ Pass | Clean build, no errors/warnings |
| 2. Assets | ✅ Pass | All 39 referenced files exist |
| 3. Env Vars | ✅ Local | Verify they're set in Vercel dashboard |
| 4. Vercel Config | ✅ Pass | Project linked correctly |
| 5. Git Status | ⚠️ Warning | **23 modified + 20 untracked files uncommitted** |
| 6. Dependencies | ✅ Pass | Clean, no bloat, no missing |
| 7. Large Files | ❌ Fail | **530 MB in /public/videos/** — originals need deletion, videos need compression |
| 8. Next Config | ✅ Pass | Redirects correct, no issues |
| 9. Favicon | ✅ Pass | favicon.ico in app/ |
| 10. robots.txt | ✅ Pass | Correct, sitemap referenced |

### 🚨 Blockers Before Deploy

1. **Delete original video files** (`-original.mp4`) — 360 MB of unnecessary weight
2. **Compress `kevin-testimonial.mp4`** (92 MB → target ~15 MB)
3. **Commit all changes** — 43 files are uncommitted; Vercel deploys from git
4. **Verify Vercel env vars** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 💡 Recommendations

- Host videos externally (Cloudflare R2, Bunny CDN, or even YouTube embeds) instead of `/public`
- Remove duplicate GIF files (keep MP4 versions, they're 95% smaller)
- Consider adding `next/image` optimization for the logo GIF animations
