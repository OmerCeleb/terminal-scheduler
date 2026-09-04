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

export interface BandWithLoad extends Band {
  load?: BandDailyLoad
}

export interface Worker {
  id: number
  name: string
  capacity: number
  is_active: boolean
  created_at: string
  yesterday_packages: number
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

export interface Schedule {
  id: number
  date: string
  generated_at: string
  assignments: AssignmentOut[]
}
