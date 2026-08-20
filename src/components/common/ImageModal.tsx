import { useEffect } from 'react'
import type { ImagePreview } from '../../types'

interface ImageModalProps {
  image: ImagePreview
  close: () => void
}

export function ImageModal({ image, close }: ImageModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [close])

  return (
    <div className="image-modal-backdrop" role="presentation" onMouseDown={close}>
      <section
        className="image-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Vista ampliada de fotografía"
        onMouseDown={event => event.stopPropagation()}
      >
        <button className="image-modal-close" aria-label="Cerrar imagen" onClick={close}>
          ×
        </button>
        <img src={image.url} alt={image.alt} />
        <p>{image.alt}</p>
      </section>
    </div>
  )
}
