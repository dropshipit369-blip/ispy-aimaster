import type { CSSProperties } from 'react'

interface IconProps {
  name: string
  size?: number
  fill?: boolean
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 24, fill = false, className = '', style }: IconProps) {
  return (
    <span
      className={`icon ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  )
}
