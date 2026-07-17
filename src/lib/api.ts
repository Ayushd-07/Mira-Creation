import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const TOKEN_KEY = 'mira-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export interface ApiError {
  error: string
  code?: string
  details?: { path: string; message: string }[]
}

function stringifyUnknown(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Error) return value.message
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          // Common validation error shapes: { message }, { path, message }
          if (typeof obj.message === 'string') {
            return obj.path ? `${String(obj.path)}: ${obj.message}` : obj.message
          }
          return stringifyUnknown(obj)
        }
        return stringifyUnknown(item)
      })
      .filter(Boolean)
      .join('; ')
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    // Prefer a readable message field if present
    if (typeof obj.message === 'string' && obj.message) return obj.message
    if (typeof obj.error === 'string' && obj.error) return obj.error
    // Fall back to joining any string values
    const parts = Object.values(obj)
      .map((v) => stringifyUnknown(v))
      .filter(Boolean)
    if (parts.length) return parts.join(' ')
    try {
      return JSON.stringify(value)
    } catch {
      return 'Something went wrong'
    }
  }
  return String(value)
}

export function getErrorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: unknown; status?: number }
    message?: unknown
    request?: unknown
  }
  // Axios-style error: error.response.data may be a string, object, or array
  if (e?.response?.data !== undefined && e.response.data !== null) {
    const msg = stringifyUnknown(e.response.data)
    if (msg) return msg
  }
  if (e?.message !== undefined && e.message !== null) {
    const msg = stringifyUnknown(e.message)
    if (msg) return msg
  }
  if (e?.request) return 'No response from server. Please check your connection.'
  return 'Something went wrong'
}
