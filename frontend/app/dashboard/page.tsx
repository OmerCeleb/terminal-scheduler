'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Users, AlertTriangle, TrendingDown, ArrowRight, Calendar } from 'lucide-react'
import { getBands, getWorkers, getSchedule } from '@/lib/api'
import { todayStr, swedishDate, fatigueLabel } from '@/lib/helpers'
import Link from 'next/link'
import type { Band, Worker, Schedule } from '@/types'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export default function DashboardPage() {
  const [bands, setBands] = useState<Band[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getBands().then(setBands),
      getWorkers().then(setWorkers),
      getSchedule(todayStr()).then(setSchedule).catch(() => null),
    ]).finally(() => setLoading(false))
  }, [])

  const highFatigue = workers.filter((w) => w.fatigue_score >= 80)
  const avgFatigue = workers.length
    ? Math.round(workers.reduce((s, w) => s + w.fatigue_score, 0) / workers.length)
    : 0

  const stats = [
    { label: 'Band', value: bands.length, icon: Package, accent: '#003087', bg: 'rgba(0,48,135,0.07)' },
    { label: 'Personal', value: workers.length, icon: Users, accent: '#6366f1', bg: 'rgba(99,102,241,0.07)' },
    { label: 'Hög utmattning', value: highFatigue.length, icon: AlertTriangle, accent: '#ef4444', bg: 'rgba(239,68,68,0.07)' },
    { label: 'Medelutmattning', value: `${avgFatigue}%`, icon: TrendingDown, accent: '#b45309', bg: 'rgba(255,204,0,0.12)' },
  ]

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5"
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#003087' }}>
          {swedishDate(todayStr())}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">God morgon 👋</h1>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              custom={i}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="bg-white rounded-2xl p-4 border border-gray-100"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                <Icon className="w-4 h-4" style={{ color: s.accent }} />
              </div>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mb-5"
      >
        <Link href="/schedule">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #003087 0%, #0050cc 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">Generera schema</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Automatisk tilldelning</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.6)' }} />
          </motion.div>
        </Link>
      </motion.div>

      {/* Today's schedule */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-5"
      >
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm">Dagens schema</h2>
          {schedule && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,48,135,0.07)', color: '#003087' }}>
              {new Set(schedule.assignments.map(a => a.band_id)).size} band
            </span>
          )}
        </div>
        {schedule ? (
          <div className="divide-y divide-gray-50">
            {Object.entries(
              schedule.assignments.reduce((acc, a) => {
                if (!acc[a.band_name]) acc[a.band_name] = { packages: a.band_packages, workers: [] }
                acc[a.band_name].workers.push(a.worker_name)
                return acc
              }, {} as Record<string, { packages: number; workers: string[] }>)
            ).map(([band, data], i) => (
              <motion.div
                key={band}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.04 }}
                className="px-5 py-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,48,135,0.06)' }}>
                    <Package className="w-3.5 h-3.5" style={{ color: '#003087' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{band}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{data.workers.join(', ')}</p>
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: '#003087' }}>
                  {data.packages.toLocaleString('sv-SE')}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(0,48,135,0.06)' }}>
              <Calendar className="w-6 h-6" style={{ color: '#003087' }} />
            </div>
            <p className="text-sm font-semibold text-gray-600">Inget schema för idag</p>
            <p className="text-xs text-gray-400 mt-1">Tryck på Generera schema</p>
          </div>
        )}
      </motion.div>

      {/* Fatigue list */}
      {workers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 text-sm">Utmattningsstatus</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {workers.slice(0, 5).map((w, i) => {
              const f = fatigueLabel(w.fatigue_score)
              const pct = Math.min(Math.round(w.fatigue_score), 100)
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.04 }}
                  className="px-5 py-3.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#003087' }}>
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{w.name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.bg} ${f.color}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.65 + i * 0.04, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
