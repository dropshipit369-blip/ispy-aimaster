import { type ReactNode } from 'react'

interface ScanViewfinderProps {
  children?: ReactNode
  showLaser?: boolean
  className?: string
}

export function ScanViewfinder({ children, showLaser = true, className = '' }: ScanViewfinderProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-xl)] ${className}`}
      style={{
        aspectRatio: '4/3',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => {
        const [vPos, hPos] = pos.split('-')
        return (
          <div
            key={pos}
            className="absolute z-10"
            style={{
              [vPos]: 8,
              [hPos]: 8,
              width: 24,
              height: 24,
              borderColor: 'var(--primary-container)',
              borderStyle: 'solid',
              borderWidth: 0,
              ...(vPos === 'top' ? { borderTopWidth: 2 } : { borderBottomWidth: 2 }),
              ...(hPos === 'left' ? { borderLeftWidth: 2 } : { borderRightWidth: 2 }),
              borderRadius: pos === 'top-left' ? '6px 0 0 0'
                : pos === 'top-right' ? '0 6px 0 0'
                : pos === 'bottom-left' ? '0 0 0 6px'
                : '0 0 6px 0',
            }}
          />
        )
      })}

      {showLaser && (
        <div
          className="absolute left-2 right-2 z-10 h-0.5"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, var(--primary-container) 20%, var(--primary) 50%, var(--primary-container) 80%, transparent 100%)',
            boxShadow: '0 0 12px var(--primary-glow, rgba(197,168,105,0.3))',
            animation: 'scan-line 3s ease-in-out infinite',
          }}
        />
      )}

      {children}
    </div>
  )
}
