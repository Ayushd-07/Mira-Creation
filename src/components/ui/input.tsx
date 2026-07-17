import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          className={cn(
            'h-[48px] w-full bg-surface-container-low dark:bg-dark-input border border-outline-variant dark:border-dark-border rounded-xl px-4 text-body-md text-on-surface dark:text-dark-text',
            'focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary outline-none transition-all',
            'placeholder:text-on-surface-variant/50 dark:placeholder:text-dark-text-muted/50',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-label-md text-error">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'