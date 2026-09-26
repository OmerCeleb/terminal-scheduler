'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Download, Zap, LifeBuoy, AlertTriangle, Check, Scale, FileText, ClipboardList, X } from 'lucide-react'
import { toast } from 'sonner'
import { generateSchedule, getSchedule, getBandSheetUrl, getShiftReportUrl } from '@/lib/api'
import { todayStr, swedishDate, fatigueLabel } from '@/lib/helpers'
import { Card, PageHeader, PrimaryButton, EmptyState, IconBadge } from '@/components/ui/primitives'
import type { Schedule } from '@/types'

const STAGES = ['Läser bandvolymer', 'Beräknar belastning', 'Fördelar band']

function fairness(s: Schedule): number {
  // 100 = heaviest bands went to the most rested workers, 0 = the opposite
  const a = [...s.assignments].sort((x, y) => y.band_packages - x.band_packages)
  if (a.length < 2) return 100
  let ok = 0, pairs = 0
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    pairs++
    if (a[i].fatigue_score <= a[j].fatigue_score) ok++
  }
  return Math.round((ok / pairs) * 100)
}

export default function SchedulePage() {
  const [date, setDate] = useState(todayStr())
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [stage, setStage] = useState<number | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    getSchedule(date).then(setSchedule).catch(() => setSchedule(null)).finally(() => setInitialLoading(false))
  }, [date])

  const handleGenerate = async () => {
    setStage(0)
    const t0 = Date.now()
    try {
      const p = generateSchedule(date)
      for (let i = 1; i < STAGES.length; i++) { await new Promise((r) => setTimeout(r, 380)); setStage(i) }
      const result = await p
      const rest = 1200 - (Date.now() - t0)
      if (rest > 0) await new Promise((r) => setTimeout(r, rest))
      setSchedule(result)
      toast.success('Schema genererat')
    } catch (e: any) {
      toast.error(e.message || 'Kunde inte generera')
    } finally { setStage(null) }
  }

  const warnings = schedule ? [
    ...schedule.empty_bands.map((b) => `Band ${b.name} saknar personal (${b.packages.toLocaleString('sv-SE')} pkt)`),
    ...schedule.unassigned.map((w) => `${w.name} har inget band`),
  ] : []
  const max = schedule ? Math.max(...schedule.assignments.map((a) => a.band_packages), 1) : 1
  const fair = schedule ? fairness(schedule) : 0

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow="Fördelning" title="Schema" subtitle="Tyngsta banden går till de mest utvilade" />

      <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 mb-4">
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold outline-none tabular-nums"
            style={{ borderColor: 'var(--pn-blue-line)', background: 'var(--surface-1)', color: 'var(--pn-blue)', colorScheme: 'inherit' }} />
          {schedule && stage === null && (
            <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.92 }}
              onClick={() => setExportOpen(true)} aria-label="Exportera"
              className="w-12 rounded-xl flex items-center justify-center border-2" style={{ borderColor: 'var(--pn-blue-line)', color: 'var(--pn-blue)' }}>
              <Download className="w-5 h-5" />
            </motion.button>
          )}
        </div>
        <PrimaryButton onClick={handleGenerate} disabled={stage !== null} className="w-full py-3.5 mt-2">
          <Zap className="w-4 h-4" /> {schedule ? 'Generera om' : 'Generera schema'}
        </PrimaryButton>
      </Card>


      <AnimatePresence>
        {exportOpen && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setExportOpen(false)} className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.45)' }} />
            <motion.div key="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed left-0 right-0 bottom-0 z-[70] rounded-t-3xl px-4 pt-3"
              style={{ background: 'var(--surface-1)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--ink-3)', opacity: 0.4 }} />
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="font-extrabold" style={{ color: 'var(--ink)' }}>Exportera</p>
                <button onClick={() => setExportOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}><X className="w-4 h-4" /></button>
              </div>
              {[
                { icon: ClipboardList, title: 'Bandlista', hint: 'För väggen · band och namn, inga belastningsdata', url: getBandSheetUrl(date) },
                { icon: FileText, title: 'Skiftrapport', hint: 'För skiftledare · belastning, historik och rättviseindex', url: getShiftReportUrl(date) },
              ].map((o, i) => {
                const Icon = o.icon
                return (
                  <motion.a key={o.title} href={o.url} target="_blank" rel="noopener" onClick={() => setExportOpen(false)}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.06 }} whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 p-4 rounded-2xl mb-2" style={{ background: 'var(--surface-2)' }}>
                    <IconBadge tone={i ? 'yellow' : 'blue'} size={40}><Icon className="w-5 h-5" /></IconBadge>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{o.title}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{o.hint}</p>
                    </div>
                    <Download className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ink-3)' }} />
                  </motion.a>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {stage !== null && (
          <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-6">
              {STAGES.map((label, i) => {
                const done = i < stage, active = i === stage
                return (
                  <motion.div key={label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 py-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: done ? 'var(--f-rested)' : active ? 'var(--pn-blue)' : 'var(--surface-2)', color: 'white' }}>
                      {done ? <Check className="w-3.5 h-3.5" /> : active
                        ? <motion.div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                        : <span className="text-[10px] font-bold" style={{ color: 'var(--ink-3)' }}>{i + 1}</span>}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: done || active ? 'var(--ink)' : 'var(--ink-3)' }}>{label}</span>
                  </motion.div>
                )
              })}
            </Card>
          </motion.div>
        )}

        {stage === null && schedule && (
          <motion.div key={schedule.generated_at} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Fairness */}
            <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 mb-3 flex items-center gap-4">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-2)" strokeWidth="3" />
                  <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--f-rested)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray="97.4" initial={{ strokeDashoffset: 97.4 }} animate={{ strokeDashoffset: 97.4 * (1 - fair / 100) }} transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold tabular-nums" style={{ color: 'var(--ink)' }}>{fair}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--ink)' }}><Scale className="w-3.5 h-3.5" /> Rättviseindex</p>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>{swedishDate(schedule.date)} · {schedule.assignments.length} band · {schedule.assignments.length + schedule.stod.length} personer</p>
              </div>
            </Card>

            {warnings.length > 0 && (
              <Card initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 mb-3" style={{ background: 'var(--f-normal-bg)', border: '1px solid transparent' }}>
                {warnings.map((w) => (
                  <p key={w} className="text-xs font-semibold flex items-center gap-2 py-0.5" style={{ color: 'var(--f-normal)' }}><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {w}</p>
                ))}
              </Card>
            )}

            {/* Assignments */}
            <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-3">
              {schedule.assignments.map((a, i) => {
                const f = fatigueLabel(a.fatigue_score)
                const pct = a.band_packages / max
                const color = pct > 0.75 ? 'var(--f-loaded)' : pct > 0.45 ? 'var(--f-normal)' : 'var(--pn-blue)'
                return (
                  <motion.div key={a.band_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
                    className="px-4 py-3 flex items-center gap-3" style={{ borderTop: i ? '1px solid var(--line)' : undefined }}>
                    <div className="w-16 flex-shrink-0">
                      <p className="text-base font-extrabold tabular-nums leading-none" style={{ color: 'var(--ink)' }}>{a.band_name}</p>
                      <p className="text-[10px] font-semibold tabular-nums mt-0.5" style={{ color: 'var(--ink-3)' }}>{a.band_packages.toLocaleString('sv-SE')}</p>
                    </div>
                    <div className="w-1 self-stretch rounded-full" style={{ background: color, opacity: 0.35 + pct * 0.65 }} />
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--pn-blue)' }}>{a.worker_name.charAt(0).toUpperCase()}</div>
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>{a.worker_name}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-1 rounded-full tabular-nums flex-shrink-0" style={{ background: f.bg, color: f.color }}>
                      {f.label} · {Math.round(a.fatigue_score)}
                    </span>
                  </motion.div>
                )
              })}
            </Card>

            {schedule.stod.length > 0 && (
              <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconBadge tone="yellow" size={30}><LifeBuoy className="w-3.5 h-3.5" /></IconBadge>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Stöd</p>
                    <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>Går in där det svämmar över</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {schedule.stod.map((w) => (
                    <span key={w.id} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>{w.name}</span>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {stage === null && !schedule && !initialLoading && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState icon={<CalendarDays className="w-8 h-8" />} title="Inget schema för valt datum" hint="Kontrollera att bandvolymer och personal är registrerade" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
