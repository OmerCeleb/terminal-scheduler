'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Download, Zap, Users, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { generateSchedule, getSchedulePdfUrl } from '@/lib/api'
import { todayStr, swedishDate, fatigueLabel } from '@/lib/helpers'
import type { Schedule, AssignmentOut } from '@/types'

export default function SchedulePage() {
  const [date, setDate] = useState(todayStr())
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await generateSchedule(date)
      setSchedule(result)
      const allExpanded: Record<number, boolean> = {}
      const bandIds = [...new Set(result.assignments.map(a => a.band_id))]
      bandIds.forEach(id => { allExpanded[id] = true })
      setExpanded(allExpanded)
      toast.success('Schema genererat!')
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte generera schema')
    } finally {
      setLoading(false)
    }
  }

  const bandGroups = schedule
    ? Object.entries(
        schedule.assignments.reduce((acc, a) => {
          if (!acc[a.band_id]) acc[a.band_id] = { band_name: a.band_name, band_packages: a.band_packages, workers: [] }
          acc[a.band_id].workers.push(a)
          return acc
        }, {} as Record<number, { band_name: string; band_packages: number; workers: AssignmentOut[] }>)
      ).sort((a, b) => b[1].band_packages - a[1].band_packages)
    : []

  const maxPackages = bandGroups.length ? Math.max(...bandGroups.map(([, g]) => g.band_packages)) : 1

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schema</h1>
        <p className="text-xs text-gray-500 mt-0.5">Automatisk tilldelning baserad på utmattning</p>
      </motion.div>

      {/* Date + Generate */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 p-4 mb-4"
      >
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Datum</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 text-sm font-semibold outline-none mb-3"
          style={{ borderColor: 'rgba(0,48,135,0.2)', background: 'rgba(0,48,135,0.02)', color: '#003087' }}
        />
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #003087 0%, #0050cc 100%)' }}
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
                  Genererar...
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Generera schema
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {schedule && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => window.open(getSchedulePdfUrl(date), '_blank')}
              className="w-14 flex items-center justify-center rounded-xl border-2 font-bold"
              style={{ borderColor: 'rgba(0,48,135,0.2)', color: '#003087' }}
            >
              <Download className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!loading && schedule && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Summary pills */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex gap-2 mb-4 overflow-x-auto pb-1"
            >
              {[
                { icon: CalendarDays, label: swedishDate(schedule.date) },
                { icon: Package, label: `${bandGroups.length} band` },
                { icon: Users, label: `${new Set(schedule.assignments.map(a => a.worker_id)).size} personal` },
              ].map((pill, i) => {
                const Icon = pill.icon
                return (
                  <motion.div
                    key={pill.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0"
                    style={{ background: 'rgba(0,48,135,0.07)', color: '#003087' }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {pill.label}
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Band cards */}
            <div className="space-y-3">
              {bandGroups.map(([bandId, group], i) => {
                const id = parseInt(bandId)
                const loadPct = Math.round((group.band_packages / maxPackages) * 100)
                const isExpanded = expanded[id] !== false

                return (
                  <motion.div
                    key={bandId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  >
                    <button
                      className="w-full px-4 pt-4 pb-3 text-left"
                      onClick={() => setExpanded(prev => ({ ...prev, [id]: !isExpanded }))}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,48,135,0.07)' }}>
                            <Package className="w-4 h-4" style={{ color: '#003087' }} />
                          </div>
                          <span className="font-bold text-gray-900">{group.band_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: '#003087' }}>
                            {group.band_packages.toLocaleString('sv-SE')} pkt
                          </span>
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                          }
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: loadPct > 75 ? '#ef4444' : loadPct > 45 ? '#f59e0b' : '#003087' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${loadPct}%` }}
                          transition={{ duration: 0.6, delay: 0.3 + i * 0.07 }}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-50 divide-y divide-gray-50">
                            {group.workers.map((a) => {
                              const f = fatigueLabel(a.fatigue_score)
                              return (
                                <div key={a.worker_id} className="px-4 py-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#003087' }}>
                                      {a.worker_name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800">{a.worker_name}</span>
                                  </div>
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${f.bg} ${f.color}`}>
                                    {f.label} ({Math.round(a.fatigue_score)}%)
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {!loading && !schedule && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,48,135,0.06)' }}>
              <CalendarDays className="w-8 h-8" style={{ color: '#003087' }} />
            </div>
            <p className="font-semibold text-gray-600">Inget schema än</p>
            <p className="text-sm text-gray-400 mt-1">Välj datum och tryck Generera</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
