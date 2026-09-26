'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Truck, Scale, Package, Users } from 'lucide-react'
import { toast } from 'sonner'
import { setToken } from '@/lib/auth'
import { BASE_URL } from '@/lib/api'
import { TextInput, PrimaryButton } from '@/components/ui/primitives'

const POINTS = [
  { icon: Package, text: 'Bandvolymer från prognosen' },
  { icon: Users, text: 'Belastning per person, senaste 3 dagarna' },
  { icon: Scale, text: 'Tyngsta banden till de mest utvilade' },
]

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('username', username)
      form.append('password', password)
      const res = await fetch(`${BASE_URL}/api/auth/login`, { method: 'POST', body: form })
      if (!res.ok) throw new Error('Felaktigt användarnamn eller lösenord')
      const data = await res.json()
      setToken(data.access_token)
      router.push('/dashboard')
    } catch (e: any) {
      toast.error(e.message || 'Inloggning misslyckades')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--surface-0)' }}>
      {/* Brand panel */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        className="relative overflow-hidden text-white lg:w-1/2 flex flex-col justify-between px-6 pb-8 lg:p-14"
        style={{ background: 'var(--pn-blue-strong)', paddingTop: 'max(env(safe-area-inset-top), 24px)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <motion.div key={i} className="absolute rounded-full border"
              style={{ width: 260 + i * 140, height: 260 + i * 140, borderColor: 'rgba(255,255,255,0.05)', right: -80 - i * 40, bottom: -120 - i * 50 }}
              animate={{ rotate: 360 }} transition={{ duration: 40 + i * 12, repeat: Infinity, ease: 'linear' }} />
          ))}
          <div className="absolute -right-24 -bottom-24 w-72 h-72 rounded-full" style={{ background: 'var(--pn-yellow)', opacity: 0.08, filter: 'blur(50px)' }} />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--pn-yellow)' }}>
            <Truck className="w-4 h-4" style={{ color: '#003087' }} />
          </div>
          <span className="font-extrabold tracking-tight">Terminalschema</span>
        </div>

        <div className="relative mt-10 lg:mt-0">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight">
            Rättvis fördelning,<br />varje skift.
          </motion.h2>
          <div className="mt-6 space-y-3">
            {POINTS.map((p, i) => {
              const Icon = p.icon
              return (
                <motion.div key={p.text} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: 'var(--pn-yellow)' }} />
                  </div>
                  {p.text}
                </motion.div>
              )
            })}
          </div>
        </div>

        <p className="relative hidden lg:block text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>© {new Date().getFullYear()} · Intern prototyp</p>
      </motion.div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>Logga in</h1>
          <p className="text-sm mt-1 mb-7" style={{ color: 'var(--ink-3)' }}>Endast för skiftledare</p>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--ink-2)' }}>Användarnamn</label>
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoComplete="username" autoCapitalize="none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--ink-2)' }}>Lösenord</label>
              <div className="relative">
                <TextInput type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoComplete="current-password" className="pr-12" />
                <button type="button" onClick={() => setShow(!show)} aria-label="Visa lösenord"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--ink-3)' }}>
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <PrimaryButton onClick={handleLogin} disabled={loading || !username || !password} className="w-full py-3.5 mt-2">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <motion.div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /> Loggar in
                  </motion.span>
                ) : (
                  <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    Logga in <ArrowRight className="w-4 h-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </PrimaryButton>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
