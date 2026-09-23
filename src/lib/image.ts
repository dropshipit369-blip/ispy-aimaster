const MAX_EDGE = 1280
const JPEG_QUALITY = 0.85
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/** Draws a frame or image to a JPEG data URL, max 1280px on the long edge. Re-encoding strips EXIF (incl. GPS). */
export function toJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot process photos.')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

/** Reads a user-chosen photo (JPEG, PNG, HEIC where supported, WebP) into a downscaled JPEG data URL. */
export async function fileToJpeg(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo (JPEG, PNG, HEIC or WebP).')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That photo is over 20 MB. Choose a smaller one.')
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      try {
        return toJpeg(bitmap, bitmap.width, bitmap.height)
      } finally {
        bitmap.close()
      }
    }
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      return toJpeg(image, image.naturalWidth, image.naturalHeight)
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    throw new Error('This photo could not be read. Try another one, or take a new photo.')
  }
}
