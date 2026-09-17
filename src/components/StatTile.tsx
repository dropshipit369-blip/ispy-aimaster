import type { CSSProperties, ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string | number
  unit?: string
  icon?: ReactNode
  trend?: { direction: 'up' | 'down' | 'neutral'; value: string }
  className?: string
  style?: CSSProperties
}

export function StatTile({ label, value, unit, icon, trend, className = '', style }: StatTileProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-[var(--radius-lg)] p-3 ${className}`}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        ...style,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--on-surface-muted)', fontFamily: 'var(--font-body)' }}
        >
          {label}
        </span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            {unit}
          </span>
        )}
      </div>
      {trend && (
        <span
          className="text-xs font-medium"
          style={{
            color: trend.direction === 'up' ? 'var(--success)' : trend.direction === 'down' ? 'var(--error)' : 'var(--on-surface-muted)',
          }}
        >
          {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
        </span>
      )}
    </div>
  )
}
