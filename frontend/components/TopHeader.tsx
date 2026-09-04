'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, Truck } from 'lucide-react'
import { removeToken } from '@/lib/auth'

const titles: Record<string, string> = {
  '/dashboard': 'Översikt',
  '/bands': 'Transportband',
  '/workers': 'Medarbetare',
  '/schedule': 'Schema',
}

export default function TopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const title = Object.entries(titles).find(([key]) => pathname.startsWith(key))?.[1] ?? ''

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
      style={{
        background: '#003087',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: '12px',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#FFCC00' }}
        >
          <Truck className="w-4 h-4" style={{ color: '#003087' }} />
        </div>
        <motion.span
          key={title}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="font-bold text-white text-base tracking-tight"
        >
          {title}
        </motion.span>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleLogout}
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      >
        <LogOut className="w-4 h-4 text-white" />
      </motion.button>
    </header>
  )
}
