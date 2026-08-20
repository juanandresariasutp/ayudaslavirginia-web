const MAX_IMAGE_BYTES = 12 * 1024 * 1024 // 12 MB max initial size
const DEFAULT_MAX_SIDE = 1600 // Max width/height in pixels
const DEFAULT_QUALITY = 0.75 // WebP quality compression (0.0 to 1.0)

export interface ImageOptimizationOptions {
  maxSide?: number
  quality?: number
}

/**
 * Compresor y convertidor de imágenes a WebP en el cliente.
 * Reduce fotos de cámara móvil (10-15 MB) a archivos WebP ligeros (~150-300 KB).
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> {
  const maxSide = options.maxSide ?? DEFAULT_MAX_SIDE
  const quality = options.quality ?? DEFAULT_QUALITY

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La fotografía supera el tamaño máximo permitido de 12 MB.')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado debe ser una imagen (JPG, PNG, WebP, etc.).')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () =>
        reject(
          new Error(
            'No fue posible procesar la fotografía. Intenta con una imagen JPG, PNG o WebP válida.'
          )
        )
      element.src = objectUrl
    })

    // Calcular dimensiones escaladas manteniendo la relación de aspecto
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Este navegador o dispositivo no pudo procesar la imagen.')
    }

    // Dibujar en canvas con suavizado de alta calidad
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)

    // Exportar blob en formato WebP con compresión de calidad especificada
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/webp', quality)
    )

    if (!blob) {
      throw new Error('No se pudo convertir la imagen al formato WebP.')
    }

    // Asignar extensión .webp al archivo optimizado
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'fotografia'
    const webpFileName = `${baseName}.webp`

    return new File([blob], webpFileName, {
      type: 'image/webp',
      lastModified: Date.now()
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
