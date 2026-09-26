'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Package, Users, CalendarDays, ArrowRight, Check, Circle, LifeBuoy, Moon, Sun } from 'lucide-react'
import { getBands, getWorkers, getSchedule } from '@/lib/api'
import { todayStr, swedishDate, fatigueLabel } from '@/lib/helpers'
import { Card, IconBadge } from '@/components/ui/primitives'
import type { Band, Worker, Schedule } from '@/types'

function shiftLabel() {
  const h = new Date().getHours()
  if (h >= 22 || h < 6) return { label: 'Nattskift', icon: Moon }
  if (h < 14) return { label: 'Dagskift', icon: Sun }
  return { label: 'Kvällsskift', icon: Moon }
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

  const shift = shiftLabel()
  const ShiftIcon = shift.icon
  const bandWorkers = workers.filter((w) => w.role === 'band')
  const stodWorkers = workers.filter((w) => w.role === 'stod')
  const workersWithData = workers.filter((w) => w.recent_loads.length > 0).length

  const steps = [
    {
      href: '/bands', icon: Package, label: 'Bandvolymer',
      detail: bands.length ? `${bands.length} band registrerade` : 'Inga band ännu',
      done: bands.length > 0,
    },
    {
      href: '/workers', icon: Users, label: 'Personal & belastning',
      detail: workers.length ? `${workersWithData} av ${workers.length} har data` : 'Ingen personal ännu',
      done: workers.length > 0 && workersWithData === workers.length,
    },
    {
      href: '/schedule', icon: CalendarDays, label: 'Schema',
      detail: schedule ? `Genererat ${new Date(schedule.generated_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}` : 'Inte genererat',
      done: !!schedule,
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const nextStep = steps.find((s) => !s.done)

  const sortedByLoad = [...workers].sort((a, b) => b.fatigue_score - a.fatigue_score)

  return (
    <div className="max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1 flex items-center gap-1.5" style={{ color: 'var(--pn-blue)' }}>
          <ShiftIcon className="w-3 h-3" /> {shift.label}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight capitalize" style={{ color: 'var(--ink)' }}>{swedishDate(todayStr())}</h1>
      </motion.div>

      {/* Readiness */}
      <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Skiftförberedelse</p>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{doneCount} av {steps.length} klart</p>
          </div>
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <motion.div key={i} className="h-1.5 w-8 rounded-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.08 }}
                style={{ background: s.done ? 'var(--f-rested)' : 'var(--surface-2)' }} />
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--line)' }}>
          {steps.map((s, i) => {
            const Icon = s.icon
            const isNext = nextStep?.href === s.href
            return (
              <Link key={s.href} href={s.href}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
                  whileTap={{ scale: 0.99 }}
                  className="px-5 py-3.5 flex items-center gap-3"
                  style={{ borderTop: i ? '1px solid var(--line)' : undefined, background: isNext ? 'var(--pn-blue-soft)' : undefined }}
                >
                  <IconBadge tone={s.done ? 'rested' : isNext ? 'blue' : 'muted'} size={34}>
                    {s.done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </IconBadge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.label}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{loading ? '…' : s.detail}</p>
                  </div>
                  {isNext
                    ? <span className="text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'var(--pn-blue)', color: 'white' }}>Nästa <ArrowRight className="w-3 h-3" /></span>
                    : <Circle className="w-4 h-4" style={{ color: 'var(--ink-3)', opacity: s.done ? 0 : 1 }} />}
                </motion.div>
              </Link>
            )
          })}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Band', value: bands.length, tone: 'blue' as const, icon: Package },
          { label: 'Bandpersonal', value: bandWorkers.length, tone: 'blue' as const, icon: Users },
          { label: 'Stöd', value: stodWorkers.length, tone: 'yellow' as const, icon: LifeBuoy },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.06 }} className="p-3.5">
              <IconBadge tone={s.tone} size={30}><Icon className="w-3.5 h-3.5" /></IconBadge>
              <p className="text-xl font-extrabold mt-2.5 tabular-nums" style={{ color: 'var(--ink)' }}>{loading ? '—' : s.value}</p>
              <p className="text-[11px] font-medium" style={{ color: 'var(--ink-3)' }}>{s.label}</p>
            </Card>
          )
        })}
      </div>

      {/* Load distribution */}
      {workers.length > 0 && (
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-4">
          <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
            <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Belastning senaste 3 dagarna</p>
            <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>50 = lagsnitt</p>
          </div>
          <div className="px-5 pb-4 space-y-2.5">
            {sortedByLoad.map((w, i) => {
              const f = fatigueLabel(w.fatigue_score)
              const pct = Math.min(w.fatigue_score, 100)
              return (
                <div key={w.id} className="flex items-center gap-3">
                  <span className="w-20 truncate text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>{w.name}</span>
                  <div className="flex-1 relative h-2 rounded-full" style={{ background: 'var(--surface-2)' }}>
                    <div className="absolute top-[-3px] bottom-[-3px] w-px" style={{ left: '50%', background: 'var(--ink-3)' }} />
                    <motion.div className="h-full rounded-full" style={{ background: f.bar }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.5 + i * 0.05, ease: 'easeOut' }} />
                  </div>
                  <span className="w-8 text-right text-xs font-bold tabular-nums" style={{ color: f.bar }}>{Math.round(w.fatigue_score)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Today's schedule summary */}
      {schedule && (
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Dagens schema</p>
            <Link href="/schedule" className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--pn-blue)' }}>Visa <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {schedule.assignments.map((a, i) => (
            <div key={a.band_id} className="px-5 py-3 flex items-center justify-between" style={{ borderTop: i ? '1px solid var(--line)' : undefined }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-1 rounded-lg tabular-nums" style={{ background: 'var(--pn-blue-soft)', color: 'var(--pn-blue)' }}>{a.band_name}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{a.worker_name}</span>
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--ink-2)' }}>{a.band_packages.toLocaleString('sv-SE')} pkt</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
