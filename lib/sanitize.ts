/**
 * Strip HTML tags from user input to prevent stored XSS
 */
export function sanitize(input: string | null | undefined): string {
  if (!input) return ''
  let s = input
  // Strip tags until none are left, so nested tricks like <<b>script> can't reassemble.
  for (let prev = ''; prev !== s; ) {
    prev = s
    s = s.replace(/<[^<>]*>/g, '')
  }
  // Never turn &lt;/&gt; back into brackets (that rebuilt the tags this removes),
  // and drop any stray bracket: names, companies and answers never need one.
  return s.replace(/[<>]/g, '').trim()
}

/** Escape text for an HTML email or page. Use on every user value placed in markup. */
export function escapeHtml(input: string | null | undefined): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitize an object's string values (shallow)
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = sanitize(result[key] as string)
    }
  }
  return result
}
