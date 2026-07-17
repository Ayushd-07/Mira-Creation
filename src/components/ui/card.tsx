import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface dark:bg-dark-card border border-outline-variant dark:border-dark-border rounded-xl overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('p-4 sm:p-gutter border-b border-outline-variant dark:border-dark-border flex justify-between items-center', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('p-4 sm:p-gutter', className)} {...props}>
      {children}
    </div>
  )
}