'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Truck, Moon, Sun } from 'lucide-react'
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
  const [dark, setDark] = useState(false)
  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] ?? ''

  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  const handleLogout = () => { removeToken(); router.push('/login') }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 text-white"
      style={{
        background: 'var(--pn-blue-strong)',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: '12px',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--pn-yellow)' }}>
          <Truck className="w-4 h-4" style={{ color: '#003087' }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={title}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="font-bold text-base tracking-tight"
          >
            {title}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={toggleTheme} aria-label="Byt tema"
          className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleLogout} aria-label="Logga ut"
          className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <LogOut className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  )
}
