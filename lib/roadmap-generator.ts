/**
 * Auto-generates a personalized 90-Day Growth Sprint roadmap
 * based on assessment scores and bottleneck areas.
 */

interface RoadmapInput {
  firstName: string
  lastName: string
  company: string
  totalScore: number
  zone: string
  categoryScores: Record<string, number>
  primaryBottleneck: string
  secondaryBottleneck: string
  tertiaryBottleneck: string
}

// Map bottleneck categories to recommended labs
const BOTTLENECK_TO_LAB: Record<string, string> = {
  'Founder Dependency': 'AssetsLab',
  'Brand & Perception': 'BrandLab',
  'Marketing Systems': 'ExpansionLab',
  'Sales Infrastructure': 'VideoSalesLab',
  'Strategic Clarity': 'AssetsLab',
}

// Phase templates per lab
const PHASE_TEMPLATES: Record<string, {
  name: string
  focus: string
  actions: { week: string; title: string; description: string; outcome: string }[]
}> = {
  AssetsLab: {
    name: 'Foundation & Clarity',
    focus: 'Extract your expertise, define your ICP, and build the content foundation everything else runs on',
    actions: [
      {
        week: 'Week 1',
        title: 'Founder DNA Extraction',
        description: 'Deep-dive session to capture your methodology, origin story, unique value, and the transformation you deliver.',
        outcome: 'Complete Founder DNA document — your source of truth for all marketing and sales',
      },
      {
        week: 'Week 1-2',
        title: 'ICP Deep Dive',
        description: 'Define exactly who your ideal client is — demographics, psychographics, pain points, language, and where they spend time.',
        outcome: 'Crystal clear targeting — every piece of content speaks to the right person',
      },
      {
        week: 'Week 2-3',
        title: 'Hook Bank Creation',
        description: 'Build 50+ hooks for social media, emails, and ads based on your DNA and ICP research.',
        outcome: 'Never stare at a blank page again — pull from your hook bank every week',
      },
      {
        week: 'Week 3-4',
        title: 'Content Roadmap',
        description: 'Map 90 days of content to your funnel — awareness, consideration, decision — with topics, formats, and platforms assigned.',
        outcome: 'Predictable content engine that builds authority and drives action',
      },
    ],
  },
  BrandLab: {
    name: 'Brand Authority Build',
    focus: 'Build a visual identity and brand presence that commands premium pricing',
    actions: [
      {
        week: 'Week 1',
        title: 'Brand Strategy Workshop',
        description: 'Define your brand personality, voice, visual direction, and competitive positioning.',
        outcome: 'Brand strategy document that guides every visual and verbal decision',
      },
      {
        week: 'Week 2-3',
        title: 'Visual Identity System',
        description: 'Create logo, color palette, typography, and photography style that communicates credibility.',
        outcome: 'Professional brand that commands respect and builds instant trust',
      },
      {
        week: 'Week 3',
        title: 'Social Media Templates',
        description: 'Design branded templates for posts, stories, and carousels your team can use without a designer.',
        outcome: 'Consistent brand presence across all platforms',
      },
      {
        week: 'Week 4',
        title: 'Brand Guidelines Document',
        description: 'Compile everything into a comprehensive guide anyone on your team can follow.',
        outcome: 'Brand consistency at scale — every touchpoint reinforces your authority',
      },
    ],
  },
  VideoSalesLab: {
    name: 'Duplication & Scale',
    focus: 'Turn your expertise into video assets that sell, educate, and build trust 24/7',
    actions: [
      {
        week: 'Week 1',
        title: 'Script Development',
        description: 'Write scripts for 5 core videos: Founder Story, Service Explainer, FAQ Answers, Testimonial Framework, and Case Study.',
        outcome: 'Professional scripts that convert — not random talking head videos',
      },
      {
        week: 'Week 2',
        title: 'Production Day',
        description: 'Full studio shoot day — all 5 videos filmed with professional lighting, audio, and direction.',
        outcome: 'Premium video content that positions you as the authority in your space',
      },
      {
        week: 'Week 2-3',
        title: 'Post-Production & Editing',
        description: 'Professional editing with branded graphics, captions, thumbnails, and platform-optimized cuts.',
        outcome: 'Polished videos ready for website, social, ads, and email campaigns',
      },
      {
        week: 'Week 4',
        title: 'Distribution Strategy',
        description: 'Deploy videos across your website, social platforms, email sequences, and ad campaigns with tracking.',
        outcome: 'Your expertise working 24/7 — educating, building trust, and converting while you focus on delivery',
      },
    ],
  },
  SiteLab: {
    name: 'Digital Conversion Engine',
    focus: 'Build a website that converts visitors into booked calls and paying clients',
    actions: [
      {
        week: 'Week 1',
        title: 'Site Strategy & Architecture',
        description: 'Map your conversion funnel, page structure, and messaging hierarchy based on your ICP.',
        outcome: 'Website blueprint designed around how your buyers actually decide',
      },
      {
        week: 'Week 2',
        title: 'Copy & Content Creation',
        description: 'Write conversion-focused copy for every page — homepage, services, about, case studies.',
        outcome: 'Every word on your site moves prospects closer to booking a call',
      },
      {
        week: 'Week 3',
        title: 'Design & Development',
        description: 'Build a fast, mobile-first site with your brand identity, social proof, and clear CTAs.',
        outcome: 'Professional site that loads fast and converts — not just looks nice',
      },
      {
        week: 'Week 4',
        title: 'Launch & Analytics Setup',
        description: 'Deploy live, connect analytics, set up conversion tracking, and create your optimization dashboard.',
        outcome: 'Data-driven decisions from day one — know exactly what\'s working',
      },
    ],
  },
  ExpansionLab: {
    name: 'Growth & Systemization',
    focus: 'Automate what\'s working, measure results, and build for the next level',
    actions: [
      {
        week: 'Week 1',
        title: 'Marketing Audit & KPI Setup',
        description: 'Audit your current marketing efforts. Identify what\'s working and establish key performance indicators.',
        outcome: 'Data-driven decisions replacing gut decisions',
      },
      {
        week: 'Week 2',
        title: 'Content Calendar & Campaign Launch',
        description: 'Build a 30-day content calendar and launch your first systematic campaign.',
        outcome: 'Consistent, strategic marketing presence that builds momentum',
      },
      {
        week: 'Week 3',
        title: 'Paid Ads Strategy',
        description: 'Set up or optimize paid campaigns — targeting, creative, budget allocation, and tracking.',
        outcome: 'Predictable lead generation with clear cost-per-lead metrics',
      },
      {
        week: 'Week 4',
        title: 'Monthly Review & Optimization',
        description: 'Analyze results, optimize what\'s working, cut what isn\'t, and plan the next 30 days.',
        outcome: 'Continuous improvement cycle — every month better than the last',
      },
    ],
  },
}

// Quick wins based on bottleneck areas
const QUICK_WINS_MAP: Record<string, { title: string; timeframe: string; description: string }[]> = {
  'Founder Dependency': [
    { title: 'Record your next sales call', timeframe: 'Day 1', description: 'Hit record on your next prospect call. This is your sales DNA — the raw material for duplicating yourself.' },
    { title: 'Write your "Only I Can Do This" list', timeframe: 'Day 2', description: 'List every task only you can do. Circle the ones that could be documented and delegated. Start with the easiest one.' },
    { title: 'Create a 2-minute Loom answering your #1 FAQ', timeframe: 'Week 1', description: 'Film yourself answering the question prospects ask most. Send it to the next 3 people who ask. You just saved 30 minutes.' },
  ],
  'Brand & Perception': [
    { title: 'Screenshot test your website', timeframe: 'Day 1', description: 'Open your site next to your top competitor\'s. Which one would you trust with a $10K deal? Be honest.' },
    { title: 'Collect 3 client testimonials', timeframe: 'Day 2', description: 'Text your 3 happiest clients: "What result did we help you get?" Their words become your marketing copy.' },
    { title: 'Update your LinkedIn headline', timeframe: 'Week 1', description: 'Rewrite it to: Who you help + What outcome you deliver. Not your job title — your value proposition.' },
  ],
  'Marketing Systems': [
    { title: 'Track your last 10 clients\' source', timeframe: 'Day 1', description: 'Write down where your last 10 paying clients came from. Referral? LinkedIn? Website? This shows you where to double down.' },
    { title: 'Post your hottest take on LinkedIn', timeframe: 'Day 2', description: 'Share one contrarian opinion about your industry. Not controversial for clicks — genuinely what you believe that others get wrong.' },
    { title: 'Set up a simple lead tracker', timeframe: 'Week 1', description: 'Spreadsheet or CRM — track every inbound lead: name, source, status, next action. Can\'t improve what you don\'t measure.' },
  ],
  'Sales Infrastructure': [
    { title: 'Record a 90-second "Why Us" video', timeframe: 'Day 1', description: 'Phone camera, natural light, straight answer: Why should someone hire you over the next option? Post it to LinkedIn.' },
    { title: 'Write your top 5 objections + responses', timeframe: 'Day 2', description: 'List the 5 things prospects say before saying no. Write your best response to each. This becomes your objection-handling playbook.' },
    { title: 'Create a one-page case study', timeframe: 'Week 1', description: 'Pick your best client result. Write: Problem → What you did → Result. One page. Use it in every proposal.' },
  ],
  'Strategic Clarity': [
    { title: 'Write your ICP in 2 sentences', timeframe: 'Day 1', description: 'Who exactly do you serve? What specific problem do you solve? If you can\'t say it in 2 sentences, your marketing can\'t say it either.' },
    { title: 'Name your methodology', timeframe: 'Day 2', description: 'Give your process a name. A named process is a productized service. Productized services command premium prices.' },
    { title: 'Define your 3 non-negotiable outcomes', timeframe: 'Week 1', description: 'What 3 things does every client get? Not features — outcomes. This becomes your guarantee and your sales pitch.' },
  ],
}

export function generateRoadmap(input: RoadmapInput) {
  const { firstName, lastName, company, totalScore, categoryScores, primaryBottleneck, secondaryBottleneck, tertiaryBottleneck } = input

  // Determine lab sequence (3 phases, based on top 3 bottlenecks)
  const bottlenecks = [primaryBottleneck, secondaryBottleneck, tertiaryBottleneck]
  const labSequenceRaw = bottlenecks.map(b => BOTTLENECK_TO_LAB[b] || 'AssetsLab')

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const labSequence: string[] = []
  for (const lab of labSequenceRaw) {
    if (!seen.has(lab)) {
      seen.add(lab)
      labSequence.push(lab)
    }
  }

  // If fewer than 3, fill with remaining labs based on score
  const allLabs = ['AssetsLab', 'BrandLab', 'VideoSalesLab', 'SiteLab', 'ExpansionLab']
  for (const lab of allLabs) {
    if (labSequence.length >= 3) break
    if (!seen.has(lab)) {
      labSequence.push(lab)
      seen.add(lab)
    }
  }

  // Build phases
  const durations = ['Days 1–30', 'Days 31–60', 'Days 61–90']
  const phases = labSequence.slice(0, 3).map((lab, i) => {
    const template = PHASE_TEMPLATES[lab] || PHASE_TEMPLATES['AssetsLab']
    return {
      phase: i + 1,
      lab,
      name: template.name,
      focus: template.focus,
      duration: durations[i],
      actions: template.actions,
    }
  })

  // Build quick wins from primary + secondary bottleneck
  const quickWinSources = [primaryBottleneck, secondaryBottleneck].filter(Boolean)
  const quickWins: { title: string; timeframe: string; description: string }[] = []
  for (const src of quickWinSources) {
    const wins = QUICK_WINS_MAP[src] || []
    for (const w of wins) {
      if (quickWins.length < 3) quickWins.push(w)
    }
  }

  // Estimate ROI multiple based on score
  let roiMultiple = 3.0
  if (totalScore < 40) roiMultiple = 5.0 // More room for improvement
  else if (totalScore < 60) roiMultiple = 4.0
  else if (totalScore < 75) roiMultiple = 3.0
  else roiMultiple = 2.5

  const companyName = company || `${firstName} ${lastName}`
  const roadmapName = `${companyName} — 90-Day Growth Sprint`

  return {
    roadmap_name: roadmapName,
    lab_sequence: labSequence.slice(0, 3),
    phases,
    quick_wins: quickWins,
    roi_multiple: roiMultiple,
    total_duration_days: 90,
    status: 'approved',
  }
}
