import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'h-[48px] w-full bg-surface-container-low dark:bg-dark-input border border-outline-variant dark:border-dark-border rounded-xl px-4 text-body-md text-on-surface dark:text-dark-text appearance-none',
              'focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary focus:border-primary dark:focus:border-dark-primary outline-none transition-all',
              'pr-10',
              error && 'border-error focus:ring-error',
              className
            )}
            {...props}
          >
            {placeholder && <option value="" className="dark:bg-dark-input">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="dark:bg-dark-input">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant dark:text-dark-text-muted pointer-events-none" />
        </div>
        {error && (
          <span className="text-label-md text-error">{error}</span>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'