'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const UnicornBackground = dynamic(
  () => import('@/components/ui/unicorn-background').then((mod) => ({ default: mod.UnicornBackground })),
  { ssr: false }
)

export default function HomePageWrapper({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-[#0a0a0a] opacity-50 md:opacity-100" 
        style={{ width: '100vw', height: '100vh', left: 0, top: 0 }}
      >
        {isClient && <UnicornBackground projectId="GUfyMQB5CKHPivFz7drf" />}
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
