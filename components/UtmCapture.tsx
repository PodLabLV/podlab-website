'use client'

import { useEffect } from 'react'
import { captureUtm } from '@/lib/utm'

// Invisible — captures UTM params on landing and persists them for the session.
// Drop into any server-rendered entry page (e.g. the assessment landing).
export default function UtmCapture() {
  useEffect(() => {
    captureUtm()
  }, [])
  return null
}
