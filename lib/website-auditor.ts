/**
 * Website Auditor — Server-side website analysis
 * Runs during assessment submission, stores results in raw_responses
 * Checks: SSL, meta tags, headings, CTAs, mobile, speed, social proof, analytics
 */

interface AuditResult {
  url: string
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  categories: {
    seo: CategoryResult
    conversion: CategoryResult
    performance: CategoryResult
    trust: CategoryResult
    technical: CategoryResult
  }
  recommendations: Recommendation[]
  rawChecks: Record<string, boolean | string | number | null>
  pageContent?: {
    title: string | null
    metaDescription: string | null
    h1: string | null
    ctaText: string | null
    body: string
  }
  auditedAt: string
  error?: string
}

interface CategoryResult {
  score: number
  maxScore: number
  label: string
  checks: CheckResult[]
}

interface CheckResult {
  name: string
  passed: boolean
  value: string | null
  impact: 'high' | 'medium' | 'low'
  recommendation?: string
}

interface Recommendation {
  priority: number
  category: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'quick' | 'moderate' | 'significant'
}

function normalizeUrl(input: string): string {
  let url = input.trim().toLowerCase()
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  // Remove trailing slash
  return url.replace(/\/+$/, '')
}

export async function auditWebsite(rawUrl: string): Promise<AuditResult> {
  const url = normalizeUrl(rawUrl)
  const auditedAt = new Date().toISOString()

  try {
    const startTime = Date.now()

    // Fetch the homepage
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PodLabBot/1.0 (Website Audit)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeout)
      // Try HTTP if HTTPS failed
      if (url.startsWith('https://')) {
        try {
          response = await fetch(url.replace('https://', 'http://'), {
            headers: {
              'User-Agent': 'PodLabBot/1.0 (Website Audit)',
              'Accept': 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
          })
        } catch {
          return {
            url,
            overallScore: 0,
            grade: 'F',
            categories: emptyCategories(),
            recommendations: [{
              priority: 1,
              category: 'technical',
              title: 'Website is unreachable',
              description: `We couldn't load ${url}. Make sure the URL is correct and the site is live.`,
              impact: 'high',
              effort: 'quick',
            }],
            rawChecks: {},
            auditedAt,
            error: `Could not reach ${url}`,
          }
        }
      } else {
        return {
          url,
          overallScore: 0,
          grade: 'F',
          categories: emptyCategories(),
          recommendations: [{
            priority: 1,
            category: 'technical',
            title: 'Website is unreachable',
            description: `We couldn't load ${url}. Make sure the URL is correct and the site is live.`,
            impact: 'high',
            effort: 'quick',
          }],
          rawChecks: {},
          auditedAt,
          error: `Could not reach ${url}`,
        }
      }
    } finally {
      clearTimeout(timeout)
    }

    const loadTimeMs = Date.now() - startTime
    const html = await response.text()
    const finalUrl = response.url
    const status = response.status
    const contentLength = html.length

    // Parse HTML for analysis
    const checks = analyzeHtml(html, finalUrl, url, loadTimeMs, status, contentLength)
    const categories = scoreCategories(checks)
    const overallScore = calculateOverallScore(categories)
    const grade = getGrade(overallScore)
    const recommendations = generateRecommendations(checks, categories)

    // Extract cleaned body text (truncated) so downstream LLM analysis has signal
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)

    return {
      url: finalUrl,
      overallScore,
      grade,
      categories,
      recommendations,
      rawChecks: checks,
      pageContent: {
        title: (checks.metaTitle as string | null) ?? null,
        metaDescription: (checks.metaDescription as string | null) ?? null,
        h1: (checks.h1Text as string | null) ?? null,
        ctaText: (checks.ctaText as string | null) ?? null,
        body: bodyText,
      },
      auditedAt,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      url,
      overallScore: 0,
      grade: 'F',
      categories: emptyCategories(),
      recommendations: [],
      rawChecks: {},
      auditedAt,
      error: message,
    }
  }
}

function analyzeHtml(
  html: string,
  finalUrl: string,
  originalUrl: string,
  loadTimeMs: number,
  status: number,
  contentLength: number
): Record<string, boolean | string | number | null> {
  const lower = html.toLowerCase()

  // === SEO Checks ===
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const metaTitle = titleMatch ? titleMatch[1].trim() : null
  const hasMetaTitle = !!metaTitle && metaTitle.length > 0 && metaTitle.length < 100

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)
  const metaDescription = descMatch ? descMatch[1].trim() : null
  const hasMetaDescription = !!metaDescription && metaDescription.length > 50

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const h1Text = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : null
  const hasH1 = !!h1Text && h1Text.length > 0

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length
  const hasMultipleH1 = h1Count > 1

  const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html)
  const hasRobotsMeta = /<meta[^>]*name=["']robots["']/i.test(html)
  const hasStructuredData = /application\/ld\+json/i.test(html) || /itemtype=/i.test(html)

  // === Conversion Checks ===
  const ctaPatterns = /book.*call|schedule|get started|contact us|free.*consult|let's talk|sign up|get.*quote|request.*demo|start.*free|try.*free/i
  const hasCta = ctaPatterns.test(html)

  const ctaButtonMatch = html.match(/<(?:a|button)[^>]*>([^<]*(?:book|schedule|get started|contact|free|consult|talk|sign up|quote|demo|start|try)[^<]*)<\/(?:a|button)>/i)
  const ctaText = ctaButtonMatch ? ctaButtonMatch[1].replace(/<[^>]+>/g, '').trim() : null

  const hasContactForm = /<form/i.test(html) || /typeform|calendly|hubspot.*form|contact.*form/i.test(html)
  const hasCalendly = /calendly/i.test(html)
  const hasPhoneNumber = /\(?[\d]{3}\)?[-.\s]?[\d]{3}[-.\s]?[\d]{4}/.test(html)
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(html.replace(/<script[\s\S]*?<\/script>/gi, ''))

  // === Trust Checks ===
  const hasSocialProof = /testimonial|review|client.*said|what.*client|case.*study|success.*stor/i.test(html)
  const hasTestimonialQuotes = /[""][^""]{20,}[""].*[—–-]/i.test(html) || /"[^"]{20,}".*—/i.test(html)
  const hasLogos = /client.*logo|as.*seen|trusted.*by|partner|featured/i.test(lower)
  const hasStarRating = /||star.*rating|review.*score/i.test(html)
  const hasCaseStudy = /case.*study|success.*story|client.*result|roi|growth.*result/i.test(lower)
  const hasGuarantee = /guarantee|money.*back|risk.*free|satisfaction/i.test(lower)

  // === Performance Checks ===
  const isUnder3Seconds = loadTimeMs < 3000
  const isUnder5Seconds = loadTimeMs < 5000
  const pageSizeKb = Math.round(contentLength / 1024)
  const isPageSizeOk = pageSizeKb < 3000 // Under 3MB

  const imageCount = (html.match(/<img[\s>]/gi) || []).length
  const hasLazyLoading = /loading=["']lazy["']/i.test(html)
  const hasMinifiedAssets = /\.min\.(js|css)/i.test(html)

  // === Technical Checks ===
  const isHttps = finalUrl.startsWith('https://')
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html)
  const hasFavicon = /<link[^>]*rel=["'](?:shortcut\s+)?icon["']/i.test(html) || /<link[^>]*rel=["']apple-touch-icon["']/i.test(html)
  const hasOgTags = /<meta[^>]*property=["']og:/i.test(html)
  const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html)
  const hasTwitterCard = /<meta[^>]*name=["']twitter:card["']/i.test(html)
  const hasAnalytics = /google.*analytics|gtag|ga\(|gtm\.js|google.*tag.*manager|facebook.*pixel|fbq|segment\.com|mixpanel|amplitude|plausible|fathom/i.test(html)
  const hasGoogleTagManager = /googletagmanager|gtm\.js/i.test(html)
  const statusOk = status >= 200 && status < 400

  // === Content Quality ===
  const wordCount = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2).length

  const hasAdequateContent = wordCount > 200
  const hasVideo = /<video|youtube|vimeo|wistia|loom/i.test(html)

  return {
    // SEO
    metaTitle,
    hasMetaTitle,
    metaTitleLength: metaTitle?.length || 0,
    metaDescription,
    hasMetaDescription,
    metaDescriptionLength: metaDescription?.length || 0,
    h1Text,
    hasH1,
    h1Count,
    hasMultipleH1,
    hasCanonical,
    hasRobotsMeta,
    hasStructuredData,
    // Conversion
    hasCta,
    ctaText,
    hasContactForm,
    hasCalendly,
    hasPhoneNumber,
    hasEmail,
    // Trust
    hasSocialProof,
    hasTestimonialQuotes,
    hasLogos,
    hasStarRating,
    hasCaseStudy,
    hasGuarantee,
    // Performance
    loadTimeMs,
    isUnder3Seconds,
    isUnder5Seconds,
    pageSizeKb,
    isPageSizeOk,
    imageCount,
    hasLazyLoading,
    hasMinifiedAssets,
    // Technical
    isHttps,
    hasViewport,
    hasFavicon,
    hasOgTags,
    hasOgImage,
    hasTwitterCard,
    hasAnalytics,
    hasGoogleTagManager,
    statusOk,
    status,
    finalUrl,
    // Content
    wordCount,
    hasAdequateContent,
    hasVideo,
  }
}

function scoreCategories(checks: Record<string, boolean | string | number | null>): AuditResult['categories'] {
  return {
    seo: {
      score: [
        checks.hasMetaTitle,
        checks.hasMetaDescription,
        checks.hasH1,
        !checks.hasMultipleH1,
        checks.hasCanonical,
        checks.hasStructuredData,
      ].filter(Boolean).length,
      maxScore: 6,
      label: 'SEO Foundations',
      checks: [
        { name: 'Meta Title', passed: !!checks.hasMetaTitle, value: checks.metaTitle as string | null, impact: 'high', recommendation: !checks.hasMetaTitle ? 'Add a compelling title tag (50-60 characters) that includes your main keyword and value proposition.' : undefined },
        { name: 'Meta Description', passed: !!checks.hasMetaDescription, value: checks.metaDescription as string | null, impact: 'high', recommendation: !checks.hasMetaDescription ? 'Write a meta description (120-160 characters) that sells the click. Include your key differentiator.' : undefined },
        { name: 'H1 Heading', passed: !!checks.hasH1, value: checks.h1Text as string | null, impact: 'high', recommendation: !checks.hasH1 ? 'Add a clear H1 heading that tells visitors exactly what you do and who you help.' : undefined },
        { name: 'Single H1', passed: !checks.hasMultipleH1, value: `${checks.h1Count} found`, impact: 'low', recommendation: checks.hasMultipleH1 ? 'Use only one H1 tag per page. Use H2-H6 for subheadings.' : undefined },
        { name: 'Canonical URL', passed: !!checks.hasCanonical, value: null, impact: 'medium', recommendation: !checks.hasCanonical ? 'Add a canonical URL tag to prevent duplicate content issues.' : undefined },
        { name: 'Structured Data', passed: !!checks.hasStructuredData, value: null, impact: 'medium', recommendation: !checks.hasStructuredData ? 'Add schema.org structured data (LocalBusiness or Organization) for rich search results.' : undefined },
      ],
    },
    conversion: {
      score: [
        checks.hasCta,
        checks.hasContactForm || checks.hasCalendly,
        checks.hasPhoneNumber || checks.hasEmail,
        checks.hasVideo,
        checks.hasAdequateContent,
      ].filter(Boolean).length,
      maxScore: 5,
      label: 'Conversion Power',
      checks: [
        { name: 'Clear CTA', passed: !!checks.hasCta, value: checks.ctaText as string | null, impact: 'high', recommendation: !checks.hasCta ? 'Add a clear call-to-action above the fold: "Book a Call", "Get Started", or "Schedule Consultation".' : undefined },
        { name: 'Contact/Booking Form', passed: !!(checks.hasContactForm || checks.hasCalendly), value: checks.hasCalendly ? 'Calendly detected' : null, impact: 'high', recommendation: !(checks.hasContactForm || checks.hasCalendly) ? 'Add a booking widget (Calendly) or contact form. Make it dead simple for prospects to reach you.' : undefined },
        { name: 'Contact Information', passed: !!(checks.hasPhoneNumber || checks.hasEmail), value: null, impact: 'medium', recommendation: !(checks.hasPhoneNumber || checks.hasEmail) ? 'Display your phone number and email visibly. Prospects need to trust they can reach a real person.' : undefined },
        { name: 'Video Content', passed: !!checks.hasVideo, value: null, impact: 'high', recommendation: !checks.hasVideo ? 'Add a video on your homepage — even a 60-second founder intro. Video builds trust faster than any copy.' : undefined },
        { name: 'Adequate Content', passed: !!checks.hasAdequateContent, value: `${checks.wordCount} words`, impact: 'medium', recommendation: !checks.hasAdequateContent ? 'Your page needs more content. Aim for 300+ words that speak directly to your ideal client\'s problem.' : undefined },
      ],
    },
    performance: {
      score: [
        checks.isUnder3Seconds,
        checks.isUnder5Seconds,
        checks.isPageSizeOk,
        checks.hasLazyLoading,
      ].filter(Boolean).length,
      maxScore: 4,
      label: 'Speed & Performance',
      checks: [
        { name: 'Fast Load (<3s)', passed: !!checks.isUnder3Seconds, value: `${checks.loadTimeMs}ms`, impact: 'high', recommendation: !checks.isUnder3Seconds ? `Your site took ${checks.loadTimeMs}ms to load. Aim for under 3 seconds. Compress images and minimize scripts.` : undefined },
        { name: 'Acceptable Load (<5s)', passed: !!checks.isUnder5Seconds, value: null, impact: 'medium' },
        { name: 'Page Size', passed: !!checks.isPageSizeOk, value: `${checks.pageSizeKb}KB`, impact: 'medium', recommendation: !checks.isPageSizeOk ? 'Your page is too large. Optimize images (use WebP), minify CSS/JS, and remove unused code.' : undefined },
        { name: 'Lazy Loading', passed: !!checks.hasLazyLoading, value: `${checks.imageCount} images`, impact: 'low', recommendation: !checks.hasLazyLoading && (checks.imageCount as number) > 3 ? 'Add lazy loading to images below the fold to improve initial load time.' : undefined },
      ],
    },
    trust: {
      score: [
        checks.hasSocialProof || checks.hasTestimonialQuotes,
        checks.hasLogos || checks.hasCaseStudy,
        checks.hasGuarantee,
        checks.hasStarRating,
      ].filter(Boolean).length,
      maxScore: 4,
      label: 'Trust & Social Proof',
      checks: [
        { name: 'Testimonials/Reviews', passed: !!(checks.hasSocialProof || checks.hasTestimonialQuotes), value: null, impact: 'high', recommendation: !(checks.hasSocialProof || checks.hasTestimonialQuotes) ? 'Add 3-5 client testimonials above the fold. Real quotes with names and companies convert best.' : undefined },
        { name: 'Client Logos/Case Studies', passed: !!(checks.hasLogos || checks.hasCaseStudy), value: null, impact: 'high', recommendation: !(checks.hasLogos || checks.hasCaseStudy) ? 'Add client logos or case studies. "Trusted by" sections build instant credibility.' : undefined },
        { name: 'Guarantee/Risk Reversal', passed: !!checks.hasGuarantee, value: null, impact: 'medium', recommendation: !checks.hasGuarantee ? 'Consider adding a guarantee or risk reversal. It removes the #1 barrier to buying.' : undefined },
        { name: 'Ratings/Reviews', passed: !!checks.hasStarRating, value: null, impact: 'low', recommendation: !checks.hasStarRating ? 'Display star ratings or review scores from Google, Clutch, or other platforms.' : undefined },
      ],
    },
    technical: {
      score: [
        checks.isHttps,
        checks.hasViewport,
        checks.hasFavicon,
        checks.hasOgTags,
        checks.hasAnalytics,
        checks.statusOk,
      ].filter(Boolean).length,
      maxScore: 6,
      label: 'Technical Health',
      checks: [
        { name: 'HTTPS/SSL', passed: !!checks.isHttps, value: null, impact: 'high', recommendation: !checks.isHttps ? 'Your site is not using HTTPS. This hurts trust AND Google rankings. Get an SSL certificate immediately.' : undefined },
        { name: 'Mobile Viewport', passed: !!checks.hasViewport, value: null, impact: 'high', recommendation: !checks.hasViewport ? 'Add a viewport meta tag. Without it, your site looks broken on mobile — where 60%+ of traffic comes from.' : undefined },
        { name: 'Favicon', passed: !!checks.hasFavicon, value: null, impact: 'low', recommendation: !checks.hasFavicon ? 'Add a favicon. It\'s a small detail that signals professionalism.' : undefined },
        { name: 'Open Graph Tags', passed: !!checks.hasOgTags, value: null, impact: 'medium', recommendation: !checks.hasOgTags ? 'Add Open Graph tags so your site looks professional when shared on LinkedIn, Facebook, and Twitter.' : undefined },
        { name: 'Analytics Tracking', passed: !!checks.hasAnalytics, value: null, impact: 'high', recommendation: !checks.hasAnalytics ? 'Install Google Analytics or Google Tag Manager. You can\'t improve what you don\'t measure.' : undefined },
        { name: 'Site Accessible', passed: !!checks.statusOk, value: `HTTP ${checks.status}`, impact: 'high' },
      ],
    },
  }
}

function calculateOverallScore(categories: AuditResult['categories']): number {
  // Weighted scoring
  const weights = { seo: 25, conversion: 30, performance: 15, trust: 20, technical: 10 }
  let totalWeighted = 0
  let totalWeight = 0

  for (const [key, cat] of Object.entries(categories)) {
    const weight = weights[key as keyof typeof weights] || 10
    const pct = cat.maxScore > 0 ? (cat.score / cat.maxScore) : 0
    totalWeighted += pct * weight
    totalWeight += weight
  }

  return Math.round((totalWeighted / totalWeight) * 100)
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function generateRecommendations(
  checks: Record<string, boolean | string | number | null>,
  categories: AuditResult['categories']
): Recommendation[] {
  const recs: Recommendation[] = []
  let priority = 1

  // High impact, quick wins first
  if (!checks.hasMetaTitle) {
    recs.push({ priority: priority++, category: 'SEO', title: 'Add a compelling title tag', description: 'Your page is missing a title tag — the #1 on-page SEO factor. Write 50-60 characters that include your main service and target audience.', impact: 'high', effort: 'quick' })
  }
  if (!checks.hasCta) {
    recs.push({ priority: priority++, category: 'Conversion', title: 'Add a clear call-to-action above the fold', description: 'Visitors don\'t know what to do next. Add a prominent button: "Book a Strategy Call", "Get Your Free Consultation", or "Start Your Project".', impact: 'high', effort: 'quick' })
  }
  if (!checks.isHttps) {
    recs.push({ priority: priority++, category: 'Technical', title: 'Enable HTTPS/SSL', description: 'Your site isn\'t secure. Google penalizes non-HTTPS sites and browsers show "Not Secure" warnings. This directly hurts trust and conversions.', impact: 'high', effort: 'quick' })
  }
  if (!checks.hasSocialProof && !checks.hasTestimonialQuotes) {
    recs.push({ priority: priority++, category: 'Trust', title: 'Add client testimonials', description: 'No social proof found. Add 3-5 real client testimonials with names, companies, and specific results. This is the #1 trust builder for service businesses.', impact: 'high', effort: 'quick' })
  }
  if (!checks.hasAnalytics) {
    recs.push({ priority: priority++, category: 'Technical', title: 'Install analytics tracking', description: 'You have no analytics. Install Google Tag Manager (free) to track visitors, conversions, and marketing ROI. You can\'t improve what you don\'t measure.', impact: 'high', effort: 'quick' })
  }
  if (!checks.hasVideo) {
    recs.push({ priority: priority++, category: 'Conversion', title: 'Add a founder intro video', description: 'No video content found. A 60-90 second video of you explaining what you do and who you help builds more trust than 1,000 words of copy.', impact: 'high', effort: 'moderate' })
  }
  if (!checks.hasMetaDescription) {
    recs.push({ priority: priority++, category: 'SEO', title: 'Write a meta description', description: 'Your page has no meta description. This is what shows up in Google search results. Write 120-160 characters that sell the click.', impact: 'medium', effort: 'quick' })
  }
  if (!checks.hasH1) {
    recs.push({ priority: priority++, category: 'SEO', title: 'Add a clear H1 heading', description: 'No H1 heading found. Your H1 should clearly state what you do: "We help [audience] achieve [outcome]."', impact: 'medium', effort: 'quick' })
  }
  if (!(checks.hasContactForm || checks.hasCalendly)) {
    recs.push({ priority: priority++, category: 'Conversion', title: 'Add a booking or contact form', description: 'No easy way for prospects to take action. Embed a Calendly widget or contact form. Make booking a call as easy as 2 clicks.', impact: 'high', effort: 'moderate' })
  }
  if (!checks.hasOgTags) {
    recs.push({ priority: priority++, category: 'Technical', title: 'Add Open Graph tags', description: 'When someone shares your site on LinkedIn or social media, it looks generic. Add OG tags with your title, description, and a professional image.', impact: 'medium', effort: 'quick' })
  }
  if (!checks.hasViewport) {
    recs.push({ priority: priority++, category: 'Technical', title: 'Add mobile viewport tag', description: 'Your site may not display correctly on mobile devices. Over 60% of web traffic is mobile — this is critical.', impact: 'high', effort: 'quick' })
  }
  if (!checks.isUnder3Seconds) {
    recs.push({ priority: priority++, category: 'Performance', title: 'Improve page load speed', description: `Your site loaded in ${checks.loadTimeMs}ms. Aim for under 3 seconds. Compress images, use a CDN, and minimize JavaScript.`, impact: 'medium', effort: 'moderate' })
  }
  if (!(checks.hasLogos || checks.hasCaseStudy)) {
    recs.push({ priority: priority++, category: 'Trust', title: 'Add client logos or case studies', description: 'Add a "Trusted By" section with client logos, or write 1-2 detailed case studies showing real results. Numbers convert.', impact: 'medium', effort: 'moderate' })
  }

  return recs.slice(0, 10) // Top 10 recommendations
}

function emptyCategories(): AuditResult['categories'] {
  const emptyChecks: CheckResult[] = []
  return {
    seo: { score: 0, maxScore: 6, label: 'SEO Foundations', checks: emptyChecks },
    conversion: { score: 0, maxScore: 5, label: 'Conversion Power', checks: emptyChecks },
    performance: { score: 0, maxScore: 4, label: 'Speed & Performance', checks: emptyChecks },
    trust: { score: 0, maxScore: 4, label: 'Trust & Social Proof', checks: emptyChecks },
    technical: { score: 0, maxScore: 6, label: 'Technical Health', checks: emptyChecks },
  }
}
