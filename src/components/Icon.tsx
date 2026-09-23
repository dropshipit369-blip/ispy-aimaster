import type { CSSProperties } from 'react'

interface IconProps {
  name: string
  size?: number
  fill?: boolean
  /** Stroke weight, 100–700. */
  weight?: number
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 24, fill = false, weight = 400, className = '', style }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`icon ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  )
}
