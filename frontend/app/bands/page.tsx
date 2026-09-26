'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Package, Check, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { getBands, createBand, deleteBand, upsertBandLoad, BASE_URL } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { todayStr } from '@/lib/helpers'
import { Card, PageHeader, FabButton, EmptyState, PrimaryButton, TextInput, IconBadge } from '@/components/ui/primitives'
import NumericInput from '@/components/NumericInput'
import type { Band, BandDailyLoad } from '@/types'

async function fetchTodayLoads(bands: Band[]): Promise<Record<number, number>> {
  const token = getToken()
  const today = todayStr()
  const out: Record<number, number> = {}
  await Promise.all(bands.map(async (b) => {
    const res = await fetch(`${BASE_URL}/api/bands/${b.id}/load`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) return
    const loads: BandDailyLoad[] = await res.json()
    const t = loads.find((l) => l.date === today)
    if (t) out[b.id] = t.packages
  }))
  return out
}

export default function BandsPage() {
  const [bands, setBands] = useState<Band[]>([])
  const [saved, setSaved] = useState<Record<number, number>>({})
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [flash, setFlash] = useState<number | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    (async () => {
      const b = await getBands()
      setBands(b)
      const s = await fetchTodayLoads(b)
      setSaved(s)
      setDrafts(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, String(v)])))
    })().finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const band = await createBand(newName.trim())
      setBands((p) => [...p, band])
      setNewName(''); setShowAdd(false)
      toast.success(`${band.name} tillagt`)
    } catch { toast.error('Kunde inte lägga till') }
    finally { setAdding(false) }
  }

  const handleDelete = async (b: Band) => {
    try {
      await deleteBand(b.id)
      setBands((p) => p.filter((x) => x.id !== b.id))
      toast.success(`${b.name} borttaget`)
    } catch { toast.error('Kunde inte ta bort') }
  }

  const handleSave = async (b: Band, focusNext = false) => {
    const val = parseInt(drafts[b.id] || '')
    if (isNaN(val)) return
    setSavingId(b.id)
    try {
      await upsertBandLoad(b.id, todayStr(), val)
      setSaved((p) => ({ ...p, [b.id]: val }))
      setFlash(b.id); setTimeout(() => setFlash((f) => (f === b.id ? null : f)), 1500)
      if (focusNext) {
        const idx = bands.findIndex((x) => x.id === b.id)
        const next = bands[idx + 1]
        if (next) inputRefs.current[next.id]?.focus()
        else inputRefs.current[b.id]?.blur()
      }
    } catch { toast.error('Kunde inte spara') }
    finally { setSavingId(null) }
  }

  const total = Object.values(saved).reduce((s, v) => s + v, 0)
  const max = Math.max(...Object.values(saved), 1)
  const unsaved = bands.filter((b) => (drafts[b.id] ?? '') !== String(saved[b.id] ?? '')).length

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow="Ikväll" title="Transportband" subtitle="Ange prognos per band från volymrapporten"
        action={<FabButton open={showAdd} onClick={() => setShowAdd(!showAdd)} />} />

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <Card className="p-4 space-y-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Nytt band</p>
              <div className="flex gap-2">
                <TextInput placeholder="t.ex. 12" value={newName} autoFocus onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
                <PrimaryButton onClick={handleAdd} disabled={adding || !newName.trim()} className="px-5">Lägg till</PrimaryButton>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floor view */}
      {bands.length > 0 && (
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Volymöversikt</p>
              <p className="text-[11px]" style={{ color: 'var(--ink-3)' }}>{bands.length} band · {total.toLocaleString('sv-SE')} paket</p>
            </div>
            {unsaved > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--f-normal-bg)', color: 'var(--f-normal)' }}>{unsaved} osparat</span>}
          </div>
          <div className="overflow-x-auto px-5 pb-4">
            <div className="flex items-end gap-2 h-36 min-w-max">
              {bands.map((b, i) => {
                const v = saved[b.id] ?? 0
                const pct = v / max
                const color = pct > 0.75 ? 'var(--f-loaded)' : pct > 0.45 ? 'var(--f-normal)' : 'var(--pn-blue)'
                return (
                  <div key={b.id} className="flex flex-col items-center gap-1.5 w-12">
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: v ? 'var(--ink-2)' : 'var(--ink-3)' }}>{v ? v.toLocaleString('sv-SE') : '–'}</span>
                    <div className="w-full flex-1 flex items-end rounded-lg overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <motion.div className="w-full rounded-lg" style={{ background: color }}
                        initial={{ height: 0 }} animate={{ height: `${Math.max(pct * 100, v ? 6 : 0)}%` }} transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }} />
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--ink)' }}>{b.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Entry list */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="rounded-2xl h-16 animate-pulse" style={{ background: 'var(--surface-1)' }} />)}</div>
      ) : bands.length === 0 ? (
        <EmptyState icon={<Package className="w-8 h-8" />} title="Inga band ännu" hint="Tryck på + för att lägga till" />
      ) : (
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Snabbinmatning</p>
            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--ink-3)' }}><ScanLine className="w-3 h-3" /> Skanning kommer</span>
          </div>
          <AnimatePresence initial={false}>
            {bands.map((b, i) => {
              const isDirty = (drafts[b.id] ?? '') !== String(saved[b.id] ?? '')
              return (
                <motion.div key={b.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                  className="px-4 py-2.5 flex items-center gap-2" style={{ borderTop: i ? '1px solid var(--line)' : undefined }}>
                  <IconBadge tone={saved[b.id] ? 'blue' : 'muted'} size={34}><span className="text-xs font-extrabold tabular-nums">{b.name}</span></IconBadge>
                  <NumericInput ref={(el) => { inputRefs.current[b.id] = el }} className="flex-1"
                    value={drafts[b.id] ?? ''} placeholder="Antal paket" suffix="pkt"
                    onChange={(v) => setDrafts((p) => ({ ...p, [b.id]: v }))}
                    onEnter={() => handleSave(b, true)} />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleSave(b, true)} disabled={savingId === b.id || !isDirty}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-30 transition-colors"
                    style={{ background: flash === b.id ? 'var(--f-rested)' : 'var(--pn-blue)' }}>
                    {savingId === b.id
                      ? <motion.div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                      : <Check className="w-4 h-4" />}
                  </motion.button>
                  <button onClick={() => handleDelete(b)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--f-loaded-bg)', color: 'var(--f-loaded)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </Card>
      )}
    </div>
  )
}
