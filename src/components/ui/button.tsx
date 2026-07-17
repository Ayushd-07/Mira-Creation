import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const variantStyles = {
  primary:
    'bg-primary dark:bg-dark-primary text-on-primary hover:opacity-90 active:scale-[0.97] shadow-md hover:shadow-lg dark:shadow-dark-primary/20 transition-all duration-200 focus:ring-2 focus:ring-primary/50 dark:focus:ring-dark-primary/50 focus:ring-offset-2 dark:focus:ring-offset-dark-bg',
  secondary:
    'border border-outline-variant dark:border-dark-border text-on-surface-variant dark:text-dark-text-muted hover:bg-surface-container dark:hover:bg-dark-hover active:scale-[0.97] transition-all duration-200',
  ghost:
    'text-on-surface-variant dark:text-dark-text-muted hover:bg-surface-container dark:hover:bg-dark-hover active:scale-[0.97] transition-all duration-200',
  danger:
    'bg-danger text-on-error hover:opacity-90 active:scale-[0.97] transition-all duration-200 focus:ring-2 focus:ring-danger/50 focus:ring-offset-2 dark:focus:ring-offset-dark-bg',
}

const sizeStyles = {
  sm: 'px-3 py-2 text-label-md min-h-[36px]',
  md: 'px-4 py-2.5 text-body-md min-h-[44px]',
  lg: 'px-6 py-3 text-body-md min-h-[48px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, isLoading, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-bold rounded-xl outline-none',
          variantStyles[variant],
          sizeStyles[size],
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'