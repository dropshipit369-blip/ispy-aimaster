import { SCAN_MODES, type ScanMode } from './modes'

interface ModeBarProps {
  mode: ScanMode
  onChange: (mode: ScanMode) => void
  disabled?: boolean
}

/** The four scanning modes, styled as the gilded toolbar from the AI Scan & Flow design. */
export function ModeBar({ mode, onChange, disabled = false }: ModeBarProps) {
  return (
    <div role="tablist" aria-label="Scanning modes" className="grid grid-cols-4 px-3 py-1">
      {SCAN_MODES.map((item) => {
        const active = item.id === mode
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`mode-${item.id}`}
            aria-selected={active}
            aria-controls="scan-panel"
            disabled={disabled && !active}
            onClick={() => onChange(item.id)}
            className="group flex flex-col items-center border-none bg-transparent py-1 disabled:opacity-50"
            style={{ cursor: disabled && !active ? 'not-allowed' : 'pointer' }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
              style={{
                color: 'var(--ispy-gold)',
                filter: active ? 'drop-shadow(0 0 8px rgba(197, 168, 105, 0.6))' : undefined,
              }}
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6 transition-colors group-hover:text-[var(--ispy-gold-dark)]"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 1.6 : 1.4}
                viewBox="0 0 24 24"
              >
                {item.paths.map((d) => (
                  <path key={d} d={d} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
            </span>
            <span
              className="mt-0.5 pb-0.5 text-[13px] leading-tight tracking-wide"
              style={{
                fontFamily: 'var(--font-accent)',
                fontWeight: active ? 700 : 600,
                color: active ? 'var(--ispy-obsidian)' : 'var(--on-surface-variant)',
                borderBottom: `1px solid ${active ? 'rgba(197, 168, 105, 0.8)' : 'transparent'}`,
              }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
