import { Icon } from '@/components/Icon'
import { formatMoney } from '@/lib/format'
import { SOLD_BASIS_LABEL } from '@/lib/sold'
import type { SoldBasis, SoldSummary } from '@/types/ebay'

const BASIS_NOTE: Record<SoldBasis, string> = {
  confirmed: 'Winning bids iSpy read back from eBay after each auction closed.',
  observed: 'Sale prices from eBay AU sold listings. Real sales, not verified through eBay’s API.',
  estimated:
    'eBay hides accepted Best Offer amounts, so these are the asking price less 8%. Treat as a guide, not a sale price.',
}

const FORMAT_LABEL: Record<string, string> = { auction: 'Auction', buy_it_now: 'Buy It Now', best_offer: 'Best Offer' }

function shortDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Australia/Melbourne' })
}

/** What this item has actually sold for on eBay AU, with the evidence behind the number. */
export function SoldPanel({ sold }: { sold: SoldSummary }) {
  const range = `${formatMoney(sold.p25)} – ${formatMoney(sold.p75)}`
  return (
    <section
      aria-labelledby="sold-title"
      className="marble-panel rounded-2xl p-4"
      style={{ border: '1px solid var(--primary-border)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-2">
        <Icon name="sell" size={16} style={{ color: 'var(--primary-deep)' }} />
        <h2 id="sold-title" className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
          What it actually sold for
        </h2>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p
            className="text-3xl font-semibold tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
          >
            {formatMoney(sold.median)}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Median of {SOLD_BASIS_LABEL[sold.basis](sold.count)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums" style={{ color: 'var(--on-surface)' }}>
            {range}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
            Middle half of sales
          </p>
        </div>
      </div>

      {sold.wideSpread && (
        <p
          className="mt-3 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs"
          style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
        >
          <Icon name="info" size={14} style={{ marginTop: 1 }} />
          Prices vary a lot, so these sales likely cover different versions or conditions. Add the model,
          size or edition for a tighter figure.
        </p>
      )}

      <p className="mt-3 text-[11px] leading-snug" style={{ color: 'var(--on-surface-muted)' }}>
        {BASIS_NOTE[sold.basis]}
        {sold.oldest && sold.newest ? ` Sales from ${shortDate(sold.oldest)} to ${shortDate(sold.newest)}.` : ''}
      </p>

      {sold.recent.length > 0 && (
        <ul className="mt-3 flex flex-col" aria-label="Recent sales">
          {sold.recent.map((sale, i) => {
            const body = (
              <>
                <span className="flex min-w-0 flex-col">
                  <span className="line-clamp-2 text-sm" style={{ color: 'var(--on-surface)' }}>
                    {sale.title}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
                    {[shortDate(sale.endedAt), sale.format ? FORMAT_LABEL[sale.format] ?? null : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
                  {formatMoney(sale.price)}
                  {sale.url && <Icon name="open_in_new" size={13} style={{ color: 'var(--on-surface-muted)' }} />}
                </span>
              </>
            )
            return (
              <li key={`${sale.endedAt}-${i}`} className="border-t first:border-t-0" style={{ borderColor: 'var(--border-subtle)' }}>
                {sale.url ? (
                  <a
                    href={sale.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 py-2 no-underline"
                  >
                    {body}
                  </a>
                ) : (
                  <div className="flex items-center justify-between gap-3 py-2">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
