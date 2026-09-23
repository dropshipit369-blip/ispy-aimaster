import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  variant?: 'filled' | 'outlined' | 'elevated' | 'frosted'
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

const variantMap: Record<string, CSSProperties> = {
  filled: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
  },
  outlined: {
    background: 'transparent',
    border: '1px solid var(--outline-variant)',
  },
  elevated: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-card)',
  },
  frosted: {
    background: 'rgba(255, 253, 249, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--outline-variant)',
    boxShadow: 'var(--shadow-card)',
  },
}

export function Card({
  children,
  variant = 'filled',
  className = '',
  style,
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] p-4 ${className}`}
      style={{
        ...variantMap[variant],
        ...style,
        cursor: onClick ? 'pointer' : undefined,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {children}
    </div>
  )
}
