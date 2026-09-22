import { Button } from './Button'
import { Badge } from './Badge'
import { Icon } from './Icon'

interface PricingFeature {
  text: string
  included: boolean
}

interface PricingCardProps {
  name: string
  price: number
  currency?: string
  period?: string
  description: string
  features: PricingFeature[]
  isPopular?: boolean
  ctaLabel?: string
  ctaDisabled?: boolean
  onSelect?: () => void
}

export function PricingCard({
  name,
  price,
  currency = 'AUD',
  period = '/mo',
  description,
  features,
  isPopular = false,
  ctaLabel = 'Get Started',
  ctaDisabled = false,
  onSelect,
}: PricingCardProps) {
  return (
    <div
      className="relative flex flex-col rounded-[var(--radius-xl)] p-5"
      style={{
        background: isPopular
          ? 'linear-gradient(135deg, var(--surface-card), var(--surface-elevated))'
          : 'var(--surface-card)',
        border: isPopular
          ? '1.5px solid var(--primary-container)'
          : '1px solid var(--border-subtle)',
        boxShadow: isPopular ? 'var(--shadow-card)' : undefined,
      }}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="gold">Most Popular</Badge>
        </div>
      )}

      <h3
        className="text-lg font-semibold"
        style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-body)' }}
      >
        {name}
      </h3>

      <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
        {description}
      </p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
          {currency}
        </span>
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}
        >
          ${price}
        </span>
        <span className="text-sm" style={{ color: 'var(--on-surface-muted)' }}>
          {period}
        </span>
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Icon
              name={f.included ? 'check_circle' : 'cancel'}
              size={18}
              fill
              style={{
                color: f.included ? 'var(--success)' : 'var(--on-surface-muted)',
              }}
            />
            <span style={{ color: f.included ? 'var(--on-surface)' : 'var(--on-surface-muted)' }}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        <Button
          variant={isPopular ? 'gold' : 'outline'}
          fullWidth
          disabled={ctaDisabled}
          onClick={onSelect}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  )
}
