import { getToken } from '@/lib/auth'

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
  return res.json()
}

export const getBands = () => request<import('@/types').Band[]>('/api/bands/')

export const createBand = (name: string) =>
  request<import('@/types').Band>('/api/bands/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

export const deleteBand = (id: number) =>
  request<void>(`/api/bands/${id}`, { method: 'DELETE' })

export const upsertBandLoad = (bandId: number, date: string, packages: number) =>
  request<import('@/types').BandDailyLoad>(`/api/bands/${bandId}/load`, {
    method: 'PUT',
    body: JSON.stringify({ date, packages }),
  })

export const getWorkers = () => request<import('@/types').Worker[]>('/api/workers/')

export const createWorker = (name: string, capacity: number) =>
  request<import('@/types').Worker>('/api/workers/', {
    method: 'POST',
    body: JSON.stringify({ name, capacity }),
  })

export const updateWorker = (id: number, name: string, capacity: number) =>
  request<import('@/types').Worker>(`/api/workers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, capacity }),
  })

export const deleteWorker = (id: number) =>
  request<void>(`/api/workers/${id}`, { method: 'DELETE' })

export const upsertWorkerLoad = (workerId: number, date: string, packages_handled: number) =>
  request<void>(`/api/workers/${workerId}/load`, {
    method: 'PUT',
    body: JSON.stringify({ date, packages_handled }),
  })

export const generateSchedule = (date: string) =>
  request<import('@/types').Schedule>('/api/schedules/generate', {
    method: 'POST',
    body: JSON.stringify({ date }),
  })

export const getSchedule = (date: string) =>
  request<import('@/types').Schedule>(`/api/schedules/${date}`)

export const getSchedulePdfUrl = (date: string) =>
  `${BASE_URL}/api/schedules/${date}/pdf`
