'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Users, Check, ScanLine, LifeBuoy, Package } from 'lucide-react'
import { Card, PageHeader, FabButton, EmptyState, PrimaryButton, TextInput } from '@/components/ui/primitives'
import { toast } from 'sonner'
import { getWorkers, createWorker, deleteWorker, upsertWorkerLoad } from '@/lib/api'
import { daysAgo, fatigueLabel, roleLabel, swedishDateShort } from '@/lib/helpers'
import NumericInput from '@/components/NumericInput'
import type { Worker, WorkerRole } from '@/types'

const WINDOW = [1, 2, 3].map(daysAgo) // yesterday, 2 days ago, 3 days ago

type Draft = { packages: string; heavy: string }
type Drafts = Record<number, Record<string, Draft>>

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [drafts, setDrafts] = useState<Drafts>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<WorkerRole>('band')
  const [adding, setAdding] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const reload = async () => {
    const data = await getWorkers()
    setWorkers(data)
    const d: Drafts = {}
    data.forEach((w) => {
      d[w.id] = {}
      WINDOW.forEach((date) => {
        const l = w.recent_loads.find((x) => x.date === date)
        d[w.id][date] = {
          packages: l ? String(l.packages_handled) : '',
          heavy: l?.heavy_packages ? String(l.heavy_packages) : '',
        }
      })
    })
    setDrafts(d)
  }

  useEffect(() => { reload().finally(() => setLoading(false)) }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await createWorker(newName.trim(), newRole)
      await reload()
      setNewName(''); setNewRole('band'); setShowAdd(false)
      toast.success('Medarbetare tillagd')
    } catch { toast.error('Kunde inte lägga till') }
    finally { setAdding(false) }
  }

  const handleDelete = async (w: Worker) => {
    try {
      await deleteWorker(w.id)
      setWorkers((prev) => prev.filter((x) => x.id !== w.id))
      toast.success(`${w.name} borttagen`)
    } catch { toast.error('Kunde inte ta bort') }
  }

  const handleSave = async (w: Worker, date: string) => {
    const draft = drafts[w.id]?.[date]
    if (!draft || draft.packages === '') return
    const key = `${w.id}-${date}`
    setSavingKey(key)
    try {
      await upsertWorkerLoad(w.id, date, parseInt(draft.packages) || 0, parseInt(draft.heavy) || 0)
      await reload()
      setSavedKey(key)
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1800)
    } catch { toast.error('Kunde inte spara') }
    finally { setSavingKey(null) }
  }

  const setDraft = (wid: number, date: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [wid]: { ...prev[wid], [date]: { ...prev[wid][date], ...patch } } }))

  const bandWorkers = workers.filter((w) => w.role === 'band')
  const stodWorkers = workers.filter((w) => w.role === 'stod')

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow="Laget" title="Medarbetare" subtitle="Belastning senaste 3 dagarna"
        action={<FabButton open={showAdd} onClick={() => setShowAdd(!showAdd)} />} />

      {workers.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Bandpersonal', value: bandWorkers.length, color: 'var(--pn-blue)' },
            { label: 'Stöd', value: stodWorkers.length, color: 'var(--pn-yellow-ink)' },
            { label: 'Belastade', value: workers.filter((w) => w.fatigue_score >= 80).length, color: 'var(--f-loaded)' },
          ].map((s) => (
            <Card key={s.label} className="px-3 py-3 text-center">
              <p className="text-xl font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5 leading-tight" style={{ color: 'var(--ink-3)' }}>{s.label}</p>
            </Card>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <Card className="p-4 space-y-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Ny medarbetare</p>
              <TextInput placeholder="Namn" value={newName} autoFocus onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
              <div className="grid grid-cols-2 gap-2">
                {(['band', 'stod'] as WorkerRole[]).map((r) => {
                  const active = newRole === r
                  const Icon = r === 'stod' ? LifeBuoy : Package
                  return (
                    <button
                      key={r} onClick={() => setNewRole(r)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all"
                      style={{
                        borderColor: active ? 'var(--pn-blue)' : 'var(--pn-blue-line)',
                        background: active ? 'var(--pn-blue)' : 'var(--surface-1)',
                        color: active ? 'white' : 'var(--pn-blue)',
                      }}
                    >
                      <Icon className="w-4 h-4" /> {roleLabel(r)}
                    </button>
                  )
                })}
              </div>
              <PrimaryButton onClick={handleAdd} disabled={adding || !newName.trim()} className="w-full py-3">
                {adding ? 'Sparar...' : 'Lägg till'}
              </PrimaryButton>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="rounded-2xl h-40 animate-pulse" style={{ background: 'var(--surface-1)' }} />)}</div>
      ) : workers.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="Inga medarbetare" hint="Tryck på + för att lägga till" />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {workers.map((w, i) => {
              const f = fatigueLabel(w.fatigue_score)
              const pct = Math.min(Math.round(w.fatigue_score), 100)
              const isStod = w.role === 'stod'
              return (
                <Card
                  key={w.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="p-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: isStod ? 'var(--pn-yellow-ink)' : 'var(--pn-blue)' }}
                        >
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{w.name}</p>
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
                            {isStod && <LifeBuoy className="w-3 h-3" />}{roleLabel(w.role)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums" style={{ background: f.bg, color: f.color }}>{f.label} · {pct}</span>
                        <button onClick={() => handleDelete(w)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--f-loaded-bg)', color: 'var(--f-loaded)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div className="absolute top-0 bottom-0 w-px" style={{ left: '50%', background: 'var(--ink-3)' }} />
                      <motion.div
                        className="h-full rounded-full" style={{ background: f.bar }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 + 0.2 }}
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--line)' }}>
                    {WINDOW.map((date) => {
                      const key = `${w.id}-${date}`
                      const draft = drafts[w.id]?.[date] ?? { packages: '', heavy: '' }
                      const stored = w.recent_loads.find((x) => x.date === date)
                      return (
                        <div key={date} className="px-4 py-2.5 flex items-center gap-2" style={{ borderTop: date !== WINDOW[0] ? '1px solid var(--line)' : undefined }}>
                          <div className="w-16 flex-shrink-0">
                            <p className="text-xs font-semibold capitalize" style={{ color: 'var(--ink-2)' }}>{swedishDateShort(date)}</p>
                            {stored?.source === 'scanner' && (
                              <p className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--pn-blue)' }}><ScanLine className="w-2.5 h-2.5" /> scanner</p>
                            )}
                          </div>
                          <NumericInput className="flex-1" value={draft.packages} suffix="pkt" placeholder="–"
                            onChange={(v) => setDraft(w.id, date, { packages: v })} />
                          <NumericInput className="w-24" value={draft.heavy} suffix=">10kg" placeholder="–"
                            onChange={(v) => setDraft(w.id, date, { heavy: v })} />
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleSave(w, date)}
                            disabled={savingKey === key || draft.packages === ''}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-30"
                            style={{ background: savedKey === key ? 'var(--f-rested)' : 'var(--pn-blue)' }}
                          >
                            {savingKey === key
                              ? <motion.div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                              : <Check className="w-4 h-4" />}
                          </motion.button>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
