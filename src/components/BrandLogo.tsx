interface BrandLogoProps {
  /** `mark` = eye emblem only (headers, small sizes); `full` = emblem with the ispy.ai wordmark. */
  variant?: 'mark' | 'full'
  size?: number
  className?: string
}

/** The ispy.ai neon eye logo. Assets live in /public/brand. */
export function BrandLogo({ variant = 'mark', size = 36, className = '' }: BrandLogoProps) {
  return (
    <img
      src={variant === 'full' ? '/brand/ispy-logo.png' : '/brand/ispy-mark.png'}
      width={size}
      height={size}
      alt="ispy.ai"
      decoding="async"
      className={`shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, boxShadow: '0 0 0 1px var(--primary-border), 0 4px 14px -6px rgba(26, 24, 22, 0.45)' }}
    />
  )
}

/** Emblem plus wordmark, used in page headers. */
export function BrandLockup({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <BrandLogo size={size} />
      <span
        className="font-bold tracking-tight"
        style={{ fontFamily: 'var(--font-display)', fontSize: Math.round(size * 0.66), color: 'var(--on-surface)' }}
      >
        ispy<span style={{ color: 'var(--primary)' }}>.ai</span>
      </span>
    </span>
  )
}
