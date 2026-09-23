interface ScanHudProps {
  /** Short tag line, e.g. "92% AI match • Nike Dunk Low". */
  tag: string
  headline: { label: string; value: string }
  lines: { label: string; value: string; tone?: 'gold' | 'green' | 'plain' }[]
}

const TONES = { gold: '#fde68a', green: '#6ee7b7', plain: '#f5f5f4' }

/** Holographic glass card docked to the viewfinder. Shows only values from the live scan. */
export function ScanHud({ tag, headline, lines }: ScanHudProps) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(238, 219, 156, 0.35)',
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.25)',
        animation: 'fadeInUp 0.3s ease-out',
      }}
      aria-live="polite"
    >
      <div
        className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5"
        style={{ background: 'rgba(69, 26, 3, 0.5)', border: '1px solid rgba(252, 211, 77, 0.4)' }}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className="absolute inline-flex h-full w-full rounded-full"
            style={{ background: '#34d399', animation: 'ping-dot 1.4s cubic-bezier(0, 0, 0.2, 1) infinite' }}
          />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: '#34d399' }} />
        </span>
        <span className="truncate text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#fde68a' }}>
          {tag}
        </span>
      </div>
      <p className="text-sm font-medium tracking-wide" style={{ fontFamily: 'var(--font-display)', color: '#fef3c7' }}>
        {headline.label}: <span className="font-semibold tabular-nums" style={{ color: '#fff' }}>{headline.value}</span>
      </p>
      {lines.map((line) => (
        <p key={line.label} className="text-xs font-light tracking-wide" style={{ color: '#e7e5e4' }}>
          {line.label}:{' '}
          <span className="font-semibold tabular-nums" style={{ color: TONES[line.tone ?? 'plain'] }}>
            {line.value}
          </span>
        </p>
      ))}
    </div>
  )
}
