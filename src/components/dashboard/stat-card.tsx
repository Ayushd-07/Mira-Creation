import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ReactNode
  iconBg?: string
  iconColor?: string
  label: ReactNode
  value: ReactNode
  unit: string
  trend?: ReactNode
  trendColor?: string
  secondaryText?: ReactNode
  bgWatermark?: ReactNode
  rightElement?: ReactNode
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
  bgWatermark,
  rightElement,
  className,
}: StatCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden bg-surface dark:bg-dark-card border border-outline-variant dark:border-dark-border p-stack-lg rounded-xl flex flex-col justify-center h-full animate-fade-in transition-all duration-300 hover:shadow-lg",
      className
    )}>
      {/* Background Watermark Icon */}
      {bgWatermark && (
        <div className="absolute right-1 -bottom-2 pointer-events-none opacity-[0.08] dark:opacity-[0.14] transition-all duration-300 group-hover:opacity-25 group-hover:scale-105 z-0">
          {bgWatermark}
        </div>
      )}

      <div className="relative z-10 flex justify-between items-start mb-stack-md">
        <div className={cn('p-2.5 rounded-xl', iconBg)}>
          <div className={cn('w-5 h-5', iconColor)}>{icon}</div>
        </div>
        {trend && (
          <div className={cn('text-label-md font-bold', trendColor)}>{trend}</div>
        )}
      </div>

      <div className="relative z-10 flex justify-between items-end gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="font-label-md text-on-surface-variant dark:text-dark-text-muted">{label}</div>
          <h3 className="font-headline-lg text-headline-lg font-bold text-on-background dark:text-dark-text">
            {value} <span className="text-body-md font-normal opacity-60">{unit}</span>
          </h3>
          {secondaryText && (
            <div className="text-label-md font-bold text-on-surface-variant/80 dark:text-dark-text-muted mt-2">
              {secondaryText}
            </div>
          )}
        </div>
        {rightElement && (
          <div className="flex-shrink-0 ml-2 mb-1">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  )
}