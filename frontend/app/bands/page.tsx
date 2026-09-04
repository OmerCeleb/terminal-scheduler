'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Package, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getBands, createBand, deleteBand, upsertBandLoad } from '@/lib/api'
import { todayStr } from '@/lib/helpers'
import type { Band } from '@/types'

export default function BandsPage() {
  const [bands, setBands] = useState<Band[]>([])
  const [loads, setLoads] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    getBands().then(setBands).finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const band = await createBand(newName.trim())
      setBands((prev) => [...prev, band])
      setNewName('')
      setShowAdd(false)
      toast.success(`${band.name} tillagd`)
    } catch {
      toast.error('Kunde inte lägga till band')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteBand(id)
      setBands((prev) => prev.filter((b) => b.id !== id))
      const newLoads = { ...loads }
      delete newLoads[id]
      setLoads(newLoads)
      toast.success(`${name} borttagen`)
    } catch {
      toast.error('Kunde inte ta bort band')
    }
  }

  const handleSave = async (bandId: number, bandName: string) => {
    const val = parseInt(loads[bandId] || '0')
    if (isNaN(val)) return
    setSaving((prev) => ({ ...prev, [bandId]: true }))
    try {
      await upsertBandLoad(bandId, todayStr(), val)
      setSaved((prev) => ({ ...prev, [bandId]: true }))
      setTimeout(() => setSaved((prev) => ({ ...prev, [bandId]: false })), 2000)
      toast.success(`${bandName} — sparat`)
    } catch {
      toast.error('Kunde inte spara')
    } finally {
      setSaving((prev) => ({ ...prev, [bandId]: false }))
    }
  }

  const totalPackages = Object.values(loads).reduce((s, v) => s + (parseInt(v) || 0), 0)
  const maxLoad = Math.max(...Object.values(loads).map(v => parseInt(v) || 0), 1)

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transportband</h1>
          <p className="text-xs text-gray-500 mt-0.5">Ange dagens paketantal per band</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
          style={{ background: '#003087' }}
        >
          <motion.div animate={{ rotate: showAdd ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="w-5 h-5" />
          </motion.div>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {totalPackages > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-4 px-5 py-4 rounded-2xl flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #003087 0%, #0050cc 100%)' }}
          >
            <div>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Totalt idag</p>
              <p className="text-2xl font-bold text-white">{totalPackages.toLocaleString('sv-SE')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Band</p>
              <p className="text-2xl font-bold text-white">{bands.length}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Nytt transportband</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="t.ex. Band A"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all"
                  style={{ borderColor: '#003087', background: 'rgba(0,48,135,0.02)' }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAdd}
                  disabled={adding || !newName.trim()}
                  className="px-4 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                  style={{ background: '#003087' }}
                >
                  {adding ? '...' : 'Lägg till'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : bands.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,48,135,0.06)' }}>
            <Package className="w-8 h-8" style={{ color: '#003087' }} />
          </div>
          <p className="font-semibold text-gray-600">Inga band tillagda</p>
          <p className="text-sm text-gray-400 mt-1">Tryck på + för att lägga till</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {bands.map((band, i) => {
              const loadVal = parseInt(loads[band.id] || '0') || 0
              const pct = maxLoad > 0 ? Math.round((loadVal / maxLoad) * 100) : 0
              const isSaved = saved[band.id]
              return (
                <motion.div
                  key={band.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,48,135,0.07)' }}>
                          <Package className="w-4 h-4" style={{ color: '#003087' }} />
                        </div>
                        <span className="font-bold text-gray-900">{band.name}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(band.id, band.name)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,0.06)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="0"
                        value={loads[band.id] ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/^0+(?=\d)/, '')
                          setLoads((prev) => ({ ...prev, [band.id]: raw }))
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold outline-none transition-all text-center"
                        style={{ borderColor: 'rgba(0,48,135,0.15)', background: 'rgba(0,48,135,0.02)' }}
                      />
                      <span className="text-sm text-gray-400 font-medium">paket</span>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleSave(band.id, band.name)}
                        disabled={saving[band.id] || !loads[band.id]}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40"
                        style={{ background: isSaved ? '#22c55e' : '#003087' }}
                      >
                        <AnimatePresence mode="wait">
                          {saving[band.id] ? (
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

                    {loadVal > 0 && (
                      <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.05)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: pct > 75 ? '#ef4444' : pct > 45 ? '#f59e0b' : '#003087' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    )}
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
