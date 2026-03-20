'use client';

import { useState } from 'react';
import Navigation from "@/components/Navigation";

// ============================================
// FOUNDER BOTTLENECK ASSESSMENT v2
// Scoring: 5 = best (systems running) → 1 = worst (founder-dependent)
// Total: 20–100 | Per category: 4–20
// ============================================

interface QuestionOption {
  text: string;
  points: number;
}

interface Question {
  id: number;
  category: string;
  text: string;
  subtext: string;
  options: QuestionOption[];
}

const questions: Question[] = [
  // CATEGORY 1: FOUNDER DEPENDENCY (Q1-4)
  {
    id: 1,
    category: 'Founder Dependency',
    text: 'How many hours per week do you personally spend on sales activities?',
    subtext: 'Calls, proposals, follow-ups, closing — anything sales-related.',
    options: [
      { text: 'Less than 5 hours — my team handles it', points: 5 },
      { text: '5–10 hours — I\'m involved but not driving every deal', points: 4 },
      { text: '10–20 hours — I\'m in most deals', points: 2 },
      { text: '20+ hours — nothing moves without me', points: 1 }
    ]
  },
  {
    id: 2,
    category: 'Founder Dependency',
    text: 'What percentage of deals close WITHOUT your direct involvement?',
    subtext: 'Be honest — not what you want it to be, what it actually is.',
    options: [
      { text: '75–100% close without me', points: 5 },
      { text: '50–74% close without me', points: 4 },
      { text: '25–49% close without me', points: 2 },
      { text: 'Less than 25% — I\'m the closer', points: 1 }
    ]
  },
  {
    id: 3,
    category: 'Founder Dependency',
    text: 'If you disappeared for 2 weeks — no calls, no emails, nothing — what happens to sales?',
    subtext: 'The vacation test. Most founders already know the answer.',
    options: [
      { text: 'Business runs normally', points: 5 },
      { text: 'Slows down but doesn\'t stop', points: 3 },
      { text: 'Freezes — pipeline goes cold', points: 2 },
      { text: 'We\'d lose active deals', points: 1 }
    ]
  },
  {
    id: 4,
    category: 'Founder Dependency',
    text: '"Why should I hire you over your competitor?" — can your team answer that without you?',
    subtext: 'Not a rehearsed pitch. A real, convincing answer.',
    options: [
      { text: 'Yes — everyone delivers it consistently', points: 5 },
      { text: 'Mostly — with minor variations', points: 3 },
      { text: 'Inconsistent — depends who they talk to', points: 2 },
      { text: 'Only I can articulate it well', points: 1 }
    ]
  },

  // CATEGORY 2: BRAND & PERCEPTION (Q5-8)
  {
    id: 5,
    category: 'Brand & Perception',
    text: 'When was the last time you invested in professional brand development?',
    subtext: 'Logo, visual identity, brand guidelines — not a quick Canva job.',
    options: [
      { text: 'Within the last 12 months', points: 5 },
      { text: '1–2 years ago', points: 4 },
      { text: '3–5 years ago', points: 2 },
      { text: '5+ years ago or never', points: 1 }
    ]
  },
  {
    id: 6,
    category: 'Brand & Perception',
    text: 'Do prospects ever mention a competitor looking "more professional" than you?',
    subtext: 'Their website, their videos, their overall presence.',
    options: [
      { text: 'Never — we\'re the premium option', points: 5 },
      { text: 'Rarely — maybe once a quarter', points: 4 },
      { text: 'Sometimes — comes up a few times a quarter', points: 2 },
      { text: 'Frequently — it\'s a real objection', points: 1 }
    ]
  },
  {
    id: 7,
    category: 'Brand & Perception',
    text: 'Google your company right now. Does the top result reflect who you actually are today?',
    subtext: 'Not who you were 3 years ago. Who you are now.',
    options: [
      { text: 'Spot-on — exactly how we want to be seen', points: 5 },
      { text: 'Mostly accurate — room for improvement', points: 3 },
      { text: 'Outdated or unclear', points: 2 },
      { text: 'Doesn\'t match our actual value at all', points: 1 }
    ]
  },
  {
    id: 8,
    category: 'Brand & Perception',
    text: 'Does your brand justify premium pricing — or are you underselling yourself visually?',
    subtext: 'If your website looked like your competitor\'s, could you charge more?',
    options: [
      { text: 'Our brand is a competitive advantage', points: 5 },
      { text: 'It\'s fine but not a differentiator', points: 3 },
      { text: 'It undersells us — we\'re better than we look', points: 2 },
      { text: 'It\'s actively holding us back', points: 1 }
    ]
  },

  // CATEGORY 3: MARKETING SYSTEMS (Q9-12)
  {
    id: 9,
    category: 'Marketing Systems',
    text: 'Where do most of your leads actually come from?',
    subtext: 'Not where you want them to come from. Where they come from today.',
    options: [
      { text: 'Automated systems — content, SEO, ads', points: 5 },
      { text: 'Mix of referrals and some marketing', points: 4 },
      { text: 'Mostly referrals and word-of-mouth', points: 2 },
      { text: 'My personal outreach and networking', points: 1 }
    ]
  },
  {
    id: 10,
    category: 'Marketing Systems',
    text: 'How often do you publish content that attracts your ideal clients?',
    subtext: 'Strategic content — not random posts. Content that makes the right people say "I need to talk to them."',
    options: [
      { text: 'Multiple times per week — we have a system', points: 5 },
      { text: 'Weekly or a few times per month', points: 4 },
      { text: 'Monthly or less — very inconsistent', points: 2 },
      { text: 'Rarely or never — no time', points: 1 }
    ]
  },
  {
    id: 11,
    category: 'Marketing Systems',
    text: 'Do you have marketing systems that run without your daily involvement?',
    subtext: 'SOPs, scheduled content, automations, a person or team who owns it.',
    options: [
      { text: 'Yes — systems, SOPs, and a team', points: 5 },
      { text: 'Partially — some systems but needs my oversight', points: 3 },
      { text: 'Minimal — mostly ad-hoc when I find time', points: 2 },
      { text: 'Marketing only happens when I personally do it', points: 1 }
    ]
  },
  {
    id: 12,
    category: 'Marketing Systems',
    text: 'What percentage of leads come from sources OTHER than referrals?',
    subtext: 'Content, SEO, ads, partnerships — anything that doesn\'t require someone knowing you personally.',
    options: [
      { text: '75%+ from non-referral sources', points: 5 },
      { text: '50–74% from non-referral sources', points: 4 },
      { text: '25–49% from non-referral sources', points: 2 },
      { text: 'Less than 25% — almost all referrals', points: 1 }
    ]
  },

  // CATEGORY 4: SALES INFRASTRUCTURE (Q13-16)
  {
    id: 13,
    category: 'Sales Infrastructure',
    text: 'Do you have video assets that pre-sell prospects before they talk to you?',
    subtext: 'Not a corporate sizzle reel. Videos that handle objections, explain your process, and build trust — before the call.',
    options: [
      { text: 'Yes — 5+ strategic videos working for us', points: 5 },
      { text: '1–2 basic videos', points: 3 },
      { text: 'We\'ve talked about it but haven\'t done it', points: 2 },
      { text: 'No — every prospect hears it from us live', points: 1 }
    ]
  },
  {
    id: 14,
    category: 'Sales Infrastructure',
    text: 'Could a new salesperson follow your process without shadowing you for months?',
    subtext: 'Talk tracks, objection handling, qualification criteria, close scripts — documented and usable.',
    options: [
      { text: 'Fully documented — SOPs, scripts, the works', points: 5 },
      { text: 'Partially documented — some resources exist', points: 3 },
      { text: 'Minimally — mostly in my head', points: 2 },
      { text: 'Not documented — pure tribal knowledge', points: 1 }
    ]
  },
  {
    id: 15,
    category: 'Sales Infrastructure',
    text: 'How long does it take from first contact to signed contract?',
    subtext: 'Your average sales cycle — not your best deal, your average.',
    options: [
      { text: 'Less than 2 weeks', points: 5 },
      { text: '2–4 weeks', points: 4 },
      { text: '1–2 months', points: 2 },
      { text: '2+ months', points: 1 }
    ]
  },
  {
    id: 16,
    category: 'Sales Infrastructure',
    text: 'When prospects get on a call with you, do they already understand what you do and why you\'re different?',
    subtext: 'Or are you starting from scratch every time?',
    options: [
      { text: '75%+ already get it before the call', points: 5 },
      { text: '50–74% have a good understanding', points: 4 },
      { text: '25–49% have some understanding', points: 2 },
      { text: 'Less than 25% — I explain from scratch every time', points: 1 }
    ]
  },

  // CATEGORY 5: STRATEGIC CLARITY (Q17-20)
  {
    id: 17,
    category: 'Strategic Clarity',
    text: 'Can you describe your ideal client in two sentences?',
    subtext: 'Revenue range, industry, team size, specific problems. If it takes a paragraph, you don\'t have clarity.',
    options: [
      { text: 'Crystal clear — I can say it in my sleep', points: 5 },
      { text: 'Pretty clear — I know generally who they are', points: 3 },
      { text: 'Somewhat — it\'s broad or evolving', points: 2 },
      { text: 'Not clear — we work with whoever pays us', points: 1 }
    ]
  },
  {
    id: 18,
    category: 'Strategic Clarity',
    text: 'What makes you different from your competitors?',
    subtext: 'Not "better service." What\'s your specific methodology, framework, or unfair advantage?',
    options: [
      { text: 'Clear, defensible, and proven', points: 5 },
      { text: 'We\'re different but it\'s hard to articulate', points: 3 },
      { text: 'We\'re similar to competitors honestly', points: 2 },
      { text: 'We compete on relationships and price', points: 1 }
    ]
  },
  {
    id: 19,
    category: 'Strategic Clarity',
    text: 'Do you have documented brand positioning that guides all your marketing and sales?',
    subtext: 'Mission, vision, brand voice, customer journey — written down and used, not just in your head.',
    options: [
      { text: 'Fully documented and consistently used', points: 5 },
      { text: 'Partially documented', points: 3 },
      { text: 'Exists informally but not written down', points: 2 },
      { text: 'Never formalized', points: 1 }
    ]
  },
  {
    id: 20,
    category: 'Strategic Clarity',
    text: 'How often do you revisit your positioning, messaging, and go-to-market strategy?',
    subtext: 'Markets shift. Competitors evolve. Are you keeping up?',
    options: [
      { text: 'Quarterly or more — we actively refine', points: 5 },
      { text: 'Annually — once a year review', points: 3 },
      { text: 'Every few years when something breaks', points: 2 },
      { text: 'Set it and forget it', points: 1 }
    ]
  }
];

// ============================================
// CATEGORIES
// ============================================
const CATEGORIES = [
  'Founder Dependency',
  'Brand & Perception',
  'Marketing Systems',
  'Sales Infrastructure',
  'Strategic Clarity'
] as const;

// ============================================
// ZONE RESULTS COPY
// ============================================
const ZONE_RESULTS = {
  Red: {
    headline: 'You ARE the business.',
    body: `Right now, almost nothing moves without you. You're the salesperson, the brand, the closer, and the expert — all in one. That's not a business, that's a job you can't quit.\n\nHere's the math: If you're spending 20+ hours a week on sales and your time is worth $300–$500/hour based on revenue, that's $300K–$500K a year in opportunity cost. You're the most expensive employee in your company — doing work that a system could do.\n\nThis isn't a marketing problem. It's a duplication problem. Your expertise needs to exist outside of your head — in video assets, documented processes, and systems that sell for you.`,
    cta: 'This is urgent. Book a Founder Foundation Breakdown and let\'s build your exit plan from the day-to-day.',
    color: '#FF4444',
    badge: 'Founder-Dependent'
  },
  Yellow: {
    headline: 'You\'ve built something real. Now it\'s time to systemize it.',
    body: `You're not starting from zero — you have clients, revenue, and some traction. But there are gaps in your infrastructure that are capping your growth. Some systems work, others are held together with duct tape and your personal energy.\n\nThe danger of the Yellow Zone is comfort. You're making enough to feel okay, but not enough to feel free. You're working harder than ever but the growth isn't proportional to the effort.\n\nThe good news: you don't need to rebuild everything. You need to fill specific gaps — and the assessment just showed you exactly where they are.`,
    cta: 'You\'re close. Let\'s identify the 2–3 gaps holding you back and build a 90-day plan to close them.',
    color: '#FFB800',
    badge: 'Building Momentum'
  },
  Green: {
    headline: 'You\'re in rare territory.',
    body: `Most founders never get here. Your business has real systems, clear positioning, and doesn't depend entirely on you to function. You've built infrastructure, not just revenue.\n\nAt this stage, the opportunity isn't fixing what's broken — it's optimizing what works. Small improvements to your content engine, sales assets, and marketing systems compound fast when the foundation is solid.\n\nThe question isn't "how do I survive" — it's "how do I scale without losing what makes us great."`,
    cta: 'Let\'s talk about ExpansionLab — ongoing optimization and strategic support as you scale.',
    color: '#2ADD1B',
    badge: 'Scaling Smart'
  }
};

// ============================================
// QUICK WINS
// ============================================
interface QuickWin {
  action: string;
  description: string;
  impact: string;
  time: string;
}

const QUICK_WINS: Record<string, QuickWin[]> = {
  'Founder Dependency': [
    {
      action: 'Record your next 3 sales calls',
      description: 'Use Zoom or Loom. Don\'t prep differently — just record. Then listen back and write down: (1) What questions you always ask, (2) How you handle the top 3 objections, (3) The exact moment the prospect decides to buy. That\'s your sales DNA.',
      impact: 'First step to duplicating yourself.',
      time: '3 sales calls + 1 hour review'
    },
    {
      action: 'Write your "Only I Can Answer This" list',
      description: 'Every time someone asks you a question this week that only you can answer — write it down. By Friday you\'ll have a clear picture of where you\'re the bottleneck. Those answers become your first video scripts.',
      impact: 'Exposes exactly where you\'re stuck.',
      time: '5 days (passive tracking)'
    },
    {
      action: 'Send one deal through without touching it',
      description: 'Next qualified lead — let your team handle it end-to-end. Don\'t coach, don\'t jump in, don\'t "just quickly check." Watch what breaks. That\'s your training curriculum.',
      impact: 'Shows you where the real gaps are (not where you think they are).',
      time: '1 sales cycle'
    }
  ],
  'Brand & Perception': [
    {
      action: 'Screenshot your site next to your top competitor\'s',
      description: 'Put them side by side. Show it to someone who doesn\'t know either company. Ask: "Which one would you trust with a $10K project?" Their answer is your answer.',
      impact: 'Forces honest brand assessment in 5 minutes.',
      time: '15 minutes'
    },
    {
      action: 'Audit your Google results',
      description: 'Google your name + company name. First page = your digital first impression. Is it accurate? Is it impressive? Is it even there? Screenshot it — that\'s what every prospect sees before they talk to you.',
      impact: 'See yourself through your buyer\'s eyes.',
      time: '10 minutes'
    },
    {
      action: 'Collect 3 client quotes this week',
      description: 'Text or email 3 of your best clients: "If someone asked you why you work with us, what would you say?" Use their exact words — not your version of what they\'d say. That language becomes your marketing.',
      impact: 'Real proof beats perfect copy every time.',
      time: '3 texts + wait'
    }
  ],
  'Marketing Systems': [
    {
      action: 'Track where your last 10 clients came from',
      description: 'Go through your last 10 closed deals. For each one: who referred them, what did they see before the call, what made them reach out? Find the pattern. That\'s your highest-ROI channel — double down on it.',
      impact: 'Stop guessing, start knowing.',
      time: '30 minutes'
    },
    {
      action: 'Post your hottest take on LinkedIn',
      description: 'What do you believe about your industry that most people get wrong? Write it. Post it. Don\'t be safe — be honest. The posts that attract clients are the ones that make some people disagree.',
      impact: 'One post can generate more conversations than a month of cold outreach.',
      time: '20 minutes'
    },
    {
      action: 'Set up Google Analytics on your website',
      description: 'If you don\'t have it, you\'re flying blind. If you do have it, check it. How many visitors last month? Where did they come from? Which page do they leave on? That page is your leak.',
      impact: 'Can\'t improve what you don\'t measure.',
      time: '30 minutes'
    }
  ],
  'Sales Infrastructure': [
    {
      action: 'Record a 90-second "Why Us" video on your phone',
      description: 'Stand in front of your office/studio. No script. Answer this: "If I had 90 seconds to tell you why founders choose us over everyone else, here\'s what I\'d say." Record it. Upload to YouTube (unlisted). Send it to your next 3 prospects before their call.',
      impact: 'Prospects show up pre-sold. Calls get shorter. Close rate goes up.',
      time: '5 minutes to record, 5 to upload'
    },
    {
      action: 'List your top 5 objections and how you handle them',
      description: 'You already know what they are — "too expensive," "we tried something like this," "we\'re not ready." Write down your exact response to each one. That document is worth more than most sales training.',
      impact: 'Turns your instinct into a teachable system.',
      time: '30 minutes'
    },
    {
      action: 'Time your last 5 deals',
      description: 'First contact to signed contract — how many days? Where did each one stall? The stage where deals sit longest is where you need a better asset (video, case study, or follow-up sequence).',
      impact: 'Find the bottleneck in your sales cycle.',
      time: '15 minutes'
    }
  ],
  'Strategic Clarity': [
    {
      action: 'Write your ICP in exactly 2 sentences',
      description: 'Format: "We serve [type of person] who [situation/problem]. They\'re typically [revenue/size/stage] and they need [specific outcome]." If you can\'t get it to 2 sentences, you don\'t have enough clarity yet — and that\'s the insight.',
      impact: 'Every marketing and sales decision gets easier.',
      time: '15 minutes (but it\'ll feel like an hour)'
    },
    {
      action: 'Name your methodology',
      description: 'You have a way you do things — a process, a framework, a sequence. Name it. "The [Your Company] Method" or "The [Result] System." Naming it makes it real, sellable, and defensible.',
      impact: 'Transforms commodity service into proprietary system.',
      time: '30 minutes'
    },
    {
      action: 'Ask your best client why they chose you',
      description: 'Not "are you happy with our service." Ask: "When you were deciding between us and other options, what made you pick us?" Their answer is your real positioning — not what you think it is.',
      impact: 'Discover your actual differentiator from the buyer\'s perspective.',
      time: '1 conversation'
    }
  ]
};

// ============================================
// LAB SOLUTIONS
// ============================================
interface LabSolution {
  primaryLab: string;
  primaryPrice: string;
  secondaryLab: string;
  secondaryPrice: string;
  reasoning: string;
  labDescriptions: Record<string, string>;
  outcome: string;
}

const LAB_SOLUTIONS: Record<string, LabSolution> = {
  'Founder Dependency': {
    primaryLab: 'AssetsLab',
    primaryPrice: '$1,500',
    secondaryLab: 'VideoSalesLab',
    secondaryPrice: '$10,000',
    reasoning: 'Your expertise is trapped in your head. We need to extract it and put it to work without you.',
    labDescriptions: {
      'AssetsLab': 'We extract your positioning, messaging, objection handling, and sales DNA. Everything that makes you close deals — documented, structured, and ready to deploy.',
      'VideoSalesLab': '5 strategic videos that do your selling 24/7. Authority piece, origin story, offer breakdown, objection handling, social proof. Prospects arrive pre-sold.'
    },
    outcome: 'Deals close without you on every call. Your expertise works around the clock through video assets and documented systems.'
  },
  'Brand & Perception': {
    primaryLab: 'BrandLab',
    primaryPrice: '$3,500',
    secondaryLab: 'SiteLab',
    secondaryPrice: '$3,500',
    reasoning: 'You deliver premium work but your brand doesn\'t reflect it. Prospects are comparing your visual presence to competitors — and you\'re losing that comparison.',
    labDescriptions: {
      'BrandLab': 'Professional visual identity — logo, color system, typography, brand guidelines. The kind of brand that makes prospects trust you before you say a word.',
      'SiteLab': 'A website built to convert. Clear positioning, social proof, video integration, lead capture. Designed for the $1M–$8M buyer.'
    },
    outcome: 'Your brand commands premium pricing. The visual gap between you and competitors disappears — and tilts in your favor.'
  },
  'Marketing Systems': {
    primaryLab: 'AssetsLab',
    primaryPrice: '$1,500',
    secondaryLab: 'ExpansionLab',
    secondaryPrice: '$5,000/mo',
    reasoning: 'You can\'t market effectively without strategic clarity. First we build the foundation, then we execute.',
    labDescriptions: {
      'AssetsLab': 'Define exactly who you serve, what you say, and how you say it. Content roadmap, hook bank, and messaging framework.',
      'ExpansionLab': 'Ongoing execution — content production, LinkedIn campaigns, paid ads, retargeting. Your marketing engine running every month.'
    },
    outcome: 'Predictable lead flow from multiple channels. Marketing isn\'t something you "need to get to" — it\'s a system that runs.'
  },
  'Sales Infrastructure': {
    primaryLab: 'VideoSalesLab',
    primaryPrice: '$10,000',
    secondaryLab: 'SiteLab',
    secondaryPrice: '$3,500',
    reasoning: 'Every prospect gets the same pitch — from you, live, manually. That doesn\'t scale. You need assets that do the heavy lifting before the call.',
    labDescriptions: {
      'VideoSalesLab': '5 strategic videos with scripts, hooks, and CTAs. Prospects watch them, understand your value, and show up to calls ready to buy.',
      'SiteLab': 'Video-integrated website with conversion paths that move visitors from "browsing" to "booking."'
    },
    outcome: 'Shorter sales cycles. Higher close rates. Less time per deal. Your video assets handle education and trust-building.'
  },
  'Strategic Clarity': {
    primaryLab: 'AssetsLab',
    primaryPrice: '$1,500',
    secondaryLab: 'BrandLab',
    secondaryPrice: '$3,500',
    reasoning: 'Everything starts here. Without clear positioning, every dollar you spend on marketing and sales is partially wasted.',
    labDescriptions: {
      'AssetsLab': 'Business DNA extraction — your ICP, positioning, value propositions, competitive differentiation, content strategy, customer journey.',
      'BrandLab': 'Once you know who you are and who you serve, BrandLab makes it visible. Professional identity that matches your clarity.'
    },
    outcome: 'Crystal-clear positioning that makes every marketing and sales decision easier. You stop trying to be everything to everyone.'
  }
};

// ============================================
// SCORING HELPERS
// ============================================

type Zone = 'Red' | 'Yellow' | 'Green';
type CategoryZone = 'Critical' | 'Developing' | 'Strong';

function getZone(totalScore: number): Zone {
  if (totalScore <= 49) return 'Red';
  if (totalScore <= 74) return 'Yellow';
  return 'Green';
}

function getCategoryZone(categoryScore: number): CategoryZone {
  if (categoryScore <= 9) return 'Critical';
  if (categoryScore <= 14) return 'Developing';
  return 'Strong';
}

function getCategoryZoneColor(zone: CategoryZone): string {
  switch (zone) {
    case 'Critical': return '#FF4444';
    case 'Developing': return '#FFB800';
    case 'Strong': return '#2ADD1B';
  }
}

function getZoneTextClass(zone: Zone): string {
  switch (zone) {
    case 'Red': return 'text-red-500';
    case 'Yellow': return 'text-yellow-500';
    case 'Green': return 'text-green-500';
  }
}

function getZoneBgClass(zone: Zone): string {
  switch (zone) {
    case 'Red': return 'bg-red-500/10';
    case 'Yellow': return 'bg-yellow-500/10';
    case 'Green': return 'bg-green-500/10';
  }
}

function getZoneBorderClass(zone: Zone): string {
  switch (zone) {
    case 'Red': return 'border-red-500';
    case 'Yellow': return 'border-yellow-500';
    case 'Green': return 'border-green-500';
  }
}

function getCatZoneTextClass(zone: CategoryZone): string {
  switch (zone) {
    case 'Critical': return 'text-red-400';
    case 'Developing': return 'text-yellow-400';
    case 'Strong': return 'text-green-400';
  }
}

function getCatZoneBgClass(zone: CategoryZone): string {
  switch (zone) {
    case 'Critical': return 'bg-red-500';
    case 'Developing': return 'bg-yellow-500';
    case 'Strong': return 'bg-green-500';
  }
}

// ============================================
// COMPONENT
// ============================================

export default function AssessmentPage() {
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(0));
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Email capture form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const handleStart = () => {
    setStarted(true);
  };

  const handleAnswer = (points: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = points;
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      // Last question — go to email capture
      setTimeout(() => setShowEmailCapture(true), 300);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Calculate scores
  const calculateCategoryScores = (): Record<string, number> => {
    const scores: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      const catQuestions = questions.filter(q => q.category === cat);
      scores[cat] = catQuestions.reduce((sum, q) => {
        const idx = questions.indexOf(q);
        return sum + (answers[idx] || 0);
      }, 0);
    }
    return scores;
  };

  const calculateTotalScore = (): number => {
    return answers.reduce((sum, points) => sum + points, 0);
  };

  // Submit assessment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setPasswordError('');
    setSubmitting(true);

    // Validate password
    if (password && password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      setSubmitting(false);
      return;
    }
    if (password && password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    const categoryScores = calculateCategoryScores();
    const totalScore = calculateTotalScore();
    const zone = getZone(totalScore);

    // Build answers map: { "q1": points, "q2": points, ... }
    const answersMap: Record<string, number> = {};
    answers.forEach((pts, idx) => {
      answersMap[`q${idx + 1}`] = pts;
    });

    const payload = {
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      company: company || undefined,
      password: password || undefined,
      answers: answersMap,
      categoryScores,
      totalScore,
      zone,
    };

    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit assessment');
      }

      if (data.assessmentId) {
        setAssessmentId(data.assessmentId);
      }

      setShowEmailCapture(false);
      setShowResults(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // ==========================================
  // HERO / INTRO SCREEN
  // ==========================================
  if (!started) {
    return (
      <div className="min-h-screen">
        <Navigation />

        <section className="relative pt-32 pb-24 px-6 min-h-[80vh] flex items-center overflow-hidden bg-gradient-to-b from-black to-bg-secondary">
          {/* Live Action Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <video
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/podlab-logo-live-action.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/60"></div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-black mb-8 leading-[0.95] tracking-tight">
              <span className="inline-block">The</span>{" "}
              <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Founder</span><br />
              <span className="text-accent drop-shadow-[0_0_30px_rgba(42,221,27,0.5)]">Bottleneck</span>{" "}
              <span className="inline-block">Assessment</span>
            </h1>

            <p className="text-2xl md:text-3xl text-text-secondary mb-8 max-w-4xl mx-auto font-light leading-relaxed">
              <span className="text-white font-semibold">5 minutes.</span> <span className="text-accent font-bold">20 questions.</span> Know exactly where you&apos;re stuck.
            </p>

            <p className="text-xl text-text-secondary mb-16 max-w-3xl mx-auto">
              Discover your Founder Bottleneck Score and get a personalized roadmap to break free from founder dependency.
            </p>

            <button
              onClick={handleStart}
              className="group px-8 py-4 md:px-16 md:py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(42,221,27,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
            >
              <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Start Assessment →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            <p className="text-sm text-text-secondary mt-8">Free • Results in 5 minutes • Personalized roadmap included</p>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // EMAIL CAPTURE (after last question, before results)
  // ==========================================
  if (showEmailCapture) {
    return (
      <div className="min-h-screen">
        <Navigation />

        <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary min-h-screen">
          <div className="max-w-2xl mx-auto">
            {/* Progress — complete */}
            <div className="mb-12">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-text-secondary">Almost there</div>
                <div className="text-sm text-accent font-bold">Your results are ready</div>
              </div>
              <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="bg-bg-tertiary border-2 border-border rounded-2xl p-12">
              <div className="text-center mb-10">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                  Your results are <span className="text-accent">ready</span>.
                </h2>
                <p className="text-lg text-text-secondary max-w-md mx-auto">
                  Enter your info to unlock your personalized Bottleneck Score, category breakdown, and action plan.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-text-secondary mb-2">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-text-secondary mb-2">
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
                    placeholder="you@company.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-2">
                      Phone <span className="text-text-secondary text-xs">(optional)</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-text-secondary mb-2">
                      Company <span className="text-text-secondary text-xs">(optional)</span>
                    </label>
                    <input
                      id="company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
                      placeholder="Your company"
                    />
                  </div>
                </div>

                {/* Password — Create Account */}
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm font-semibold text-accent mb-1">Create your PodLab account to save your results</p>
                  <p className="text-xs text-text-secondary mb-4">You&apos;ll be able to log in anytime to view your score, track progress, and access deliverables.</p>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                        Password <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                          className="w-full px-4 py-3 pr-12 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
                          placeholder="Min. 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-secondary hover:text-accent transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
                        Confirm Password <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                        className="w-full px-4 py-3 bg-bg-secondary border-2 border-border rounded-xl text-white placeholder-text-tertiary focus:outline-none focus:border-accent transition-colors"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                      {passwordError}
                    </div>
                  )}
                </div>

                {submitError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full group px-12 py-5 bg-accent text-black text-lg font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(42,221,27,0.5)] active:scale-[0.98] relative overflow-hidden uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                    {submitting ? 'Creating Account & Unlocking...' : 'Unlock My Results →'}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                <p className="text-xs text-text-secondary text-center mt-3">
                  We&apos;ll send your results summary to your email. No spam, ever.
                </p>
              </form>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // RESULTS SCREEN
  // ==========================================
  if (showResults) {
    const categoryScores = calculateCategoryScores();
    const totalScore = calculateTotalScore();
    const zone = getZone(totalScore);
    const zoneData = ZONE_RESULTS[zone];

    // Sort categories by score (ascending = weakest first)
    const sortedCategories = [...CATEGORIES].sort(
      (a, b) => categoryScores[a] - categoryScores[b]
    );

    // Weakest 2 categories for quick wins
    const weakest2 = sortedCategories.slice(0, 2);

    // Build recommended labs (deduplicated)
    const recommendedLabs: { name: string; price: string; reason: string; description: string }[] = [];
    const seenLabs = new Set<string>();
    for (const cat of sortedCategories.slice(0, 2)) {
      const sol = LAB_SOLUTIONS[cat];
      if (!seenLabs.has(sol.primaryLab)) {
        seenLabs.add(sol.primaryLab);
        recommendedLabs.push({
          name: sol.primaryLab,
          price: sol.primaryPrice,
          reason: `Addresses your bottleneck: ${cat}`,
          description: sol.labDescriptions[sol.primaryLab],
        });
      }
      if (!seenLabs.has(sol.secondaryLab)) {
        seenLabs.add(sol.secondaryLab);
        recommendedLabs.push({
          name: sol.secondaryLab,
          price: sol.secondaryPrice,
          reason: `Reinforces ${cat} improvement`,
          description: sol.labDescriptions[sol.secondaryLab],
        });
      }
    }

    return (
      <div className="min-h-screen">
        <Navigation />

        <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black via-bg-secondary to-black">
          <div className="max-w-4xl mx-auto">
            {/* Score Header */}
            <div className="text-center mb-16">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-6">
                Your <span className="text-accent drop-shadow-[0_0_25px_rgba(42,221,27,0.5)]">Bottleneck Score</span>
              </h2>

              <div className={`inline-block text-5xl md:text-7xl lg:text-9xl font-black mb-6 ${getZoneTextClass(zone)}`} style={{ filter: `drop-shadow(0 0 40px ${zoneData.color}60)` }}>
                {totalScore}
              </div>

              <div className="mb-2">
                <span className="text-sm text-text-secondary">out of 100</span>
              </div>

              <div className={`inline-block px-8 py-4 rounded-xl border-2 ${getZoneBorderClass(zone)} ${getZoneBgClass(zone)} mb-8`}>
                <div className={`text-3xl font-bold ${getZoneTextClass(zone)}`}>{zoneData.headline}</div>
                <div className="text-lg text-text-secondary mt-2">{zoneData.badge} — {zone} Zone</div>
              </div>

              <div className="max-w-2xl mx-auto mb-12">
                {zoneData.body.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-lg text-text-secondary leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Category Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
                {CATEGORIES.map((cat) => {
                  const catScore = categoryScores[cat];
                  const catZone = getCategoryZone(catScore);
                  const pct = Math.round((catScore / 20) * 100);
                  return (
                    <div key={cat} className="bg-bg-tertiary border border-border rounded-xl p-4 text-center hover:border-accent transition-all duration-300">
                      <div className={`text-2xl font-black mb-1 ${getCatZoneTextClass(catZone)}`}>
                        {catScore}/20
                      </div>
                      <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full ${getCatZoneBgClass(catZone)} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-text-secondary leading-tight mb-1">{cat}</div>
                      <div className={`text-xs font-bold ${getCatZoneTextClass(catZone)}`}>{catZone}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Wins — weakest 2 categories */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-white mb-2 text-center">🎯 Your Quick Wins</h3>
              <p className="text-text-secondary text-center mb-8">Actionable moves for your two weakest areas — start this week.</p>

              {weakest2.map((cat) => {
                const catZone = getCategoryZone(categoryScores[cat]);
                const wins = QUICK_WINS[cat];
                return (
                  <div key={cat} className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <h4 className="text-lg font-bold text-white">{cat}</h4>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${getCatZoneTextClass(catZone)} ${catZone === 'Critical' ? 'bg-red-500/10' : catZone === 'Developing' ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
                        {catZone} ({categoryScores[cat]}/20)
                      </span>
                    </div>
                    <div className="space-y-4">
                      {wins.map((win, i) => (
                        <div key={i} className="bg-bg-tertiary border border-border rounded-xl p-6 hover:border-accent/50 transition-all">
                          <div className="flex items-start gap-3">
                            <span className="text-accent text-lg mt-0.5">→</span>
                            <div>
                              <div className="text-white font-semibold mb-2">{win.action}</div>
                              <p className="text-sm text-text-secondary mb-3">{win.description}</p>
                              <div className="flex flex-wrap gap-4 text-xs">
                                <span className="text-accent font-medium">Impact: {win.impact}</span>
                                <span className="text-text-secondary">⏱ {win.time}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommended Labs */}
            <div className="mb-16">
              <h3 className="text-2xl font-bold text-white mb-2 text-center">🧪 Recommended Labs</h3>
              <p className="text-text-secondary text-center mb-8">Based on your biggest bottlenecks — in priority order.</p>

              <div className="space-y-4">
                {recommendedLabs.slice(0, 3).map((lab, i) => (
                  <div key={i} className="bg-bg-tertiary border border-border rounded-xl p-6 hover:border-accent/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-accent font-bold uppercase tracking-wider">
                          {i === 0 ? 'Start Here' : i === 1 ? 'Then' : 'Next'}
                        </span>
                        <h4 className="text-xl font-bold text-white mt-1">{lab.name}</h4>
                      </div>
                      <div className="text-accent font-bold text-lg">{lab.price}</div>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">{lab.description}</p>
                    <p className="text-xs text-text-secondary">{lab.reason}</p>
                  </div>
                ))}
              </div>

              {/* Outcome for weakest category */}
              <div className="mt-6 bg-accent/5 border border-accent/20 rounded-xl p-6">
                <div className="text-sm font-bold text-accent mb-2 uppercase tracking-wider">Expected Outcome</div>
                <p className="text-text-secondary">{LAB_SOLUTIONS[weakest2[0]].outcome}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mb-16">
              <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto">{zoneData.cta}</p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center flex-wrap">
                <a
                  href="https://calendly.com/podlablv/strategy-call"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-8 py-4 md:px-16 md:py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(42,221,27,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
                >
                  <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Book Your Foundation Call →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </a>

                {assessmentId && (
                  <a
                    href="/portal"
                    className="px-12 py-6 border-2 border-accent text-accent text-lg font-bold rounded-xl hover:bg-accent/10 transition-all text-center"
                  >
                    View in Portal →
                  </a>
                )}

                <button
                  onClick={() => {
                    setShowResults(false);
                    setShowEmailCapture(false);
                    setStarted(false);
                    setCurrentQuestion(0);
                    setAnswers(new Array(questions.length).fill(0));
                    setFirstName('');
                    setLastName('');
                    setEmail('');
                    setPhone('');
                    setCompany('');
                    setSubmitError('');
                  }}
                  className="px-12 py-6 border-2 border-border text-white text-lg font-bold rounded-xl hover:border-accent hover:text-accent transition-all"
                >
                  Retake Assessment
                </button>
              </div>
            </div>

            {/* Bottom stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-bg-tertiary border border-border rounded-xl p-8 text-center hover:border-accent transition-all duration-300">
                <div className="text-4xl font-bold text-accent mb-3">5</div>
                <div className="text-sm text-text-secondary uppercase tracking-wider">Bottlenecks Analyzed</div>
              </div>
              <div className="bg-bg-tertiary border border-border rounded-xl p-8 text-center hover:border-accent transition-all duration-300">
                <div className={`text-4xl font-bold mb-3 ${getZoneTextClass(zone)}`}>{zone}</div>
                <div className="text-sm text-text-secondary uppercase tracking-wider">Your Zone</div>
              </div>
              <div className="bg-bg-tertiary border border-border rounded-xl p-8 text-center hover:border-accent transition-all duration-300">
                <div className="text-4xl font-bold text-accent mb-3">Free</div>
                <div className="text-sm text-text-secondary uppercase tracking-wider">Foundation Call</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // QUESTION SCREEN
  // ==========================================
  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Progress */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-text-secondary">
                Question {currentQuestion + 1} of {questions.length}
              </div>
              <div className="text-sm text-accent font-bold">
                {question.category}
              </div>
            </div>
            <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-bg-tertiary border-2 border-border rounded-2xl p-12 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              {question.text}
            </h2>

            {/* Subtext */}
            <p className="text-base text-text-secondary mb-10 italic">
              {question.subtext}
            </p>

            <div className="space-y-4">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option.points)}
                  className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-300 ${
                    answers[currentQuestion] === option.points && answers[currentQuestion] !== 0
                      ? 'border-accent bg-accent/10 text-white'
                      : 'border-border hover:border-accent hover:bg-accent/5'
                  }`}
                >
                  <span className="text-lg font-semibold">{option.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-8 py-4 border-2 border-border text-text-secondary rounded-lg hover:border-accent hover:text-accent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="text-sm text-text-secondary">
              {answers.filter(a => a > 0).length} / {questions.length} answered
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
