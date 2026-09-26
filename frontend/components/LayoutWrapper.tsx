'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import TopHeader from '@/components/TopHeader'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = pathname === '/login'

  if (isPublic) return <>{children}</>

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <TopHeader />
      <main
        className="px-4 pb-32"
        style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 12px) + 56px + 16px)' }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
