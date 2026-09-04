'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { setToken } from '@/lib/auth'
import { BASE_URL } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!username || !password) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('username', username)
      form.append('password', password)
      const res = await fetch(`${BASE_URL}/api/auth/login`, {        method: 'POST',
        body: form,
      })
      if (!res.ok) throw new Error('Felaktigt användarnamn eller lösenord')
      const data = await res.json()
      setToken(data.access_token)
      toast.success('Inloggad!')
      router.push('/dashboard')
    } catch (e: any) {
      toast.error(e.message || 'Inloggning misslyckades')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f5f4f0' }}>
      {/* Left panel */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-1/2 flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: '#003087' }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${120 + i * 80}px`,
                height: `${120 + i * 80}px`,
                border: '1px solid rgba(255,255,255,0.06)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20 + i * 5, repeat: Infinity, ease: 'linear' }}
            />
          ))}
          <motion.div
            className="absolute bottom-0 right-0 w-96 h-96 rounded-full"
            style={{ background: 'rgba(255,204,0,0.08)', filter: 'blur(60px)', transform: 'translate(30%, 30%)' }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFCC00' }}>
              <Truck className="w-5 h-5" style={{ color: '#003087' }} />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">PostNord</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Terminal<br />Schemaläggare
            </h2>
            <p className="text-blue-200 mt-4 text-base leading-relaxed max-w-sm">
              Automatisk schemaläggning baserad på medarbetarnas utmattningsnivå. Smartare fördelning, effektivare terminal.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex gap-8"
          >
            {[['98%', 'Noggrannhet'], ['3x', 'Snabbare'], ['↓40%', 'Utmattning']].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold" style={{ color: '#FFCC00' }}>{val}</p>
                <p className="text-blue-300 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-400 text-xs">© 2024 PostNord Terminal System</p>
        </div>
      </motion.div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#003087' }}>
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">PostNord Terminal</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Välkommen tillbaka</h1>
            <p className="text-gray-500 mt-1 text-sm">Logga in på ditt administratörskonto</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Användarnamn
              </label>
              <motion.div
                animate={{ scale: focused === 'username' ? 1.01 : 1 }}
                transition={{ duration: 0.15 }}
                className="relative"
              >
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="admin"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm transition-all duration-200 outline-none bg-white"
                  style={{
                    borderColor: focused === 'username' ? '#003087' : '#e5e7eb',
                    boxShadow: focused === 'username' ? '0 0 0 4px rgba(0,48,135,0.08)' : 'none',
                  }}
                />
              </motion.div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Lösenord
              </label>
              <motion.div
                animate={{ scale: focused === 'password' ? 1.01 : 1 }}
                transition={{ duration: 0.15 }}
                className="relative"
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm transition-all duration-200 outline-none bg-white pr-12"
                  style={{
                    borderColor: focused === 'password' ? '#003087' : '#e5e7eb',
                    boxShadow: focused === 'password' ? '0 0 0 4px rgba(0,48,135,0.08)' : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </motion.div>
            </div>

            <motion.button
              onClick={handleLogin}
              disabled={loading || !username || !password}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 transition-opacity disabled:opacity-50"
              style={{ background: '#003087', color: 'white' }}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Loggar in...
                  </motion.div>
                ) : (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    Logga in
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(0,48,135,0.04)', border: '1px solid rgba(0,48,135,0.1)' }}>
            <p className="text-xs text-gray-500 font-medium mb-1">Demo credentials</p>
            <p className="text-xs text-gray-400">Användarnamn: <span className="font-mono text-gray-600">admin</span></p>
            <p className="text-xs text-gray-400">Lösenord: <span className="font-mono text-gray-600">postnord2024</span></p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
