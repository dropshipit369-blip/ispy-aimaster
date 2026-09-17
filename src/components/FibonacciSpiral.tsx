interface FibonacciSpiralProps {
  size?: number
  color?: string
  className?: string
}

export function FibonacciSpiral({ size = 200, color = 'var(--primary-container)', className = '' }: FibonacciSpiralProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M100,100 C100,72 116,55 133,55 C155,55 172,72 172,94 C172,124 148,150 118,150 C78,150 44,116 44,76 C44,26 84,-14 134,-14"
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
      <path
        d="M100,100 C100,85 110,75 122,75 C138,75 150,87 150,103 C150,123 134,140 114,140 C88,140 66,118 66,92 C66,60 92,34 124,34"
        stroke={color}
        strokeWidth="0.75"
        strokeOpacity="0.2"
        strokeLinecap="round"
      />
      <circle cx="100" cy="100" r="3" fill={color} opacity="0.4" />
    </svg>
  )
}
