import type { CSSProperties, ReactNode } from 'react'

type BadgeVariant = 'gold' | 'success' | 'warning' | 'error' | 'info' | 'subtle'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
  style?: CSSProperties
}

const variantStyles: Record<BadgeVariant, CSSProperties> = {
  gold: {
    background: 'var(--primary-tint)',
    color: 'var(--primary)',
    border: '1px solid var(--primary-border)',
  },
  success: {
    background: 'var(--success-bg)',
    color: 'var(--success)',
  },
  warning: {
    background: 'var(--warning-bg)',
    color: 'var(--warning)',
  },
  error: {
    background: 'var(--error-bg)',
    color: 'var(--error)',
  },
  info: {
    background: 'rgba(96, 165, 250, 0.1)',
    color: 'var(--secondary)',
  },
  subtle: {
    background: 'var(--surface-elevated)',
    color: 'var(--on-surface-variant)',
  },
}

export function Badge({ children, variant = 'gold', className = '', style }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest ${className}`}
      style={{
        fontFamily: 'var(--font-body)',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
