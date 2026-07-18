import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ReactNode
  iconBg?: string
  iconColor?: string
  label: string
  value: string
  unit: string
  trend?: string
  trendColor?: string
  secondaryText?: string
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
}: StatCardProps) {
  return (
    <div className="bg-surface dark:bg-dark-card border border-outline-variant dark:border-dark-border p-stack-lg rounded-xl flex flex-col justify-center h-full animate-fade-in">
      <div className="flex justify-between items-start mb-stack-md">
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <div className={cn('w-5 h-5', iconColor)}>{icon}</div>
        </div>
        {trend && (
          <span className={cn('text-label-md font-bold', trendColor)}>{trend}</span>
        )}
      </div>
      <div className="space-y-1">
        <p className="font-label-md text-on-surface-variant dark:text-dark-text-muted">{label}</p>
        <h3 className="font-headline-lg text-headline-lg font-bold text-on-background dark:text-dark-text">
          {value} <span className="text-body-md font-normal opacity-60">{unit}</span>
        </h3>
        {secondaryText && (
          <p className="text-label-md font-bold text-on-surface-variant/80 dark:text-dark-text-muted mt-1">
            {secondaryText}
          </p>
        )}
      </div>
    </div>
  )
}