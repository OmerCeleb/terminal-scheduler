export function fatigueLabel(score: number): { label: string; color: string; bg: string } {
  if (score < 50) return { label: 'Låg', color: 'text-green-800', bg: 'bg-green-100' }
  if (score < 80) return { label: 'Medel', color: 'text-amber-800', bg: 'bg-amber-100' }
  return { label: 'Hög', color: 'text-red-800', bg: 'bg-red-100' }
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function todayStr(): string {
  return formatDate(new Date())
}

export function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatDate(d)
}

export function swedishDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
