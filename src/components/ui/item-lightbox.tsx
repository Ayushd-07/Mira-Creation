import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ItemLightboxProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  altText?: string
}

export function ItemLightbox({ isOpen, onClose, imageUrl, altText }: ItemLightboxProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in w-screen h-screen overflow-hidden">
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-zoom-out" onClick={onClose} />
      
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] p-2.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95"
        title="Close Preview (Esc)"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Large Image container */}
      <div className="relative z-[105] w-full h-full flex items-center justify-center">
        <img
          src={imageUrl}
          alt={altText || 'Preview'}
          className="w-full h-full object-contain select-none"
        />
      </div>
    </div>
  )
}
