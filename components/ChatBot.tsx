'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PortalContext {
  firstName?: string
  company?: string
  totalScore?: number
  zone?: string
  weakestCategories?: string[]
  primaryBottleneck?: string
  aiDiagnoses?: { category: string; headline: string; narrative: string }[]
  websiteUrl?: string
  websiteAi?: {
    positioningClarity: number
    premiumness: number
    targetMarketFit: number
    heroVerdict: string
    premiumPriceCeiling: string
  }
  roadmapPhases?: { phase: number; lab: string; name: string; duration: string }[]
}

const CATEGORIES = [
  'Founder Dependency',
  'Brand & Perception',
  'Marketing Systems',
  'Sales Infrastructure',
  'Strategic Clarity',
] as const

const QUICK_ACTIONS = [
  { label: ' What Labs do you offer?', message: 'What services or Labs does PodLab offer?' },
  { label: ' Pricing', message: 'How much do your services cost?' },
  { label: ' The studio', message: 'Tell me about your video studio' },
  { label: ' Book a call', message: 'I want to book a strategy call' },
  { label: ' Take the assessment', message: 'I want to take the bottleneck assessment' },
]

const PORTAL_QUICK_ACTIONS = [
  { label: ' Where should I start?', message: 'Looking at my score, what should I start with first?' },
  { label: ' Cost vs. ROI?', message: 'Help me understand the ROI math on my situation.' },
  { label: ' Foundation Call?', message: 'What happens on the Foundation Call? Is it really not a pitch?' },
  { label: ' Book my call', message: 'I want to book my Foundation Call.' },
]

function linkify(text: string): string {
  // Convert **bold** FIRST (before URL detection, so **url** doesn't get ** in the href)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
  // Convert markdown-style links [text](url) to HTML
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#2ADD1B] underline hover:text-[#85FF78]">$1</a>'
  )
  // Convert bare URLs to clickable links (exclude * and trailing punctuation)
  text = text.replace(
    /(?<!href=")(https?:\/\/[^\s<*"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#2ADD1B] underline hover:text-[#85FF78]">$1</a>'
  )
  // Convert newlines to <br>
  text = text.replace(/\n/g, '<br />')
  return text
}

export default function ChatBot() {
  const pathname = usePathname()
  const isOnPortal = pathname?.startsWith('/portal') ?? false

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [portalContext, setPortalContext] = useState<PortalContext | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // When on /portal, fetch the visitor's assessment + roadmap once and cache it
  // so every chat message can be answered with their specific context.
  useEffect(() => {
    if (!isOnPortal) {
      setPortalContext(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const supabase = getSupabaseBrowser()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || cancelled) return

        const userEmail = session.user.email?.toLowerCase()
        const meta = session.user.user_metadata || {}

        const { data: clientData } = await supabase
          .from('clients')
          .select('id, first_name, company_name')
          .eq('email', userEmail)
          .single()
        if (!clientData || cancelled) return

        const { data: a } = await supabase
          .from('assessments')
          .select('*')
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (!a || cancelled) return

        const cs: Record<string, number> = {
          'Founder Dependency': a.founder_dependency_score ?? a.raw_responses?.categoryScores?.['Founder Dependency'] ?? 0,
          'Brand & Perception': a.brand_perception_score ?? a.raw_responses?.categoryScores?.['Brand & Perception'] ?? 0,
          'Marketing Systems': a.marketing_systems_score ?? a.raw_responses?.categoryScores?.['Marketing Systems'] ?? 0,
          'Sales Infrastructure': a.sales_infrastructure_score ?? a.raw_responses?.categoryScores?.['Sales Infrastructure'] ?? 0,
          'Strategic Clarity': a.strategic_clarity_score ?? a.raw_responses?.categoryScores?.['Strategic Clarity'] ?? 0,
        }
        const weakest = [...CATEGORIES].sort((x, y) => (cs[x] ?? 0) - (cs[y] ?? 0))

        const { data: roadmapData } = await supabase
          .from('roadmaps')
          .select('phases')
          .eq('assessment_id', a.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (cancelled) return

        const wa = a.raw_responses?.websiteAiAnalysis
        setPortalContext({
          firstName: clientData.first_name || meta.first_name,
          company: clientData.company_name || meta.company,
          totalScore: a.total_score,
          zone: a.zone ? a.zone.charAt(0).toUpperCase() + a.zone.slice(1).toLowerCase() : undefined,
          weakestCategories: weakest,
          primaryBottleneck: a.primary_bottleneck,
          aiDiagnoses: a.raw_responses?.aiDiagnoses,
          websiteUrl: a.raw_responses?.websiteUrl,
          websiteAi: wa
            ? {
                positioningClarity: wa.positioningClarity,
                premiumness: wa.premiumness,
                targetMarketFit: wa.targetMarketFit,
                heroVerdict: wa.heroVerdict,
                premiumPriceCeiling: wa.premiumPriceCeiling,
              }
            : undefined,
          roadmapPhases: roadmapData?.phases?.map((p: { phase: number; lab: string; name: string; duration: string }) => ({
            phase: p.phase,
            lab: p.lab,
            name: p.name,
            duration: p.duration,
          })),
        })
      } catch (err) {
        console.error('Portal context fetch failed (Cleetus will respond without it):', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOnPortal])

  // Remember if user dismissed the chat — don't pop up again this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasDismissed = sessionStorage.getItem('cleetus-dismissed')
      if (wasDismissed) setDismissed(true)
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Show greeting bubble after 5 seconds if user hasn't interacted (desktop only)
  // If user dismissed, never show again this session
  useEffect(() => {
    if (hasInteracted || dismissed) return
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (isMobile) return
    const timer = setTimeout(() => {
      if (!hasInteracted && !isOpen && !dismissed) {
        setHasInteracted(true)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [hasInteracted, isOpen, dismissed])

  const handleDismiss = () => {
    setHasInteracted(false)
    setDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cleetus-dismissed', '1')
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cleetus-dismissed', '1')
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    setShowQuickActions(false)
    const userMessage: Message = { role: 'user', content: content.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          ...(portalContext ? { portalContext } : {}),
        }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "My sincerest apologies — I seem to be having a brief moment. Might I suggest booking a call directly? Hiram would be delighted to assist: calendly.com/podlablv/strategy-call"
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "It appears the connection has hit a snag. No matter — you can reach Hiram directly at calendly.com/podlablv/strategy-call. He's quite good company, I assure you."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]">
        {/* Greeting bubble */}
        {!isOpen && hasInteracted && !dismissed && messages.length === 0 && (
          <div
            className="absolute bottom-16 right-0 bg-[#1A1A1A] border border-[#2ADD1B]/30 rounded-2xl rounded-br-md p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] max-w-[220px] sm:max-w-[260px] cursor-pointer animate-fade-in"
            onClick={() => { setIsOpen(true); setHasInteracted(false) }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); handleDismiss() }}
              className="absolute -top-2 -left-2 w-6 h-6 bg-[#1A1A1A] border border-[#2E2E2E] rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:border-[#2ADD1B]/50 transition-colors z-10"
              aria-label="Dismiss"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <p className="text-sm text-gray-300">
              🧪 Good evening. Cleetus here — PodLab&apos;s resident gentleman. Shall I help you explore what we do?
            </p>
            <div className="absolute -bottom-1 right-4 w-3 h-3 bg-[#1A1A1A] border-r border-b border-[#2ADD1B]/30 rotate-45" />
          </div>
        )}

        <button
          onClick={() => { if (isOpen) { handleClose() } else { setIsOpen(true); setHasInteracted(false) } }}
          className={`group w-14 h-14 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(42,221,27,0.4)] hover:shadow-[0_8px_40px_rgba(42,221,27,0.6)] transition-all duration-300 hover:scale-110 ${
            isOpen
              ? 'bg-[#1A1A1A] border border-[#2ADD1B]/50'
              : 'bg-[#2ADD1B] hover:bg-[#85FF78]'
          }`}
          aria-label={isOpen ? 'Close chat' : 'Chat with Cleetus'}
        >
          {isOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2ADD1B" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <span className="text-2xl">🧪</span>
          )}
        </button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed z-[9999] inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[380px] sm:max-w-[calc(100vw-2rem)] h-[100dvh] sm:h-[520px] sm:max-h-[calc(100vh-8rem)] sm:rounded-2xl bg-[#0a0a0a] border-0 sm:border border-[#2E2E2E] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-slide-up">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top,1rem))] sm:pt-4 border-b border-[#2E2E2E] bg-[#1A1A1A]">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#2ADD1B]/20 border border-[#2ADD1B]/40 flex items-center justify-center">
                <span className="text-lg">🧪</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#2ADD1B] rounded-full border-2 border-[#1A1A1A]" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Cleetus</h3>
              <p className="text-[#2ADD1B] text-xs">At your service</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-white transition-colors p-2 -mr-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#2ADD1B]/20 border border-[#2ADD1B]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">🧪</span>
                  </div>
                  <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {isOnPortal && portalContext?.firstName ? (
                        <>
                          🧪 {portalContext.firstName}, welcome.<br /><br />
                          I&apos;ve seen your score and your roadmap. Ask me anything about what you&apos;re looking at — your weakest categories, the labs, the math, what the Foundation Call actually looks like. I&apos;ll give it to you straight.
                        </>
                      ) : isOnPortal ? (
                        <>
                          🧪 Welcome to your portal.<br /><br />
                          Ask me anything about what you&apos;re seeing — your score, the labs, the math, or what the Foundation Call actually looks like.
                        </>
                      ) : (
                        <>
                          🧪 Good to see you. I&apos;m Cleetus — consider me your personal guide to everything PodLab.<br /><br />
                          Tell me a bit about your business and I&apos;ll point you in the right direction. Or tap a button below if you&apos;d prefer the express route.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                {showQuickActions && (
                  <div className="flex flex-wrap gap-2 pl-2 sm:pl-10">
                    {(isOnPortal ? PORTAL_QUICK_ACTIONS : QUICK_ACTIONS).map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.message)}
                        className="text-xs sm:text-xs px-3 py-2 min-h-[44px] rounded-full border border-[#2ADD1B]/30 text-[#2ADD1B] hover:bg-[#2ADD1B]/10 hover:border-[#2ADD1B]/60 transition-all duration-200 active:bg-[#2ADD1B]/20"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#2ADD1B]/20 border border-[#2ADD1B]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">🧪</span>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#2ADD1B] text-black rounded-tr-md font-medium'
                      : 'bg-[#1A1A1A] border border-[#2E2E2E] text-gray-300 rounded-tl-md'
                  }`}
                  dangerouslySetInnerHTML={
                    msg.role === 'assistant'
                      ? { __html: linkify(msg.content) }
                      : undefined
                  }
                >
                  {msg.role === 'user' ? msg.content : undefined}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#2ADD1B]/20 border border-[#2ADD1B]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs">🧪</span>
                </div>
                <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-[#2ADD1B]/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#2ADD1B]/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#2ADD1B]/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] sm:pb-3 border-t border-[#2E2E2E] bg-[#1A1A1A]">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Cleetus anything..."
                className="flex-1 bg-[#0a0a0a] border border-[#2E2E2E] rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2ADD1B]/50 transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-[#2ADD1B] hover:bg-[#85FF78] disabled:bg-[#2E2E2E] disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Powered by Cleetus 🧪 • <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            </p>
          </form>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #2E2E2E; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
    </>
  )
}
