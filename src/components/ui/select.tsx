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
            'bg-white dark:bg-[#1e293b]',
            'border-2 rounded-xl font-medium text-body-md',
            'transition-all duration-200 cursor-pointer select-none',
            open
              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/25 dark:ring-blue-400/25'
              : 'border-gray-200 dark:border-[#334155] hover:border-blue-400/60 dark:hover:border-blue-400/50',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-red-500',
          )}
        >
          <span
            className={cn(
              'truncate text-sm font-medium',
              selected
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500',
            )}
          >
            {selected ? selected.label : placeholder ?? 'Select…'}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-transform duration-200',
              open
                ? 'rotate-180 text-blue-500 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500',
            )}
          />
        </button>

        {/* Dropdown panel — uses inline styles for guaranteed solid background */}
        {open && (
          <div
            role="listbox"
            className="absolute z-[9999] left-0 right-0 mt-1.5 rounded-xl overflow-hidden animate-dropdown"
            style={{
              background: 'var(--select-bg, #ffffff)',
              border: '1.5px solid var(--select-border, #e2e8f0)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            {/* Inner glow line at top */}
            <div
              className="h-[2px] w-full"
              style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)' }}
            />

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
                      'flex items-center gap-3 mx-1.5 px-3 py-2.5 rounded-lg cursor-pointer',
                      'text-sm font-medium select-none',
                      'transition-colors duration-100',
                      isPlaceholder
                        ? 'opacity-50 italic cursor-default'
                        : isSelected
                        ? 'select-item-active'
                        : 'select-item-normal',
                    )}
                  >
                    {!isPlaceholder && (
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0 transition-all duration-150',
                          isSelected ? 'scale-125' : '',
                        )}
                        style={{
                          background: isSelected ? '#3b82f6' : 'var(--select-dot, #cbd5e1)',
                        }}
                      />
                    )}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && !isPlaceholder && (
                      <Check className="w-3.5 h-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  )
}

Select.displayName = 'Select'