interface GoldDividerProps {
  className?: string
  variant?: 'thin' | 'accent' | 'gradient'
}

export function GoldDivider({ className = '', variant = 'thin' }: GoldDividerProps) {
  if (variant === 'gradient') {
    return (
      <div
        className={`h-px w-full ${className}`}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--primary-container) 50%, transparent 100%)',
        }}
      />
    )
  }

  if (variant === 'accent') {
    return (
      <div
        className={`mx-auto h-0.5 w-16 rounded-full ${className}`}
        style={{ background: 'var(--primary-container)' }}
      />
    )
  }

  return (
    <div
      className={`h-px w-full ${className}`}
      style={{ background: 'var(--border-divider)' }}
    />
  )
}
