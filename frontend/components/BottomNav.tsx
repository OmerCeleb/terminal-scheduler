'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Users, CalendarDays } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/dashboard', label: 'Översikt', icon: LayoutDashboard },
  { href: '/bands', label: 'Band', icon: Package },
  { href: '/workers', label: 'Personal', icon: Users },
  { href: '/schedule', label: 'Schema', icon: CalendarDays },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe"
      style={{
        background: 'color-mix(in srgb, var(--surface-1) 92%, transparent)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
        paddingTop: '8px',
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className="flex-1">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-1 py-1 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                  style={{ background: 'var(--pn-blue)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive ? 'var(--pn-blue-soft)' : 'transparent',
                }}
              >
                <Icon
                  className="w-5 h-5 transition-all duration-200"
                  style={{ color: isActive ? 'var(--pn-blue)' : 'var(--ink-3)' }}
                />
              </div>
              <span
                className="text-xs font-medium transition-all duration-200"
                style={{ color: isActive ? 'var(--pn-blue)' : 'var(--ink-3)', fontSize: '10px' }}
              >
                {item.label}
              </span>
            </motion.div>
          </Link>
        )
      })}
    </nav>
  )
}
