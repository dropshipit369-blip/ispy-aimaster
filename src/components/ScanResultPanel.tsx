import { Card } from './Card'
import { Badge } from './Badge'
import { GoldDivider } from './GoldDivider'
import { Icon } from './Icon'

interface ScanItem {
  name: string
  confidence: number
  estimatedValue: string
  margin?: string
}

interface ScanResultPanelProps {
  primaryItem: ScanItem
  secondaryItems?: ScanItem[]
  totalValue?: string
  variant?: 'light' | 'dark'
  className?: string
}

export function ScanResultPanel({
  primaryItem,
  secondaryItems = [],
  totalValue,
  variant = 'light',
  className = '',
}: ScanResultPanelProps) {
  const cardVariant = variant === 'light' ? 'frosted' : 'elevated'

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Primary result */}
      <Card variant={cardVariant}>
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="gold">
              {primaryItem.confidence}% Match
            </Badge>
            <h3
              className="mt-2 text-lg font-semibold"
              style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}
            >
              {primaryItem.name}
            </h3>
          </div>
          <Icon name="verified" fill size={20} style={{ color: 'var(--success)' }} />
        </div>

        <GoldDivider variant="gradient" className="my-3" />

        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--on-surface-muted)' }}>
            {variant === 'light' ? 'Suggested Selling Price' : 'Hammer Projection'}
          </span>
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}
          >
            {primaryItem.estimatedValue}
          </span>
        </div>
        {primaryItem.margin && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
              Estimated Margin
            </span>
            <Badge variant="success">{primaryItem.margin}</Badge>
          </div>
        )}
      </Card>

      {/* Secondary items */}
      {secondaryItems.length > 0 && (
        <Card variant={cardVariant}>
          <h4
            className="mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)' }}
          >
            Also Detected
          </h4>
          <div className="flex flex-col gap-2">
            {secondaryItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Icon name="image_search" size={16} style={{ color: 'var(--on-surface-variant)' }} />
                  <span className="text-sm" style={{ color: 'var(--on-surface)' }}>
                    {item.name}
                  </span>
                </div>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: 'var(--primary)' }}
                >
                  {item.estimatedValue}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Total value */}
      {totalValue && (
        <Card variant={cardVariant}>
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)' }}
            >
              Cumulative Arbitrage
            </span>
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}
            >
              {totalValue}
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}
