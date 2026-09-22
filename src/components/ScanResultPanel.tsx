import { Card } from './Card'
import { Badge } from './Badge'
import { GoldDivider } from './GoldDivider'
import { Icon } from './Icon'

interface ListingRow {
  id: string
  name: string
  price: string
  condition?: string
  href?: string
  matchScore?: number
}

interface ScanResultPanelProps {
  title: string
  subtitle?: string
  badge?: string
  valueLabel: string
  value: string
  range?: { low: string; high: string }
  listingsTitle?: string
  listings?: ListingRow[]
  variant?: 'light' | 'dark'
  className?: string
}

/** Price summary for a scan plus the matching listings, each linking out to eBay. */
export function ScanResultPanel({
  title,
  subtitle,
  badge,
  valueLabel,
  value,
  range,
  listingsTitle = 'Matching listings',
  listings = [],
  variant = 'light',
  className = '',
}: ScanResultPanelProps) {
  const cardVariant = variant === 'light' ? 'frosted' : 'elevated'

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <Card variant={cardVariant}>
        {badge && <Badge variant="gold">{badge}</Badge>}
        <h3
          className="mt-2 text-lg font-semibold leading-snug"
          style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-display)', textWrap: 'balance' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--on-surface-muted)' }}>
            {subtitle}
          </p>
        )}

        <GoldDivider variant="gradient" className="my-3" />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--on-surface-muted)' }}>
            {valueLabel}
          </span>
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}
          >
            {value}
          </span>
        </div>
        {range && (
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
              Asking range
            </span>
            <span className="text-sm tabular-nums" style={{ color: 'var(--on-surface-variant)' }}>
              {range.low} – {range.high}
            </span>
          </div>
        )}
      </Card>

      {listings.length > 0 && (
        <Card variant={cardVariant}>
          <h4
            className="mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)' }}
          >
            {listingsTitle}
          </h4>
          <ul className="flex flex-col">
            {listings.map((item) => {
              const content = (
                <>
                  <div className="flex min-w-0 flex-col">
                    <span className="line-clamp-2 text-sm" style={{ color: 'var(--on-surface)' }}>
                      {item.name}
                    </span>
                    {(item.condition || item.matchScore !== undefined) && (
                      <span className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
                        {[item.condition, item.matchScore !== undefined ? `${item.matchScore}% word match` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
                      {item.price}
                    </span>
                    {item.href && <Icon name="open_in_new" size={14} style={{ color: 'var(--on-surface-muted)' }} />}
                  </span>
                </>
              )
              return (
                <li key={item.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 py-2.5 no-underline"
                    >
                      {content}
                    </a>
                  ) : (
                    <div className="flex items-center justify-between gap-3 py-2.5">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
