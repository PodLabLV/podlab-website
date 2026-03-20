import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  'https://podlablv.com',
  'https://www.podlablv.com',
]

/**
 * Add CORS headers to API responses. Rejects non-allowed origins.
 */
export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || !origin // Allow same-origin (no Origin header)
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || 'https://podlablv.com') : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCors(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request),
    })
  }
  return null
}

/**
 * Simple in-memory rate limiter (per-IP, resets every window)
 * For production scale, use Upstash Redis
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  request: NextRequest,
  { maxRequests = 10, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}
): { limited: boolean; remaining: number } {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown'
  
  const now = Date.now()
  const key = ip
  const entry = rateLimitMap.get(key)

  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt < now) rateLimitMap.delete(k)
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { limited: false, remaining: maxRequests - 1 }
  }

  entry.count++
  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0 }
  }

  return { limited: false, remaining: maxRequests - entry.count }
}
