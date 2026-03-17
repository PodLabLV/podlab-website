# Visual Features Merge Summary

**Date:** 2026-03-11  
**Developer:** Frankie Vega, Frontend Developer @ PodLab LV  
**Task:** Merge specific visual features from baseline repo into live site

---

## Files Created (5)

1. **`components/HomePageWrapper.tsx`**  
   - Client component wrapper for Unicorn Studio background animation
   - Uses dynamic import to load UnicornBackground with SSR disabled
   - Wraps homepage content with fixed background layer and relative content layer

2. **`components/PodsSection.tsx`**  
   - Client component for all pod/studio cards
   - Wraps each card in TiltCard with 10° tilt, glare, and gyroscope enabled
   - Added green glow hover effects (#2ADD1B/5 overlay)
   - Added green border glow on hover (#2ADD1B/50)
   - Maintains all existing copy, images, and structure
   - Includes Big Boss featured pod + grid of 5 other pods

3. **`components/LabsSection.tsx`**  
   - Client component for all 5 Labs cards
   - Wraps each lab in TiltCard with 12° tilt, glare, and gyroscope enabled
   - Added lucide-react icons (MessageSquare, Palette, Globe, Video, TrendingUp)
   - Green glow overlay on hover (#2ADD1B/5)
   - Icon container with green border that glows on hover
   - Maintains all existing copy and structure

4. **`/tmp/replace_sections.mjs`**  
   - Utility script used to replace sections in page.tsx
   - Replaced lines 215-307 (Pods section) with `<PodsSection />`
   - Replaced lines 520-627 (Labs section) with `<LabsSection />`

5. **`MERGE_SUMMARY.md`** (this file)  
   - Documentation of all changes made

---

## Files Modified (4)

1. **`app/layout.tsx`**  
   - Added Michroma font import from next/font/google
   - Added Inter font import with CSS variable `--font-inter`
   - Added Michroma font with CSS variable `--font-michroma`
   - Updated body className to include both font variables

2. **`app/globals.css`**  
   - Updated `--font-display` from 'Inter Tight' to 'Michroma'
   - Updated `--accent-green` from `#39FF14` to `#2ADD1B` (brand-compliant green)
   - Fixed border-glow hover color from old green to new green
   - Added Michroma typography rules for all headings (h1-h6, .font-display)
   - Added green glow effects (.glow-green, .text-glow-green, .border-glow-green)

3. **`app/page.tsx`**  
   - Added imports for HomePageWrapper, PodsSection, LabsSection
   - Wrapped entire page in `<HomePageWrapper>` for Unicorn Background
   - Replaced entire Pods section (93 lines) with `<PodsSection />`
   - Replaced entire Labs section (108 lines) with `<LabsSection />`
   - Removed unused data arrays (labs, stats, pods) from bottom of file
   - Reduced file from 838 lines to ~566 lines

4. **`app/blog/page.tsx`**  
   - Added `font-display` class to main heading (Michroma typography)
   - Added `font-display` class to blog post titles (Michroma typography)
   - Enhanced card hover: added green shadow, translate-y animation
   - Improved date styling: uppercase, tracking-wider, font-semibold

---

## Brand Colors Applied

All components now use the correct brand colors:

- **Primary Green:** `#2ADD1B` (was `#39FF14`)
- **Mint/Accent:** `#85FF78`
- **Background:** `#0A0A0A`
- **Cards:** `#1A1A1A`
- **Borders:** `#2E2E2E`

---

## Visual Effects Added

### 1. Unicorn Studio Background
- Full-screen animated background on homepage
- Fixed position, z-index 0, pointer-events-none
- Project ID: `GUfyMQB5CKHPivFz7drf`
- Only loads client-side (SSR disabled)

### 2. Michroma Typography
- All headings (h1-h6) now use Michroma font
- Uppercase transformation applied
- Matches baseline visual style

### 3. TiltCard Effects
- **Pods:** 10° tilt, glare enabled, gyroscope enabled
- **Labs:** 12° tilt, glare enabled, gyroscope enabled
- 3D perspective with smooth spring animations
- Glare follows mouse position
- Scales slightly on hover (1.02x)

### 4. Green Glow Effects
- Hover overlays: `bg-[#2ADD1B]/5`
- Border glow: `border-[#2ADD1B]/50`
- Shadow glow: `shadow-[0_12px_40px_rgba(42,221,27,0.2)]`
- Text glow: `text-shadow: 0 0 20px rgba(42,221,27,0.5)`

---

## What Was Preserved

✅ ALL existing copy and messaging  
✅ ALL existing page routes  
✅ ALL existing components (Navigation, FadeIn, ImageWithHover, CounterNumber)  
✅ ALL existing sections (Hero, Problem, Solution, Client Logos, Testimonials, etc.)  
✅ ALL existing images and assets  
✅ ImageWithHover B&W to color toggle functionality

---

## Build Status

✅ **Build Successful**  
```
✓ Compiled successfully in 1.6s
✓ Linting and checking validity of types
✓ Generating static pages (21/21)
```

No errors, no warnings.

---

## Testing Checklist

- [x] Homepage loads with Unicorn Background
- [x] All headings use Michroma font
- [x] Pods cards have TiltCard effect
- [x] Labs cards have TiltCard effect
- [x] Green glow effects work on hover
- [x] B&W to color image transition works
- [x] Blog page uses Michroma fonts
- [x] Build completes without errors
- [x] All existing routes still work

---

## Dependencies Used

All dependencies were already installed:

- `next` - Next.js framework
- `next/font/google` - Google Fonts integration
- `framer-motion` - TiltCard animations
- `lucide-react` - Icons for Labs section
- `react` / `react-dom` - Core React

No new packages needed to be installed.

---

## Notes

1. The Unicorn Background iframe loads from `unicorn.studio` with project ID `GUfyMQB5CKHPivFz7drf`
2. TiltCard supports both mouse-based and gyroscope-based tilt (mobile devices)
3. All green colors now use the brand-compliant `#2ADD1B` instead of `#39FF14`
4. The `ImageWithHover` component already handled B&W to color transitions perfectly
5. Data arrays (labs, pods, stats) are now in component files, not page.tsx

---

**Merge completed successfully.**  
**No breaking changes. All existing functionality preserved.**
