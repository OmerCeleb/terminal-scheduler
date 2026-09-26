import { getToken } from '@/lib/auth'
import type {
  Band, BandDailyLoad, Worker, WorkerDailyLoad, Schedule, ScannerImportRow, ScannerImportResult, WorkerRole,
} from '@/types'

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Bands
export const getBands = () => request<Band[]>('/api/bands/')
export const createBand = (name: string) =>
  request<Band>('/api/bands/', { method: 'POST', body: JSON.stringify({ name }) })
export const deleteBand = (id: number) =>
  request<void>(`/api/bands/${id}`, { method: 'DELETE' })
export const upsertBandLoad = (bandId: number, date: string, packages: number) =>
  request<BandDailyLoad>(`/api/bands/${bandId}/load`, { method: 'PUT', body: JSON.stringify({ date, packages }) })

// Workers
export const getWorkers = () => request<Worker[]>('/api/workers/')
export const createWorker = (name: string, role: WorkerRole) =>
  request<Worker>('/api/workers/', { method: 'POST', body: JSON.stringify({ name, role }) })
export const updateWorker = (id: number, name: string, role: WorkerRole) =>
  request<Worker>(`/api/workers/${id}`, { method: 'PATCH', body: JSON.stringify({ name, role }) })
export const deleteWorker = (id: number) =>
  request<void>(`/api/workers/${id}`, { method: 'DELETE' })
export const upsertWorkerLoad = (workerId: number, date: string, packages_handled: number, heavy_packages = 0) =>
  request<WorkerDailyLoad>(`/api/workers/${workerId}/load`, {
    method: 'PUT',
    body: JSON.stringify({ date, packages_handled, heavy_packages }),
  })

// Imports
export const importScannerData = (rows: ScannerImportRow[]) =>
  request<ScannerImportResult>('/api/imports/scanner', { method: 'POST', body: JSON.stringify(rows) })

// Schedules
export const generateSchedule = (date: string) =>
  request<Schedule>('/api/schedules/generate', { method: 'POST', body: JSON.stringify({ date }) })
export const getSchedule = (date: string) => request<Schedule>(`/api/schedules/${date}`)
export const getBandSheetUrl = (date: string) => `${BASE_URL}/api/schedules/${date}/pdf/band-sheet`
export const getShiftReportUrl = (date: string) => `${BASE_URL}/api/schedules/${date}/pdf/report`
