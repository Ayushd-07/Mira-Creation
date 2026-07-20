import { api } from './api'
import type {
  Worker,
  IncomingEntry,
  OutgoingEntry,
  ProductionLog,
  Department,
  CompanySettings,
  User,
  Item,
} from '@/types'

export interface Paginated<T> {
  data: T[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

// ---- Auth ----
export async function login(email: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email, password })
  return data
}

export async function fetchMe() {
  const { data } = await api.get<{ user: User }>('/auth/me')
  return data.user
}

export async function forgotPassword(email: string) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data
}

// ---- Workers ----
export async function getWorkers(params: Record<string, any> = {}) {
  const { data } = await api.get<Paginated<Worker>>('/workers', { params })
  return data
}

export async function getWorkersAll() {
  const { data } = await api.get<Worker[]>('/workers/all')
  return data
}

export async function createWorker(payload: Partial<Worker>) {
  const { data } = await api.post<Worker>('/workers', payload)
  return data
}

export async function updateWorker(id: string, payload: Partial<Worker>) {
  const { data } = await api.put<Worker>(`/workers/${id}`, payload)
  return data
}

export async function updateWorkerStatus(id: string, status: string) {
  const { data } = await api.patch<Worker>(`/workers/${id}/status`, { status })
  return data
}

export async function deleteWorker(id: string) {
  const { data } = await api.delete(`/workers/${id}`)
  return data
}

// ---- Incoming ----
export async function getIncoming(params: Record<string, any> = {}) {
  const { data } = await api.get<Paginated<IncomingEntry>>('/incoming', { params })
  return data
}

export async function createIncoming(payload: Partial<IncomingEntry>) {
  const { data } = await api.post<IncomingEntry>('/incoming', payload)
  return data
}

export async function updateIncoming(id: string, payload: Partial<IncomingEntry>) {
  const { data } = await api.put<IncomingEntry>(`/incoming/${id}`, payload)
  return data
}

export async function deleteIncoming(id: string) {
  const { data } = await api.delete(`/incoming/${id}`)
  return data
}

export async function bulkDeleteIncoming(ids: string[]) {
  const { data } = await api.post('/incoming/bulk-delete', { ids })
  return data
}

// ---- Outgoing ----
export async function getOutgoing(params: Record<string, any> = {}) {
  const { data } = await api.get<Paginated<OutgoingEntry>>('/outgoing', { params })
  return data
}

export async function createOutgoing(payload: Partial<OutgoingEntry>) {
  const { data } = await api.post<OutgoingEntry>('/outgoing', payload)
  return data
}

export async function updateOutgoing(id: string, payload: Partial<OutgoingEntry>) {
  const { data } = await api.put<OutgoingEntry>(`/outgoing/${id}`, payload)
  return data
}

export async function deleteOutgoing(id: string) {
  const { data } = await api.delete(`/outgoing/${id}`)
  return data
}

export async function bulkDeleteOutgoing(ids: string[]) {
  const { data } = await api.post('/outgoing/bulk-delete', { ids })
  return data
}

// ---- Production ----
export async function getProduction(params: Record<string, any> = {}) {
  const { data } = await api.get<Paginated<ProductionLog>>('/production', { params })
  return data
}

export async function createProduction(payload: Partial<ProductionLog>) {
  const { data } = await api.post<ProductionLog>('/production', payload)
  return data
}

export async function updateProduction(id: string, payload: Partial<ProductionLog>) {
  const { data } = await api.put<ProductionLog>(`/production/${id}`, payload)
  return data
}

export async function deleteProduction(id: string) {
  const { data } = await api.delete(`/production/${id}`)
  return data
}

export async function bulkDeleteProduction(ids: string[]) {
  const { data } = await api.post('/production/bulk-delete', { ids })
  return data
}

// ---- Departments ----
export async function getDepartments() {
  const { data } = await api.get<Department[]>('/departments')
  return data
}

// ---- Settings ----
export async function getSettings() {
  const { data } = await api.get<CompanySettings>('/settings')
  // Ensure logo URL is absolute
  if (data.logo && !data.logo.startsWith('http')) {
    const baseUrl = import.meta.env.VITE_API_URL || ''
    data.logo = `${baseUrl}${data.logo}`
  }
  return data
}

export async function updateSettings(payload: Partial<CompanySettings>) {
  const { data } = await api.put<CompanySettings>('/settings', payload)
  return data
}

export async function uploadLogo(file: File) {
  const formData = new FormData()
  formData.append('logo', file)
  const { data } = await api.post<{ logoUrl: string }>('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function removeLogo() {
  const { data } = await api.delete('/settings/logo')
  return data
}

// ---- Dashboard ----
export interface DashboardStatsResponse {
  incomingToday: number
  outgoingToday: number
  incomingTodayPrice: number
  outgoingTodayPrice: number
  totalIncomingPrice: number
  totalOutgoingPrice: number
  workersActive: number
  productionEfficiency: number
  pendingWork: number
  completedWork: number
  lowStockAlerts: number
  workersOnDuty: number
  totalWorkers: number
  totalIncoming: number
  totalOutgoing: number
  totalProduction: number
  recentIncoming: IncomingEntry[]
  recentOutgoing: OutgoingEntry[]
}

export async function getDashboardStats() {
  const { data } = await api.get<DashboardStatsResponse>('/dashboard/stats')
  return data
}

// ---- Export (returns blob) ----
export async function exportFile(url: string) {
  const token = localStorage.getItem('mira-token')
  const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  let filename = match ? match[1] : ''
  
  if (!filename) {
    const cleanUrl = url.split('?')[0]
    const isCsv = cleanUrl.endsWith('csv')
    const isExcel = cleanUrl.endsWith('excel')
    const isPdf = cleanUrl.endsWith('pdf')
    const ext = isCsv ? 'csv' : isExcel ? 'xlsx' : isPdf ? 'pdf' : 'bin'
    filename = `incoming-stock-${new Date().toISOString().split('T')[0]}.${ext}`
  }

  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(href)
}

// ---- Item Master ----
export async function getItems(params: Record<string, any> = {}) {
  const { data } = await api.get<Paginated<Item>>('/items', { params })
  return data
}

export async function createItem(payload: Partial<Item>) {
  const { data } = await api.post<Item>('/items', payload)
  return data
}

export async function updateItem(id: string, payload: Partial<Item>) {
  const { data } = await api.put<Item>(`/items/${id}`, payload)
  return data
}

export async function deleteItem(id: string) {
  const { data } = await api.delete(`/items/${id}`)
  return data
}

export async function uploadItemImage(file: File) {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await api.post<{ imageUrl: string }>('/items/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ---- Backup & Security ----
export interface BackupStatusResponse {
  latestLog?: {
    id: string
    status: 'success' | 'failed'
    type: 'manual' | 'cron'
    recordCount: number
    fileCount: number
    error?: string | null
    startedAt: string
    completedAt: string
  } | null
}

export async function getBackupStatus() {
  const { data } = await api.get<BackupStatusResponse>('/backup/status')
  return data
}

export async function runManualBackup() {
  const { data } = await api.post('/backup/run', {}, { timeout: 180000 })
  return data
}