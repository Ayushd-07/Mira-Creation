import React from 'react'
import { Factory } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/lib/services'

export function PageLoader() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: Infinity,
  })

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background dark:bg-dark-bg p-4 relative overflow-hidden select-none">
      {/* Subtle background glow */}
      <div className="absolute w-[360px] h-[360px] bg-primary/10 dark:bg-dark-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm animate-fade-in">
        {/* Animated Brand Logo Container */}
        <div className="relative w-20 h-20 rounded-2xl bg-surface dark:bg-dark-card border border-outline-variant/40 dark:border-dark-border/50 shadow-2xl flex items-center justify-center p-3">
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/50 dark:border-dark-primary/50 border-t-transparent animate-spin" />
          {settings?.logo ? (
            <img src={settings.logo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Factory className="w-9 h-9 text-primary dark:text-dark-primary animate-pulse" />
          )}
        </div>

        {/* Company Title */}
        <div className="space-y-1.5">
          <h1 className="font-display text-headline-md font-bold text-on-background dark:text-dark-text tracking-tight">
            {settings?.companyName || 'Mira Creation'}
          </h1>
          <p className="text-label-md text-on-surface-variant/80 dark:text-dark-text-muted/80 font-medium">
            Manufacturing Excellence Platform
          </p>
        </div>

        {/* Professional Loading Progress Bar */}
        <div className="w-52 space-y-2.5 pt-2">
          <div className="h-1.5 w-full bg-surface-container dark:bg-dark-border/60 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary via-indigo-500 to-primary dark:from-dark-primary dark:via-indigo-400 dark:to-dark-primary rounded-full animate-loading-bar" />
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant/70 dark:text-dark-text-muted/70 tracking-wider">
            Loading System Environment...
          </p>
        </div>
      </div>
    </div>
  )
}
