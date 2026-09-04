'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Users, CalendarDays, LogOut, Truck } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { removeToken } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'Översikt', icon: LayoutDashboard },
  { href: '/bands', label: 'Transportband', icon: Package },
  { href: '/workers', label: 'Medarbetare', icon: Users },
  { href: '/schedule', label: 'Schema', icon: CalendarDays },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col" style={{ background: '#003087' }}>
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFCC00' }}>
            <Truck className="w-4 h-4" style={{ color: '#003087' }} />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight">PostNord</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Terminal Schemaläggare</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                  isActive
                    ? 'text-white'
                    : 'hover:bg-white/10'
                )}
                style={isActive ? { background: 'rgba(255,255,255,0.15)' } : {}}
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: isActive ? '#FFCC00' : 'rgba(255,255,255,0.5)' }}
                />
                <span style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.65)' }}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: '#FFCC00' }}
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all duration-200 hover:bg-white/10"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>Logga ut</span>
        </motion.button>
        <p className="text-center text-xs mt-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
          v1.0.0
        </p>
      </div>
    </aside>
  )
}
