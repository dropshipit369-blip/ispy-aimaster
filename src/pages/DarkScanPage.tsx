import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanViewfinder, ScanResultPanel, FibonacciSpiral, Badge, Icon, Button, Card, BrandLockup } from '@/components'
import { useMarketScan } from '@/hooks/useMarketScan'
import { formatMoney, formatResetTime } from '@/lib/format'
import { isUnlimited } from '@/services/usage'

/** Curator mode: the same market scan, restricted to pre-owned listings. */
export function DarkScanPage() {
  const navigate = useNavigate()
  const { allowance, environment, result, searching, error, historyWarning, runScan } = useMarketScan('used')
  const [query, setQuery] = useState('')

  const listings = result?.items.slice(0, 12) ?? []
  const remainingLabel = !allowance ? '—' : isUnlimited(allowance) ? 'Unlimited' : `${allowance.scans_remaining ?? 0} left`

  return (
    <div className="flex min-h-screen flex-col" data-screen="dark-scan" style={{ background: 'var(--bg)' }}>
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ paddingTop: 'calc(var(--status-bar-height, 0px) + 16px)' }}
      >
        <div className="flex items-center gap-3">
          <BrandLockup size={30} />
          <Badge variant="gold">CURATOR</Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/history')}
            aria-label="Scan history"
            className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-transparent"
            style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}
          >
            <Icon name="history" size={22} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            aria-label="Standard scan (all conditions)"
            className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-transparent"
            style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}
          >
            <Icon name="tune" size={22} />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        <Badge variant="success">Pre-owned listings only</Badge>
        <Badge variant="subtle">eBay AU</Badge>
        {environment === 'sandbox' && <Badge variant="warning">Test data</Badge>}
        <span className="ml-auto text-xs font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
          {remainingLabel}
        </span>
      </div>

      <div className="relative px-4">
        <ScanViewfinder showLaser={searching}>
          <FibonacciSpiral
            size={280}
            color="var(--primary)"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"
          />
          <div
            className="flex h-full flex-col items-center justify-center gap-3 px-6"
            style={{ minHeight: 240, background: 'var(--surface-dim)' }}
          >
            <Icon
              name={searching ? 'radar' : 'diamond'}
              size={48}
              style={{
                color: 'var(--primary)',
                opacity: searching ? 1 : 0.4,
                animation: searching ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
              }}
            />
            <p
              className="text-center text-xs uppercase tracking-[0.15em]"
              style={{ color: 'var(--on-surface-variant)', fontFamily: "'Italiana', var(--font-body)" }}
            >
              {searching ? 'Reading the pre-owned market…' : 'Pre-owned market check'}
            </p>
          </div>
        </ScanViewfinder>
      </div>

      <form
        className="flex gap-2 px-4 pt-4"
        onSubmit={(event) => {
          event.preventDefault()
          void runScan(query)
        }}
      >
        <label htmlFor="curator-query" className="sr-only">
          Item to value
        </label>
        <input
          id="curator-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Rolex Submariner, Hermès Birkin…"
          maxLength={200}
          disabled={searching}
          enterKeyHint="search"
          className="min-w-0 flex-1 rounded-[var(--radius-lg)] border px-4 py-3 text-sm outline-none"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--on-surface)',
            fontFamily: 'var(--font-body)',
          }}
        />
        <Button
          type="submit"
          variant="gold"
          icon={<Icon name={searching ? 'hourglass_top' : 'search'} size={20} />}
          disabled={searching || !query.trim()}
        >
          {searching ? '' : 'Value'}
        </Button>
      </form>

      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 flex flex-col gap-2 rounded-[var(--radius-lg)] px-4 py-3"
          style={{ background: 'var(--error-container, #fde8e8)' }}
        >
          <p className="text-sm" style={{ color: 'var(--error)' }}>
            {error.message}
            {error.limitReached && allowance && !isUnlimited(allowance) && ` Resets at ${formatResetTime(allowance.resets_at)}.`}
          </p>
          {error.limitReached && (
            <Button variant="gold" size="sm" onClick={() => navigate('/pricing')}>
              See plans
            </Button>
          )}
        </div>
      )}

      {result && listings.length > 0 && (
        <div className="flex-1 px-4 pb-4 pt-4" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <ScanResultPanel
            title={result.query}
            subtitle={`${listings.length} pre-owned eBay AU listings. Asking prices, not completed sales.`}
            valueLabel="Pre-owned median"
            value={formatMoney(result.medianPrice, result.currency)}
            range={{ low: formatMoney(result.lowPrice, result.currency), high: formatMoney(result.highPrice, result.currency) }}
            listingsTitle="Comparable pre-owned listings"
            listings={listings.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.priceLabel,
              condition: item.condition,
              href: item.itemUrl || undefined,
            }))}
            variant="dark"
          />

          <Card variant="elevated" className="mt-3">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--primary)' }}>
              Market snapshot
            </h4>
            {[
              { label: 'Asking range', value: `${formatMoney(result.lowPrice, result.currency)} – ${formatMoney(result.highPrice, result.currency)}`, icon: 'analytics' },
              { label: 'Average asking price', value: formatMoney(result.averagePrice, result.currency), icon: 'trending_up' },
              { label: 'Pre-owned listings found', value: result.totalResults.toLocaleString('en-AU'), icon: 'storefront' },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b py-2 last:border-b-0"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2">
                  <Icon name={row.icon} size={16} style={{ color: 'var(--primary)' }} />
                  <span className="text-sm" style={{ color: 'var(--on-surface)' }}>
                    {row.label}
                  </span>
                </div>
                <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--on-surface)' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </Card>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
            iSpy compares listing prices only. It does not authenticate items — verify provenance before you buy.
          </p>
          {historyWarning && (
            <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-muted)' }}>
              This scan couldn't be saved to your history.
            </p>
          )}
        </div>
      )}

      {result && listings.length === 0 && (
        <p className="px-4 pt-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          No pre-owned eBay AU listings match “{result.query}”. Try the brand and model only.
        </p>
      )}
    </div>
  )
}
