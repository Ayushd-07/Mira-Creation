import { useState, useRef, useEffect, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const autoId = useId()
  const selectId = id ?? autoId

  const isDark = document.documentElement.classList.contains('dark')

  const selected = options.find((o) => o.value === value)

  // Compute position from trigger button
  const computePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
    })
  }, [])

  function handleOpen() {
    if (disabled) return
    computePosition()
    setOpen((v) => !v)
  }

  // Reposition on scroll / resize
  useEffect(() => {
    if (!open) return
    function update() {
      computePosition()
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, computePosition])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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

  // Solid colors — no opacity tricks
  const panelBg = isDark ? '#1a2744' : '#ffffff'
  const panelBorder = isDark ? '#2d4a7a' : '#d1d5db'
  const itemTextNormal = isDark ? '#e2e8f0' : '#1e293b'
  const itemHoverBg = isDark ? '#243152' : '#f1f5f9'
  const itemActiveBg = isDark ? '#1e3a6e' : '#eff6ff'
  const itemActiveText = isDark ? '#60a5fa' : '#2563eb'
  const dotNormal = isDark ? '#475569' : '#cbd5e1'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-label-md font-semibold text-on-surface-variant dark:text-dark-text-muted tracking-wide uppercase"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleOpen}
        className={cn(
          'h-[48px] w-full flex items-center justify-between gap-2 px-4',
          'border-2 rounded-xl font-medium text-sm',
          'transition-all duration-200 cursor-pointer select-none outline-none',
          'bg-white dark:bg-[#131f35]',
          open
            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20'
            : 'border-gray-200 dark:border-[#2d4a7a] hover:border-blue-400/70 dark:hover:border-blue-400/60',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500',
        )}
      >
        <span
          className={cn(
            'truncate text-sm font-medium',
            selected
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-400 dark:text-[#64748b]',
          )}
        >
          {selected ? selected.label : placeholder ?? 'Select…'}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 flex-shrink-0 transition-transform duration-200',
            open
              ? 'rotate-180 text-blue-500 dark:text-blue-400'
              : 'text-gray-400 dark:text-[#64748b]',
          )}
        />
      </button>

      {/* Portal dropdown — renders at body to avoid overflow clipping */}
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={{
              ...dropdownStyle,
              background: panelBg,
              border: `1.5px solid ${panelBorder}`,
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: isDark
                ? '0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(96,165,250,0.08)'
                : '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
              animation: 'dropdownIn 0.15s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          >
            {/* Accent line */}
            <div
              style={{
                height: '2px',
                background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
              }}
            />
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: '6px 0',
                maxHeight: '240px',
                overflowY: 'auto',
              }}
              className="select-dropdown-list"
            >
              {displayItems.map((opt) => {
                const isPlaceholder = opt.value === '' && !!placeholder
                const isSelected = value === opt.value

                const itemBg = isSelected ? itemActiveBg : 'transparent'
                const itemText = isSelected
                  ? itemActiveText
                  : isPlaceholder
                  ? (isDark ? '#475569' : '#9ca3af')
                  : itemTextNormal

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !isPlaceholder && handleSelect(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: '2px 6px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      cursor: isPlaceholder ? 'default' : 'pointer',
                      background: itemBg,
                      color: itemText,
                      fontSize: '14px',
                      fontWeight: isSelected ? 600 : 500,
                      fontStyle: isPlaceholder ? 'italic' : 'normal',
                      opacity: isPlaceholder ? 0.6 : 1,
                      userSelect: 'none',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isPlaceholder) {
                        ;(e.currentTarget as HTMLLIElement).style.background = itemHoverBg
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isPlaceholder) {
                        ;(e.currentTarget as HTMLLIElement).style.background = 'transparent'
                      }
                    }}
                  >
                    {!isPlaceholder && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: isSelected ? '#3b82f6' : dotNormal,
                          transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                          transition: 'transform 0.15s ease, background 0.15s ease',
                        }}
                      />
                    )}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSelected && !isPlaceholder && (
                      <Check style={{ width: '14px', height: '14px', flexShrink: 0, color: '#3b82f6' }} />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>,
          document.body,
        )}

      {error && (
        <span style={{ fontSize: '12px', color: '#ef4444' }}>{error}</span>
      )}
    </div>
  )
}

Select.displayName = 'Select'