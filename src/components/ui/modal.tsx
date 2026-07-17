import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-gutter"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="absolute inset-0 bg-on-background/40 dark:bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          'relative bg-surface dark:bg-dark-elevated w-full max-w-xl rounded-2xl shadow-2xl animate-fade-in-scale overflow-hidden border border-outline-variant dark:border-dark-border max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-outline-variant dark:border-dark-border flex items-center justify-between">
          <div className="pr-4">
            <h3 id="modal-title" className="font-headline-md text-headline-md text-on-background dark:text-dark-text">{title}</h3>
            {description && (
              <p className="text-label-md text-on-surface-variant dark:text-dark-text-muted mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant dark:text-dark-text-muted hover:text-danger dark:hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-dark-hover flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'px-6 sm:px-8 py-5 sm:py-6 bg-surface-container-low dark:bg-dark-secondary border-t border-outline-variant dark:border-dark-border flex flex-col sm:flex-row gap-3 justify-end [&>button]:w-full sm:[&>button]:w-auto',
        className
      )}
    >
      {children}
    </div>
  )
}