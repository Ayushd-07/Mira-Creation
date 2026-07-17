import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { User, UserRole } from '@/types'
import { api, getToken, setToken, clearToken } from '@/lib/api'
import { login as loginApi, fetchMe } from '@/lib/services'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { token, user: u } = await loginApi(email, password)
      setToken(token)
      setUser(u)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    delete api.defaults.headers.common['Authorization']
  }, [])

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false
      return roles.includes(user.role)
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}