import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon?: ReactNode
  iconBg?: string
  iconColor?: string
  label: ReactNode
  value: ReactNode
  unit: string
  trend?: ReactNode
  trendColor?: string
  secondaryText?: ReactNode
  centerRightElement?: ReactNode
  className?: string
}

export function StatCard({
  icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  label,
  value,
  unit,
  trend,
  trendColor,
  secondaryText,
  centerRightElement,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface dark:bg-dark-card border border-outline-variant dark:border-dark-border p-5 md:p-6 rounded-2xl flex flex-col justify-between h-full animate-fade-in shadow-sm select-none",
        className
      )}
    >
      {/* Top Header Row */}
      <div className="flex justify-between items-center mb-3">
        <div className="font-label-md font-semibold text-on-surface-variant dark:text-dark-text-muted">
          {label}
        </div>
        {trend && (
          <div className={cn('text-label-md font-bold', trendColor)}>
            {trend}
          </div>
        )}
      </div>

      {/* Main Metric Row: Value on Left, Small Icon in Center-Right Empty Space */}
      <div className="flex justify-between items-center gap-4 py-1">
        <div className="min-w-0">
          <h3 className="font-headline-lg text-headline-lg font-bold text-on-background dark:text-dark-text tracking-tight">
            {value} <span className="text-body-sm font-normal opacity-60 ml-1">{unit}</span>
          </h3>
        </div>

        {/* Small icon in center right side empty space */}
        {centerRightElement ? (
          <div className="flex-shrink-0">
            {centerRightElement}
          </div>
        ) : icon ? (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
            <div className={cn('w-5 h-5 flex items-center justify-center', iconColor)}>{icon}</div>
          </div>
        ) : null}
      </div>

      {/* Secondary Values Row */}
      {secondaryText && (
        <div className="text-label-md font-bold text-on-surface-variant/80 dark:text-dark-text-muted mt-2">
          {secondaryText}
        </div>
      )}
    </div>
  )
}