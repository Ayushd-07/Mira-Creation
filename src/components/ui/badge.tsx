import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

const badgeVariants = {
  default: 'bg-surface-container-highest dark:bg-dark-secondary text-on-surface-variant dark:text-dark-text-muted',
  primary: 'bg-primary/10 dark:bg-dark-primary/20 text-primary dark:text-dark-primary border border-primary/10 dark:border-dark-primary/20',
  secondary: 'bg-secondary-container dark:bg-secondary-container/20 text-on-secondary-container dark:text-dark-text',
  success: 'bg-success/10 dark:bg-dark-success/20 text-success dark:text-dark-success border border-success/10 dark:border-dark-success/20',
  warning: 'bg-warning/10 dark:bg-dark-warning/20 text-warning dark:text-dark-warning border border-warning/10 dark:border-dark-warning/20',
  danger: 'bg-danger/10 dark:bg-dark-danger/20 text-danger dark:text-dark-danger border border-danger/10 dark:border-dark-danger/20',
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}