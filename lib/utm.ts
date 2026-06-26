// UTM attribution helper. Captures campaign params the moment a visitor lands
// and persists them through a multi-step funnel via sessionStorage, so the
// source survives navigation (e.g. /assessment -> /assessment/start).

export type Utm = {
  utm_source?: string
  utm_medium?: string
  utm_content?: string
  utm_campaign?: string
}

const KEY = 'pl_utm'
const FIELDS = ['utm_source', 'utm_medium', 'utm_content', 'utm_campaign'] as const

function fromUrl(): Utm {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  const u: Utm = {}
  for (const k of FIELDS) {
    const v = p.get(k)
    if (v) u[k] = v.slice(0, 120)
  }
  return u
}

// Call on first landing. If the URL carries UTMs, stash them for the session.
export function captureUtm(): void {
  if (typeof window === 'undefined') return
  const u = fromUrl()
  if (Object.keys(u).length) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(u))
    } catch {
      /* sessionStorage unavailable — non-fatal */
    }
  }
}

// Call at submit. Prefers the live URL, falls back to the stored landing source.
export function getUtm(): Utm {
  const u = fromUrl()
  if (Object.keys(u).length) return u
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}') as Utm
  } catch {
    return {}
  }
}
