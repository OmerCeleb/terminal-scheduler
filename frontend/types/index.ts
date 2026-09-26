export type WorkerRole = 'band' | 'stod'
export type LoadSource = 'manual' | 'scanner'

export interface Band {
  id: number
  name: string
  created_at: string
}

export interface BandDailyLoad {
  id: number
  band_id: number
  date: string
  packages: number
}

export interface WorkerDailyLoad {
  date: string
  packages_handled: number
  heavy_packages: number
  weight_kg: number | null
  source: LoadSource
}

export interface Worker {
  id: number
  name: string
  role: WorkerRole
  is_active: boolean
  created_at: string
  recent_loads: WorkerDailyLoad[]
  fatigue_score: number
}

export interface AssignmentOut {
  band_id: number
  band_name: string
  band_packages: number
  worker_id: number
  worker_name: string
  fatigue_score: number
}

export interface WorkerRef {
  id: number
  name: string
  fatigue_score: number
}

export interface BandRef {
  id: number
  name: string
  packages: number
}

export interface Schedule {
  id: number
  date: string
  generated_at: string
  assignments: AssignmentOut[]
  stod: WorkerRef[]
  unassigned: WorkerRef[]
  empty_bands: BandRef[]
}

export interface ScannerImportRow {
  worker_name: string
  date: string
  packages: number
  heavy_packages?: number
  weight_kg?: number | null
}

export interface ScannerImportResult {
  imported: number
  skipped: string[]
}
