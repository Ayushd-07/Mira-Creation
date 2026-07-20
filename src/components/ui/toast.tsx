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

const toastVariants = {
  success: {
    icon: CheckCircle,
    border: 'border-l-4 border-l-emerald-500',
    iconColor: 'text-emerald-500 bg-emerald-500/10',
  },
  error: {
    icon: XCircle,
    border: 'border-l-4 border-l-rose-500',
    iconColor: 'text-rose-500 bg-rose-500/10',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-l-4 border-l-amber-500',
    iconColor: 'text-amber-500 bg-amber-500/10',
  },
  info: {
    icon: Info,
    border: 'border-l-4 border-l-sky-500',
    iconColor: 'text-sky-500 bg-sky-500/10',
  },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 6000)
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="fixed top-4 inset-x-4 md:inset-x-auto md:right-4 z-[200] flex flex-col gap-3 max-w-md mx-auto md:mx-0 w-[calc(100%-2rem)] md:w-96 pointer-events-none">
      {toasts.map((t) => {
        const style = toastVariants[t.type]
        const Icon = style.icon
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 animate-slide-in-right transition-all',
              style.border
            )}
          >
            <div className={cn('p-1.5 rounded-lg flex-shrink-0 mt-0.5', style.iconColor)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{t.title}</p>
              {t.message && (
                <p className="text-xs mt-1 text-slate-600 dark:text-slate-300 break-words leading-relaxed font-medium">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}