import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
  icon?: ReactNode
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--primary)',
    color: 'var(--bg)',
    border: 'none',
  },
  secondary: {
    background: 'var(--surface-elevated)',
    color: 'var(--on-surface)',
    border: '1px solid var(--outline-variant)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1px solid var(--primary-border, var(--outline))',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--on-surface-variant)',
    border: 'none',
  },
  gold: {
    background: 'linear-gradient(135deg, var(--primary-container) 0%, var(--primary) 100%)',
    color: 'var(--ispy-obsidian)',
    boxShadow: '0 6px 18px -8px rgba(153, 122, 56, 0.7)',
    border: 'none',
    fontWeight: 600,
  },
}

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[var(--radius-md)]',
  md: 'px-5 py-2.5 text-sm rounded-[var(--radius-lg)]',
  lg: 'px-6 py-3.5 text-base rounded-[var(--radius-xl)]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  icon,
  className = '',
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-body font-semibold
        transition-all duration-200 ease-out
        hover:opacity-90 active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={{
        fontFamily: 'var(--font-body)',
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
