import { useState, useCallback } from 'react'
import { ScanViewfinder, ScanResultPanel, FibonacciSpiral, Badge, Icon, Button, Card } from '@/components'
import { useAuth } from '@/hooks/useAuth'
import { searchEbay } from '@/services/ebay'
import { saveScan, getRemainingScans, incrementScanCount } from '@/services/scans'
import type { ScanResponse } from '@/types/ebay'

export function DarkScanPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = useCallback(async () => {
    if (!query.trim() || !user) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { remaining } = await getRemainingScans(user.id)
      if (remaining <= 0) {
        setError('Daily scan limit reached. Upgrade for unlimited scans.')
        setLoading(false)
        return
      }

      // Dark scan: filter for used/pre-owned luxury items
      const data = await searchEbay(query.trim(), {
        limit: 12,
        filter: 'conditionIds:{3000|2500|2000|1500}',
        sort: 'price',
      })
      setResult(data)

      await Promise.all([
        saveScan(user.id, data),
        incrementScanCount(user.id),
      ])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [query, user])

  const primaryItem = result?.items[0]
  const secondaryItems = result?.items.slice(1, 4) ?? []

  return (
    <div
      className="flex min-h-screen flex-col"
      data-screen="dark-scan"
      style={{ background: 'var(--bg)' }}
    >
      {/* Luxury header */}
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ paddingTop: 'calc(var(--status-bar-height, 0px) + 16px)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-2xl font-semibold tracking-tight"
            style={{
              fontFamily: "'Cinzel', var(--font-display)",
              color: 'var(--primary)',
              letterSpacing: '0.05em',
            }}
          >
            iSpy
          </span>
          <Badge variant="gold">CURATOR</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Icon name="history" size={22} style={{ color: 'var(--on-surface-variant)' }} />
          <Icon name="tune" size={22} style={{ color: 'var(--on-surface-variant)' }} />
        </div>
      </header>

      {/* Status badges */}
      <div className="flex items-center gap-2 px-5 pb-3">
        <Badge variant="success">
          <Icon name="fiber_manual_record" size={8} /> AUTHENTICATED
        </Badge>
        <Badge variant="subtle">Pre-Owned Filter</Badge>
      </div>

      {/* Viewfinder */}
      <div className="relative px-4">
        <ScanViewfinder showLaser={loading}>
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
              name={loading ? 'radar' : 'center_focus_strong'}
              size={48}
              style={{
                color: 'var(--primary)',
                opacity: loading ? 1 : 0.4,
                animation: loading ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
              }}
            />
            <p
              className="text-xs uppercase tracking-[0.15em] text-center"
              style={{ color: 'var(--on-surface-variant)', fontFamily: "'Italiana', var(--font-body)" }}
            >
              {loading ? 'Authenticating Provenance...' : 'Provenance Verification Active'}
            </p>
          </div>

          {result && (
            <div
              className="absolute rounded-full"
              style={{
                top: '30%', left: '40%', width: 12, height: 12,
                background: 'var(--primary)',
                boxShadow: '0 0 12px var(--primary)',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }}
            />
          )}
        </ScanViewfinder>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 px-4 pt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="e.g. Rolex Submariner, Hermès Birkin..."
          disabled={loading}
          className="min-w-0 flex-1 rounded-[var(--radius-lg)] border px-4 py-3 text-sm outline-none"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--on-surface)',
            fontFamily: 'var(--font-body)',
          }}
        />
        <Button
          variant="gold"
          icon={<Icon name={loading ? 'hourglass_top' : 'search'} size={20} />}
          onClick={handleScan}
          disabled={loading || !query.trim()}
        >
          {loading ? '' : 'Verify'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 rounded-[var(--radius-lg)] px-4 py-3" style={{ background: 'var(--error-container, #fde8e8)' }}>
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {/* Results */}
      {result && primaryItem && (
        <div className="flex-1 px-4 pt-4 pb-4" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <ScanResultPanel
            primaryItem={{
              name: primaryItem.name,
              confidence: primaryItem.confidence,
              estimatedValue: primaryItem.estimatedValue,
              margin: primaryItem.margin,
            }}
            secondaryItems={secondaryItems.map((i) => ({
              name: i.name,
              confidence: i.confidence,
              estimatedValue: i.estimatedValue,
            }))}
            totalValue={result.priceRange.high}
            variant="dark"
          />

          {/* Provenance register */}
          <Card variant="elevated" className="mt-3">
            <h4
              className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]"
              style={{ color: 'var(--primary)' }}
            >
              Market Intelligence
            </h4>
            {[
              { label: 'Price Range', status: `${result.priceRange.low} – ${result.priceRange.high}`, icon: 'analytics' },
              { label: 'Average Price', status: `$${result.averagePrice}`, icon: 'trending_up' },
              { label: 'Market Comparables', status: `${result.totalResults} found`, icon: 'storefront' },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b py-2 last:border-b-0"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2">
                  <Icon name={row.icon} size={16} style={{ color: 'var(--primary)' }} />
                  <span className="text-sm" style={{ color: 'var(--on-surface)' }}>
                    {row.label}
                  </span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                  {row.status}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
