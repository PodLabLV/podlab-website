'use client';

import { useState } from 'react';
import Navigation from "@/components/Navigation";
import Link from "next/link";

// Note: metadata export not supported in client components
// SEO handled by layout.tsx defaults

// Assessment questions data
const questions = [
  // CATEGORY 1: FOUNDER DEPENDENCY
  {
    id: 1,
    category: 'Founder Dependency',
    text: 'How many hours per week do you personally spend on sales activities (calls, proposals, follow-ups)?',
    options: [
      { text: 'Less than 5 hours', points: 1 },
      { text: '5-10 hours', points: 2 },
      { text: '10-20 hours', points: 4 },
      { text: '20+ hours', points: 5 }
    ]
  },
  {
    id: 2,
    category: 'Founder Dependency',
    text: 'What percentage of new client deals close WITHOUT your direct involvement in the sales process?',
    options: [
      { text: '75-100% close without me', points: 1 },
      { text: '50-74% close without me', points: 2 },
      { text: '25-49% close without me', points: 4 },
      { text: 'Less than 25% close without me', points: 5 }
    ]
  },
  {
    id: 3,
    category: 'Founder Dependency',
    text: 'If you took a 2-week vacation with zero access to work, what would happen to your sales pipeline?',
    options: [
      { text: 'It would continue normally', points: 1 },
      { text: 'It would slow down but not stop', points: 2 },
      { text: 'It would essentially freeze', points: 4 },
      { text: 'We\'d likely lose deals', points: 5 }
    ]
  },
  {
    id: 4,
    category: 'Founder Dependency',
    text: 'When a prospect asks "Why should we work with you vs. competitors?", how consistently can your team deliver the answer?',
    options: [
      { text: 'Very consistently - everyone says the same thing', points: 1 },
      { text: 'Mostly consistent with minor variations', points: 2 },
      { text: 'Inconsistent - depends who they talk to', points: 4 },
      { text: 'Not consistent at all / Only I can articulate it well', points: 5 }
    ]
  },

  // CATEGORY 2: BRAND & PERCEPTION
  {
    id: 5,
    category: 'Brand & Perception',
    text: 'When was the last time you invested in professional brand development (logo, visual identity, brand guidelines)?',
    options: [
      { text: 'Within the last 12 months', points: 1 },
      { text: '1-2 years ago', points: 2 },
      { text: '3-5 years ago', points: 4 },
      { text: '5+ years ago or never', points: 5 }
    ]
  },
  {
    id: 6,
    category: 'Brand & Perception',
    text: 'How often do prospects mention a competitor\'s website/brand looking "more professional" during your sales process?',
    options: [
      { text: 'Never - we\'re seen as the premium option', points: 1 },
      { text: 'Rarely - maybe once a quarter', points: 2 },
      { text: 'Sometimes - a few times per quarter', points: 4 },
      { text: 'Frequently - it\'s a recurring objection', points: 5 }
    ]
  },
  {
    id: 7,
    category: 'Brand & Perception',
    text: 'When you Google yourself or your company name, how accurately does the top result reflect your current positioning and value?',
    options: [
      { text: 'Extremely accurate - it\'s exactly how we want to be seen', points: 1 },
      { text: 'Mostly accurate with room for improvement', points: 2 },
      { text: 'Somewhat outdated or unclear', points: 4 },
      { text: 'Very outdated or doesn\'t match our actual value', points: 5 }
    ]
  },
  {
    id: 8,
    category: 'Brand & Perception',
    text: 'How confident are you that your brand (visual identity, messaging, website) accurately reflects the premium value you deliver?',
    options: [
      { text: 'Extremely confident - it\'s a competitive advantage', points: 1 },
      { text: 'Somewhat confident - it\'s fine but not a differentiator', points: 2 },
      { text: 'Not very confident - it undersells us', points: 4 },
      { text: 'Not confident at all - it\'s actively holding us back', points: 5 }
    ]
  },

  // CATEGORY 3: MARKETING SYSTEMS
  {
    id: 9,
    category: 'Marketing Systems',
    text: 'How do you currently generate the majority of your leads?',
    options: [
      { text: 'Automated marketing systems (content, SEO, ads)', points: 1 },
      { text: 'Mix of referrals and light marketing', points: 2 },
      { text: 'Mostly referrals and word-of-mouth', points: 4 },
      { text: 'Direct founder outreach and networking', points: 5 }
    ]
  },
  {
    id: 10,
    category: 'Marketing Systems',
    text: 'How frequently do you publish strategic content (blogs, videos, social posts) that attracts your ideal clients?',
    options: [
      { text: 'Daily or multiple times per week (consistent system)', points: 1 },
      { text: 'Weekly or a few times per month', points: 2 },
      { text: 'Monthly or less - very inconsistent', points: 4 },
      { text: 'Rarely or never - we don\'t have time', points: 5 }
    ]
  },
  {
    id: 11,
    category: 'Marketing Systems',
    text: 'Do you have documented marketing strategies and systems that run without your daily involvement?',
    options: [
      { text: 'Yes - we have systems, SOPs, and a dedicated person/team', points: 1 },
      { text: 'Partially - some systems but they need my oversight', points: 2 },
      { text: 'Minimal - it\'s mostly ad-hoc when I have time', points: 4 },
      { text: 'No - marketing only happens when I personally do it', points: 5 }
    ]
  },
  {
    id: 12,
    category: 'Marketing Systems',
    text: 'What percentage of your leads come from sources OTHER than direct referrals or your personal network?',
    options: [
      { text: '75%+ come from other sources (content, SEO, ads, partnerships)', points: 1 },
      { text: '50-74% from other sources', points: 2 },
      { text: '25-49% from other sources', points: 4 },
      { text: 'Less than 25% from other sources - mostly referrals', points: 5 }
    ]
  },

  // CATEGORY 4: SALES INFRASTRUCTURE
  {
    id: 13,
    category: 'Sales Infrastructure',
    text: 'Does your business have video assets (recorded presentations, explainer videos, FAQ videos) that pre-sell prospects before they talk to you?',
    options: [
      { text: 'Yes - we have 5+ strategic video assets working for us', points: 1 },
      { text: 'We have 1-2 basic videos', points: 2 },
      { text: 'We have videos but they\'re outdated or low-quality', points: 4 },
      { text: 'No - we don\'t have any video content', points: 5 }
    ]
  },
  {
    id: 14,
    category: 'Sales Infrastructure',
    text: 'How qualified are prospects by the time they get on a call with you?',
    options: [
      { text: 'Very qualified - they understand our value and are ready to buy', points: 1 },
      { text: 'Somewhat qualified - they know basics but need convincing', points: 2 },
      { text: 'Mostly unqualified - I have to educate them from scratch', points: 4 },
      { text: 'Completely unqualified - many calls are total mismatches', points: 5 }
    ]
  },
  {
    id: 15,
    category: 'Sales Infrastructure',
    text: 'Do you have a documented sales process that someone else could follow to close deals at your level?',
    options: [
      { text: 'Yes - it\'s documented and others use it successfully', points: 1 },
      { text: 'Partially documented but needs my personal touch to work', points: 2 },
      { text: 'Mostly in my head - not written down', points: 4 },
      { text: 'No - my process is impossible to replicate', points: 5 }
    ]
  },
  {
    id: 16,
    category: 'Sales Infrastructure',
    text: 'What happens if a prospect needs to "think about it" after your pitch?',
    options: [
      { text: 'We have automated follow-up nurture sequences', points: 1 },
      { text: 'We manually follow up but it\'s inconsistent', points: 2 },
      { text: 'We send one email then hope they come back', points: 4 },
      { text: 'Most "think about it" prospects are lost forever', points: 5 }
    ]
  },

  // CATEGORY 5: STRATEGIC CLARITY
  {
    id: 17,
    category: 'Strategic Clarity',
    text: 'Can you articulate in one clear sentence who you serve and what specific outcome you deliver?',
    options: [
      { text: 'Yes - and everyone on my team can recite it perfectly', points: 1 },
      { text: 'Yes - but my team might say it differently', points: 2 },
      { text: 'Sort of - it\'s clear to me but hard to explain concisely', points: 4 },
      { text: 'No - we help "everyone" and it\'s hard to narrow down', points: 5 }
    ]
  },
  {
    id: 18,
    category: 'Strategic Clarity',
    text: 'How often do you onboard clients who are NOT your ideal customer profile?',
    options: [
      { text: 'Never - we only work with perfect-fit clients', points: 1 },
      { text: 'Rarely - maybe 1 in 10', points: 2 },
      { text: 'Sometimes - about 25-50% are "okay" fits', points: 4 },
      { text: 'Often - we take almost anyone who can pay', points: 5 }
    ]
  },
  {
    id: 19,
    category: 'Strategic Clarity',
    text: 'Do you have a clear 12-month business roadmap that your team understands and executes against?',
    options: [
      { text: 'Yes - it\'s documented and everyone is aligned', points: 1 },
      { text: 'We have goals but they\'re not fully documented or shared', points: 2 },
      { text: 'I have ideas in my head but no formal roadmap', points: 4 },
      { text: 'No roadmap - we\'re mostly reactive to what comes in', points: 5 }
    ]
  },
  {
    id: 20,
    category: 'Strategic Clarity',
    text: 'How clear are you on the next 3 strategic moves you need to make to hit your revenue goals?',
    options: [
      { text: 'Crystal clear - I know exactly what to do next', points: 1 },
      { text: 'Mostly clear - I have a general direction', points: 2 },
      { text: 'Somewhat unclear - I have options but not sure which is right', points: 4 },
      { text: 'Very unclear - I feel stuck and don\'t know what to prioritize', points: 5 }
    ]
  }
];

export default function AssessmentPage() {
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(0));
  const [showResults, setShowResults] = useState(false);

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
      setTimeout(() => setShowResults(true), 300);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    return answers.reduce((sum, points) => sum + points, 0);
  };

  const getScoreData = (score: number) => {
    if (score <= 25) {
      return {
        zone: 'Green Zone',
        status: 'Scaling Smoothly',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500',
        description: 'Strong systems in place. You\'re not founder-dependent. Keep optimizing and scaling.'
      };
    } else if (score <= 50) {
      return {
        zone: 'Yellow Zone',
        status: 'Building Momentum',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500',
        description: 'Progress made, but gaps to fill. You\'re on the right path but need infrastructure to scale safely.'
      };
    } else if (score <= 70) {
      return {
        zone: 'Orange Zone',
        status: 'In the Bottleneck',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500',
        description: 'Founder-dependent. Revenue growth is limited by your personal time. You need systems now.'
      };
    } else {
      return {
        zone: 'Red Zone',
        status: 'Critical Constraint',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500',
        description: 'You ARE the single point of failure. Growth is impossible without removing founder dependency.'
      };
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const score = calculateScore();
  const scoreData = getScoreData(score);

  if (!started) {
    return (
      <div className="min-h-screen">
        <Navigation />
        
        {/* Hero */}
        <section className="relative pt-32 pb-24 px-6 min-h-[80vh] flex items-center overflow-hidden bg-gradient-to-b from-black to-bg-secondary">
          {/* Live Action Background (MP4 for performance) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <video
              autoPlay
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
            <h1 className="text-7xl md:text-9xl font-black mb-8 leading-[0.95] tracking-tight">
              <span className="inline-block">The</span>{" "}
              <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Founder</span><br />
              <span className="text-accent drop-shadow-[0_0_30px_rgba(57,255,20,0.5)]">Bottleneck</span>{" "}
              <span className="inline-block">Assessment</span>
            </h1>
            
            <p className="text-2xl md:text-3xl text-text-secondary mb-8 max-w-4xl mx-auto font-light leading-relaxed">
              <span className="text-white font-semibold">5 minutes.</span> <span className="text-accent font-bold">20 questions.</span> Know exactly where you're stuck.
            </p>
            
            <p className="text-xl text-text-secondary mb-16 max-w-3xl mx-auto">
              Discover your Founder Bottleneck Score and get a personalized roadmap to break free from founder dependency.
            </p>

            <button
              onClick={handleStart}
              className="group px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
            >
              <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Start Assessment →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            <p className="text-sm text-text-tertiary mt-8">No email required • Results in 5 minutes</p>
          </div>
        </section>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen">
        <Navigation />
        
        <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black via-bg-secondary to-black">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-black mb-6">
                Your <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">Bottleneck Score</span>
              </h2>
              
              <div className={`inline-block text-7xl md:text-9xl font-black mb-6 ${scoreData.color} drop-shadow-[0_0_40px_rgba(57,255,20,0.6)]`}>
                {score}
              </div>
              
              <div className={`inline-block px-8 py-4 rounded-xl border-2 ${scoreData.borderColor} ${scoreData.bgColor} mb-6`}>
                <div className={`text-3xl font-bold ${scoreData.color}`}>{scoreData.status}</div>
                <div className="text-lg text-text-secondary mt-2">{scoreData.zone}</div>
              </div>
              
              <p className="text-2xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed">
                {scoreData.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <a
                  href="https://calendly.com/podlablv/strategy-call"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-16 py-6 bg-accent text-black text-xl font-black rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-2 hover:scale-105 hover:shadow-[0_20px_60px_rgba(57,255,20,0.6)] active:scale-95 relative overflow-hidden uppercase tracking-wider"
                >
                  <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Get Your Roadmap →</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent-hover to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </a>
                
                <button
                  onClick={() => {
                    setShowResults(false);
                    setStarted(false);
                    setCurrentQuestion(0);
                    setAnswers(new Array(questions.length).fill(0));
                  }}
                  className="px-12 py-6 border-2 border-border text-white text-lg font-bold rounded-xl hover:border-accent hover:text-accent transition-all"
                >
                  Retake Assessment
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-16">
              <div className="bg-bg-tertiary border border-border rounded-xl p-8 text-center hover:border-accent transition-all duration-350">
                <div className="text-4xl font-bold text-accent mb-3">20</div>
                <div className="text-sm text-text-secondary uppercase tracking-wider">Questions Answered</div>
              </div>
              <div className="bg-bg-tertiary border border-border rounded-xl p-8 text-center hover:border-accent transition-all duration-350">
                <div className="text-4xl font-bold text-accent mb-3">5</div>
                <div className="text-sm text-text-secondary uppercase tracking-wider">Categories Assessed</div>
              </div>
              <div className="bg-bg-tertiary border border-border rounded-xl p-8 text-center hover:border-accent transition-all duration-350">
                <div className="text-4xl font-bold text-accent mb-3">100%</div>
                <div className="text-sm text-text-secondary uppercase tracking-wider">Complete</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="pt-32 pb-24 px-6 bg-gradient-to-b from-black to-bg-secondary min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Progress */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-text-tertiary">
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
            <h2 className="text-3xl md:text-4xl font-bold mb-12 leading-tight">
              {question.text}
            </h2>

            <div className="space-y-4">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option.points)}
                  className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-350 ${
                    answers[currentQuestion] === option.points
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
            
            <div className="text-sm text-text-tertiary">
              {answers.filter(a => a > 0).length} / {questions.length} answered
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
