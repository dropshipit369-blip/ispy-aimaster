import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { toJpeg } from '@/lib/image'
import { getBarcodeDetector, gtinFromDetection } from '@/services/barcode'

export type CameraPurpose = 'photo' | 'barcode'
type CameraStatus = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable'

interface LiveViewfinderProps {
  /** Run the rear camera inside the card. Null keeps it off. */
  camera: CameraPurpose | null
  /** A captured or uploaded photo to show instead of the camera. */
  image?: string | null
  /** Shown over the card while identifying or pricing. */
  busyLabel?: string | null
  /** The glass results card anchored to the bottom of the viewfinder. */
  hud?: ReactNode
  /** Content for the card when there is no camera or photo (e.g. the name search prompt). */
  placeholder?: ReactNode
  onCapture?: (imageDataUrl: string) => void
  onBarcode?: (gtin: string) => void
  /** Label for the shutter button (accessibility). */
  captureLabel?: string
}

const RETICLE: { pos: 'tl' | 'tr' | 'bl' | 'br'; style: React.CSSProperties }[] = [
  { pos: 'tl', style: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 12 } },
  { pos: 'tr', style: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 12 } },
  { pos: 'bl', style: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 12 } },
  { pos: 'br', style: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 12 } },
]

/** Golden-ratio grid and Fibonacci arcs from the AI Scan & Flow design. */
function GoldenOverlay() {
  return (
    <svg
      aria-hidden="true"
      className="glow-gold pointer-events-none absolute inset-0 h-full w-full p-3"
      fill="none"
      viewBox="0 0 400 400"
    >
      <circle cx="200" cy="200" r="160" stroke="#f6e7bc" strokeOpacity="0.95" strokeWidth="1.6" />
      <line stroke="#eedb9c" strokeOpacity="0.85" strokeWidth="1.1" x1="40" x2="360" y1="200" y2="200" />
      <line stroke="#eedb9c" strokeOpacity="0.85" strokeWidth="1.1" x1="225" x2="225" y1="40" y2="360" />
      <line stroke="#eedb9c" strokeOpacity="0.8" strokeWidth="0.9" x1="225" x2="360" y1="170" y2="170" />
      <line stroke="#eedb9c" strokeOpacity="0.8" strokeWidth="0.8" x1="272" x2="272" y1="170" y2="225" />
      <path d="M 40,200 A 160,160 0 0,1 200,40" stroke="#f9ecc8" strokeOpacity="0.9" strokeWidth="1.5" />
      <path d="M 200,40 A 160,160 0 0,1 360,200" stroke="#f9ecc8" strokeOpacity="0.9" strokeWidth="1.4" />
      <path d="M 360,200 A 135,135 0 0,1 225,335" stroke="#eedb9c" strokeOpacity="0.85" strokeWidth="1.3" />
      <path d="M 225,335 A 85,85 0 0,1 140,250" stroke="#eedb9c" strokeOpacity="0.8" strokeWidth="1.2" />
      <path d="M 140,250 A 55,55 0 0,1 195,195" stroke="#eedb9c" strokeOpacity="0.8" strokeWidth="1.1" />
      <path d="M 195,195 A 35,35 0 0,1 230,230" stroke="#e4cd98" strokeOpacity="0.75" strokeWidth="1" />
      <path d="M 230,230 A 22,22 0 0,1 252,208" stroke="#e4cd98" strokeOpacity="0.75" strokeWidth="0.9" />
    </svg>
  )
}

/**
 * The hero viewfinder card: live rear camera (or a still photo) framed by gold reticle corners,
 * the golden-ratio overlay and a pulsing aura ring, with the results HUD docked at the bottom.
 * In barcode mode it reads UPC/EAN/ISBN codes continuously and reports the first valid one.
 */
export function LiveViewfinder({
  camera,
  image,
  busyLabel,
  hud,
  placeholder,
  onCapture,
  onBarcode,
  captureLabel = 'Capture and price this item',
}: LiveViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraStatus, setStatus] = useState<CameraStatus>('idle')
  const [problem, setProblem] = useState<string | null>(null)
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden')
  const onBarcodeRef = useRef(onBarcode)

  useEffect(() => {
    onBarcodeRef.current = onBarcode
  }, [onBarcode])

  // Release the camera while the app is in the background.
  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const wantCamera = camera !== null && !image && pageVisible
  const status: CameraStatus = wantCamera ? cameraStatus : 'idle'

  useEffect(() => {
    if (!wantCamera) return
    let cancelled = false
    const stop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      // Never let a restart read the previous stream's 'live' status (stale frame, stale barcode).
      setStatus('idle')
    }

    async function start() {
      setProblem(null)
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        return
      }
      setStatus('starting')
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
        if (cancelled) return
        setStatus('live')
      } catch (err) {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ''
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
      }
    }

    void start()
    return () => {
      cancelled = true
      stop()
    }
  }, [wantCamera])

  // Continuous barcode reading, ~4 frames a second, until one valid code is found.
  useEffect(() => {
    if (camera !== 'barcode' || status !== 'live' || busyLabel) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    getBarcodeDetector()
      .then((detector) => {
        const tick = async () => {
          if (stopped) return
          const video = videoRef.current
          if (video && video.readyState >= 2) {
            try {
              const codes = await detector.detect(video)
              for (const code of codes) {
                const gtin = gtinFromDetection(code)
                if (gtin && !stopped) {
                  stopped = true
                  navigator.vibrate?.(40)
                  onBarcodeRef.current?.(gtin)
                  return
                }
              }
            } catch {
              // A single unreadable frame is normal; keep scanning.
            }
          }
          timer = setTimeout(tick, 250)
        }
        void tick()
      })
      .catch(() => setProblem('Barcode reading isn’t available in this browser. Type the number under the barcode instead.'))

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [camera, status, busyLabel])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setProblem('The camera is still starting. Try again in a moment.')
      return
    }
    try {
      onCapture?.(toJpeg(video, video.videoWidth, video.videoHeight))
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not capture the photo.')
    }
  }, [onCapture])

  const showVideo = wantCamera && status === 'live'
  const cameraMessage =
    camera && !image
      ? status === 'starting'
        ? 'Starting camera…'
        : status === 'denied'
          ? 'Camera access is blocked. Allow it in your browser settings, or use the options below.'
          : status === 'unavailable'
            ? 'No camera is available here. Use the options below instead.'
            : null
      : null

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: '4 / 4.1',
        maxWidth: '100%',
        borderRadius: 'var(--radius-viewfinder)',
        background: '#595551',
        border: '1px solid rgba(214, 211, 209, 0.4)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label={camera === 'barcode' ? 'Camera view for barcode scanning' : 'Camera view'}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ display: showVideo ? 'block' : 'none', filter: 'brightness(0.92) contrast(1.05)' }}
      />
      {image && (
        <img
          src={image}
          alt="The item you scanned"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.92) contrast(1.05)' }}
        />
      )}
      {!showVideo && !image && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(at 30% 25%, rgba(228, 205, 152, 0.28) 0px, transparent 55%), radial-gradient(at 75% 80%, rgba(43, 88, 118, 0.35) 0px, transparent 60%), linear-gradient(160deg, #6b655f 0%, #3e3a36 100%)',
          }}
        />
      )}

      {/* Soft vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent 45%, rgba(0,0,0,0.6))' }}
      />

      {/* Reticle corners */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-4">
        {RETICLE.map(({ pos, style }) => (
          <div
            key={pos}
            className="absolute h-8 w-8"
            style={{ ...style, borderColor: 'var(--ispy-gold-light)', borderStyle: 'solid', opacity: 0.9 }}
          />
        ))}
      </div>

      {camera === 'barcode' && showVideo ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-[38%] h-[24%]">
          <div
            className="h-full w-full rounded-xl"
            style={{ border: '1.5px solid rgba(246, 231, 188, 0.9)', boxShadow: '0 0 24px rgba(228, 205, 152, 0.45)' }}
          />
          <div
            className="absolute inset-x-3 h-0.5"
            style={{
              background: 'linear-gradient(90deg, transparent, #f6e7bc, transparent)',
              animation: 'scan-line 2.4s ease-in-out infinite',
            }}
          />
        </div>
      ) : (
        <>
          <GoldenOverlay />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="animate-aura h-[68%] w-[68%] rounded-full"
              style={{ border: '1px solid rgba(252, 211, 77, 0.3)', boxShadow: 'inset 0 0 40px rgba(230, 195, 115, 0.35)' }}
            />
          </div>
        </>
      )}

      {/* Centre content: prompts, camera states, progress */}
      {(busyLabel || cameraMessage || (!camera && !image && !hud && placeholder)) && (
        <div className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 text-center">
          {busyLabel ? (
            <>
              <Icon name="radar" size={40} style={{ color: '#f6e7bc', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
              <p role="status" className="text-sm font-medium" style={{ color: '#fef3c7', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {busyLabel}
              </p>
            </>
          ) : cameraMessage ? (
            <p role="status" className="text-sm leading-relaxed" style={{ color: '#fef3c7', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {cameraMessage}
            </p>
          ) : (
            placeholder
          )}
        </div>
      )}

      {camera === 'barcode' && showVideo && !busyLabel && (
        <p
          className="absolute inset-x-6 top-[20%] text-center text-xs font-medium tracking-wide"
          style={{ color: '#fef3c7', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
        >
          Line the barcode up inside the frame
        </p>
      )}

      {camera === 'photo' && showVideo && !busyLabel && !hud && (
        <button
          type="button"
          onClick={capture}
          aria-label={captureLabel}
          className="absolute bottom-5 left-1/2 flex h-[68px] w-[68px] -translate-x-1/2 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #fff8e1, #e4cd98 55%, #c5a869)',
            border: '3px solid rgba(255, 253, 249, 0.85)',
            boxShadow: '0 0 0 1px rgba(153, 122, 56, 0.6), 0 8px 24px rgba(0,0,0,0.45), 0 0 22px rgba(228, 205, 152, 0.6)',
            cursor: 'pointer',
          }}
        >
          <Icon name="bolt" size={28} fill style={{ color: 'var(--ispy-gold-ink)' }} />
        </button>
      )}

      {problem && (
        <p
          role="alert"
          className="absolute inset-x-4 top-4 rounded-lg px-3 py-2 text-center text-xs"
          style={{ background: 'rgba(26, 24, 22, 0.8)', color: '#fde68a' }}
        >
          {problem}
        </p>
      )}

      {hud && <div className="absolute inset-x-3 bottom-3">{hud}</div>}
    </div>
  )
}
