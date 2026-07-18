import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, Printer, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from './button'
import { toast } from './toast'
import { cn } from '@/lib/utils'

interface ExportDropdownProps {
  onExportCSV: () => void
  onExportExcel?: () => void
  onExportPDF?: () => void
  onPrint?: () => void
  disabled?: boolean
  className?: string
}

export function ExportDropdown({
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onPrint,
  disabled,
  className,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async (type: string, action: () => void) => {
    setExporting(type)
    try {
      await new Promise((r) => setTimeout(r, 500))
      action()
      toast('success', `${type} exported successfully`, `Your file has been downloaded.`)
    } catch {
      toast('error', 'Export failed', 'Please try again.')
    } finally {
      setExporting(null)
      setIsOpen(false)
    }
  }

  const items = [
    { id: 'csv', label: 'Export CSV', icon: FileSpreadsheet, action: onExportCSV },
    ...(onExportExcel ? [{ id: 'excel', label: 'Export Excel (.xlsx)', icon: FileSpreadsheet, action: onExportExcel }] : []),
    ...(onExportPDF ? [{ id: 'pdf', label: 'Export PDF', icon: FileText, action: onExportPDF }] : []),
    { id: 'print', label: 'Print', icon: Printer, action: onPrint || (() => window.print()) },
  ]

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <Button
        variant="secondary"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || !!exporting}
        className="gap-1"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Export
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface dark:bg-dark-elevated border border-outline-variant dark:border-dark-border rounded-xl shadow-xl z-20 py-1.5 animate-fade-in-scale">
            {items.map((item) => {
              const Icon = item.icon
              const isLoading = exporting === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleExport(item.id, item.action)}
                  disabled={!!exporting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-body-md text-on-surface-variant dark:text-dark-text-muted hover:bg-surface-container dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {item.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}