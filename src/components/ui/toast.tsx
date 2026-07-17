import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null

export function toast(type: ToastType, title: string, message?: string) {
  if (addToastFn) addToastFn({ type, title, message })
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'border-l-dark-success bg-dark-success/10 text-dark-success',
  error: 'border-l-dark-danger bg-dark-danger/10 text-dark-danger',
  warning: 'border-l-dark-warning bg-dark-warning/10 text-dark-warning',
  info: 'border-l-dark-primary bg-dark-primary/10 text-dark-primary',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[200] flex flex-col gap-3 max-w-sm w-full sm:w-auto pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-l-4 shadow-xl animate-slide-in-right',
              colors[t.type]
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t.title}</p>
              {t.message && <p className="text-xs mt-0.5 opacity-80">{t.message}</p>}
            </div>
            <button onClick={() => removeToast(t.id)} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}