import { useState } from 'react'
import { Modal, ModalFooter } from './modal'
import { Button } from './button'
import { ItemLightbox } from './item-lightbox'
import { Image as ImageIcon } from 'lucide-react'
import { Item } from '@/types'

interface ItemPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  item: Item | null
}

export function ItemPreviewModal({ isOpen, onClose, item }: ItemPreviewModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!item) return null

  const displayImageUrl = item.itemImage
    ? item.itemImage.startsWith('http')
      ? item.itemImage
      : `${import.meta.env.VITE_API_URL || ''}${item.itemImage}`
    : null

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Item Details">
        <div className="p-6 space-y-6">
          <div className="flex justify-center">
            {displayImageUrl ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="w-48 h-48 rounded-xl overflow-hidden bg-surface-container-low dark:bg-dark-input border border-outline-variant dark:border-dark-border flex items-center justify-center cursor-zoom-in hover:opacity-90 transition-opacity focus:outline-none"
                title="Click to view full screen"
              >
                <img
                  src={displayImageUrl}
                  alt={item.itemName || item.itemCode}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className="w-48 h-48 rounded-xl overflow-hidden bg-surface-container-low dark:bg-dark-input border border-outline-variant dark:border-dark-border flex items-center justify-center text-on-surface-variant/40 dark:text-dark-text-muted/40">
                <ImageIcon className="w-12 h-12" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-body-md">
            <div>
              <p className="text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted">Item Code</p>
              <p className="font-code text-code mt-1 text-primary dark:text-dark-primary font-bold">{item.itemCode}</p>
            </div>
            <div>
              <p className="text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted">Item Name</p>
              <p className="mt-1 text-on-surface dark:text-dark-text">{item.itemName || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted">Fabric Name</p>
              <p className="mt-1 text-on-surface dark:text-dark-text">{item.fabricName}</p>
            </div>
            <div className="col-span-2">
              <p className="text-label-md font-bold text-on-surface-variant dark:text-dark-text-muted">Remark</p>
              <p className="mt-1 text-on-surface dark:text-dark-text opacity-95">{item.remark || '-'}</p>
            </div>
          </div>
          {/* Footer removed to match streamlined preview design */}
        </div>
      </Modal>

      {displayImageUrl && (
        <ItemLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={displayImageUrl}
          altText={item.itemName || item.itemCode}
        />
      )}
    </>
  )
}
