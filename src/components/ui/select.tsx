import { useState, useRef, useEffect, useId } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  required?: boolean
  disabled?: boolean
  className?: string
  id?: string
}

export function Select({
  className,
  label,
  error,
  options,
  placeholder,
  value,
  onChange,
  required,
  disabled,
  id,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoId = useId()
  const selectId = id ?? autoId

  const selected = options.find((o) => o.value === value)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleSelect(val: string) {
    onChange?.({ target: { value: val } })
    setOpen(false)
  }

  const displayItems = placeholder
    ? [{ value: '', label: placeholder }, ...options]
    : options

  return (
    <div className={cn('flex flex-col gap-1.5', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-label-md font-semibold text-on-surface-variant dark:text-dark-text-muted tracking-wide uppercase"
        >
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div className="relative">
        <button
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={cn(
            'h-[48px] w-full flex items-center justify-between gap-2 px-4',
            'bg-white dark:bg-dark-input',
            'border-2 rounded-xl font-medium text-body-md',
            'transition-all duration-200 cursor-pointer select-none',
            open
              ? 'border-primary dark:border-dark-primary ring-2 ring-primary/20 dark:ring-dark-primary/20'
              : 'border-gray-200 dark:border-dark-border hover:border-primary/50 dark:hover:border-dark-primary/50',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-danger focus:ring-danger/20',
          )}
        >
          <span
            className={cn(
              'truncate',
              selected
                ? 'text-on-surface dark:text-dark-text'
                : 'text-on-surface-variant/60 dark:text-dark-text-muted/60',
            )}
          >
            {selected ? selected.label : placeholder ?? 'Select…'}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 flex-shrink-0 text-gray-400 dark:text-dark-text-muted transition-transform duration-200',
              open && 'rotate-180 text-primary dark:text-dark-primary',
            )}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            role="listbox"
            className={cn(
              'absolute z-50 left-0 right-0 mt-1.5',
              'bg-white dark:bg-dark-card',
              'border border-gray-100 dark:border-dark-border',
              'rounded-xl shadow-2xl overflow-hidden',
              'animate-dropdown',
            )}
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)' }}
          >
            <ul className="py-1.5 max-h-60 overflow-y-auto scrollbar-thin">
              {displayItems.map((opt) => {
                const isPlaceholder = opt.value === '' && !!placeholder
                const isSelected = value === opt.value

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'flex items-center gap-3 mx-1.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
                      'text-body-md font-medium select-none',
                      isPlaceholder
                        ? 'text-on-surface-variant/50 dark:text-dark-text-muted/50 text-sm italic'
                        : isSelected
                        ? 'bg-primary/10 dark:bg-dark-primary/15 text-primary dark:text-dark-primary'
                        : 'text-on-surface dark:text-dark-text hover:bg-surface-container dark:hover:bg-dark-hover/60',
                    )}
                  >
                    {/* Leading dot accent for non-placeholder */}
                    {!isPlaceholder && (
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0 transition-all duration-150',
                          isSelected
                            ? 'bg-primary dark:bg-dark-primary scale-125'
                            : 'bg-gray-300 dark:bg-dark-border',
                        )}
                      />
                    )}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && !isPlaceholder && (
                      <Check className="w-3.5 h-3.5 flex-shrink-0 text-primary dark:text-dark-primary" />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {error && <span className="text-label-md text-danger">{error}</span>}
    </div>
  )
}

Select.displayName = 'Select'