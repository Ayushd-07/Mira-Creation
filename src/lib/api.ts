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

export function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: ApiError }; message?: string }
  if (e?.response?.data?.error) return e.response.data.error
  if (e?.message) return e.message
  return 'Something went wrong'
}