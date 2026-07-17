import { AlertTriangle } from 'lucide-react'
import { Modal, ModalFooter } from './modal'
import { Button } from './button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="p-3 rounded-full bg-danger/10">
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <p className="text-body-md text-on-surface-variant dark:text-dark-text-muted max-w-sm">
            {message}
          </p>
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  )
}