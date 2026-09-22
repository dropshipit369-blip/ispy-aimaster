import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

interface CameraCaptureProps {
  open: boolean
  onClose: () => void
  /** Receives a downscaled JPEG data URL (max 1280px on the long edge, EXIF stripped). */
  onCapture: (imageDataUrl: string) => void
}

type CameraStatus = 'starting' | 'live' | 'denied' | 'unavailable'

const MAX_EDGE = 1280
const JPEG_QUALITY = 0.85
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

function toJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot process photos.')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

async function fileToJpeg(file: File): Promise<string> {
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
}

/** Full-screen camera with a photo-library fallback. Photos are re-encoded in the browser before upload. */
export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<CameraStatus>('starting')
  const [problem, setProblem] = useState<string | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => undefined)
        }
        setStatus('live')
      } catch (err) {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ''
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
      }
    }

    void start()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelled = true
      window.removeEventListener('keydown', onKey)
      stopStream()
    }
  }, [open, stopStream])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setProblem('The camera is still starting. Try again in a moment.')
      return
    }
    try {
      const image = toJpeg(video, video.videoWidth, video.videoHeight)
      stopStream()
      onCapture(image)
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not capture the photo.')
    }
  }

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProblem('Choose a photo (JPEG, PNG, HEIC or WebP).')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setProblem('That photo is over 20 MB. Choose a smaller one.')
      return
    }
    try {
      const image = await fileToJpeg(file)
      stopStream()
      onCapture(image)
    } catch {
      setProblem('This photo could not be read. Try another one, or take a new photo.')
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photograph an item"
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: '#000' }}
    >
      <div
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', color: '#fff' }}
      >
        <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
          Photograph one item
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="flex h-10 w-10 items-center justify-center rounded-full border-none"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ display: status === 'live' ? 'block' : 'none' }}
        />
        {status !== 'live' && (
          <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center" style={{ color: '#fff' }}>
            <Icon
              name={status === 'starting' ? 'photo_camera' : 'no_photography'}
              size={44}
              style={{ opacity: 0.8, animation: status === 'starting' ? 'pulse-glow 1.5s ease-in-out infinite' : 'none' }}
            />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {status === 'starting' && 'Starting camera…'}
              {status === 'denied' && 'Camera access is blocked. Allow it in your browser settings, or choose a photo instead.'}
              {status === 'unavailable' && 'No camera is available here. Choose a photo from your device instead.'}
            </p>
          </div>
        )}
        {status === 'live' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-8 rounded-[var(--radius-xl)]"
            style={{ border: '2px solid rgba(255,255,255,0.55)' }}
          />
        )}
      </div>

      <div
        className="flex flex-col gap-3 px-5 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', color: '#fff' }}
      >
        {problem && (
          <p role="alert" className="text-center text-sm" style={{ color: '#ffb4ab' }}>
            {problem}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" style={{ color: '#fff' }} onClick={() => fileRef.current?.click()}>
            <Icon name="photo_library" size={20} /> Upload
          </Button>
          <button
            type="button"
            onClick={capture}
            disabled={status !== 'live'}
            aria-label="Take photo"
            className="h-[72px] w-[72px] rounded-full"
            style={{
              background: status === 'live' ? '#fff' : 'rgba(255,255,255,0.3)',
              border: '4px solid rgba(255,255,255,0.45)',
              boxShadow: '0 0 0 3px #000 inset',
              cursor: status === 'live' ? 'pointer' : 'not-allowed',
            }}
          />
          <span className="w-[88px]" aria-hidden="true" />
        </div>
        <p className="text-center text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Your photo is sent to our AI provider to identify the item. iSpy doesn't store it.
        </p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  )
}
