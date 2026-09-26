import type { WorkerRole } from '@/types'

export const FATIGUE_AVERAGE = 50

export function fatigueLabel(score: number): { label: string; bar: string; bg: string; color: string } {
  if (score < 50) return { label: 'Utvilad', bar: 'var(--f-rested)', bg: 'var(--f-rested-bg)', color: 'var(--f-rested)' }
  if (score < 70) return { label: 'Normal', bar: 'var(--f-normal)', bg: 'var(--f-normal-bg)', color: 'var(--f-normal)' }
  return { label: 'Belastad', bar: 'var(--f-loaded)', bg: 'var(--f-loaded-bg)', color: 'var(--f-loaded)' }
}

export function roleLabel(role: WorkerRole): string {
  return role === 'stod' ? 'Stöd' : 'Band'
}

/** Local calendar date as YYYY-MM-DD (no UTC shift — matters on night shifts). */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

export const todayStr = () => daysAgo(0)
export const yesterdayStr = () => daysAgo(1)

export function swedishDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('sv-SE', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function swedishDateShort(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('sv-SE', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}
