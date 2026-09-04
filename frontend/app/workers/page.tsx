'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Users, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getWorkers, createWorker, deleteWorker, upsertWorkerLoad } from '@/lib/api'
import { yesterdayStr, fatigueLabel } from '@/lib/helpers'
import type { Worker } from '@/types'

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newCapacity, setNewCapacity] = useState('300')
  const [yesterdayLoads, setYesterdayLoads] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    getWorkers().then((data) => {
      setWorkers(data)
      const loads: Record<number, string> = {}
      data.forEach((w) => { loads[w.id] = w.yesterday_packages > 0 ? String(w.yesterday_packages) : '' })
      setYesterdayLoads(loads)
    }).finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const cap = parseInt(newCapacity) || 300
      const worker = await createWorker(newName.trim(), cap)
      setWorkers((prev) => [...prev, { ...worker, yesterday_packages: 0, fatigue_score: 0 }])
      setNewName('')
      setNewCapacity('300')
      setShowAdd(false)
      toast.success(`${worker.name} tillagd`)
    } catch {
      toast.error('Kunde inte lägga till medarbetare')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteWorker(id)
      setWorkers((prev) => prev.filter((w) => w.id !== id))
      toast.success(`${name} borttagen`)
    } catch {
      toast.error('Kunde inte ta bort')
    }
  }

  const handleSave = async (workerId: number, name: string, capacity: number) => {
    const packages = parseInt(yesterdayLoads[workerId] || '0') || 0
    setSaving((prev) => ({ ...prev, [workerId]: true }))
    try {
      await upsertWorkerLoad(workerId, yesterdayStr(), packages)
      setSaved((prev) => ({ ...prev, [workerId]: true }))
      setTimeout(() => setSaved((prev) => ({ ...prev, [workerId]: false })), 2000)
      setWorkers((prev) =>
        prev.map((w) => {
          if (w.id !== workerId) return w
          return { ...w, yesterday_packages: packages, fatigue_score: Math.round((packages / capacity) * 100) }
        })
      )
      toast.success(`${name} — sparat`)
    } catch {
      toast.error('Kunde inte spara')
    } finally {
      setSaving((prev) => ({ ...prev, [workerId]: false }))
    }
  }

  const numericInput = (value: string, onChange: (v: string) => void, placeholder: string, center = false) => (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const clean = e.target.value.replace(/[^0-9]/g, '')
        onChange(clean)
      }}
      className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-semibold outline-none transition-all ${center ? 'text-center' : ''}`}
      style={{ borderColor: 'rgba(0,48,135,0.15)', background: 'rgba(0,48,135,0.02)' }}
    />
  )

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Medarbetare</h1>
          <p className="text-xs text-gray-500 mt-0.5">Registrera gårdagens arbetsbelastning</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
          style={{ background: '#003087' }}
        >
          <motion.div animate={{ rotate: showAdd ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="w-5 h-5" />
          </motion.div>
        </motion.button>
      </motion.div>

      {workers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-3 gap-3 mb-4"
        >
          {[
            { label: 'Totalt', value: workers.length, color: '#003087' },
            { label: 'Hög utmattning', value: workers.filter(w => w.fatigue_score >= 80).length, color: '#ef4444' },
            { label: 'Låg utmattning', value: workers.filter(w => w.fatigue_score < 50).length, color: '#22c55e' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl px-3 py-3 border border-gray-100 text-center">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Ny medarbetare</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Namn"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
                  style={{ borderColor: '#003087', background: 'rgba(0,48,135,0.02)' }}
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    {numericInput(newCapacity, setNewCapacity, 'Kapacitet (paket/dag)')}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAdd}
                    disabled={adding || !newName.trim()}
                    className="px-5 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                    style={{ background: '#003087' }}
                  >
                    {adding ? '...' : 'Lägg till'}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,48,135,0.06)' }}>
            <Users className="w-8 h-8" style={{ color: '#003087' }} />
          </div>
          <p className="font-semibold text-gray-600">Inga medarbetare</p>
          <p className="text-sm text-gray-400 mt-1">Tryck på + för att lägga till</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {workers.map((worker, i) => {
              const f = fatigueLabel(worker.fatigue_score)
              const pct = Math.min(Math.round(worker.fatigue_score), 100)
              return (
                <motion.div
                  key={worker.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: '#003087' }}>
                        {worker.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{worker.name}</p>
                        <p className="text-xs text-gray-400">Kapacitet: {worker.capacity} pkt</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.bg} ${f.color}`}>
                        {pct}%
                      </span>
                      <button
                        onClick={() => handleDelete(worker.id, worker.name)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,0.06)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(0,0,0,0.05)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 + 0.2 }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      {numericInput(
                        yesterdayLoads[worker.id] ?? '',
                        (v) => setYesterdayLoads((prev) => ({ ...prev, [worker.id]: v })),
                        'Gårdagens paket',
                        true
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">igår</span>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSave(worker.id, worker.name, worker.capacity)}
                      disabled={saving[worker.id]}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: saved[worker.id] ? '#22c55e' : '#003087' }}
                    >
                      <AnimatePresence mode="wait">
                        {saving[worker.id] ? (
                          <motion.div
                            key="spin"
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                          />
                        ) : (
                          <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Check className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
