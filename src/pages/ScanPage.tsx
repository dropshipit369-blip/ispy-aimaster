import { useState, useCallback } from 'react'
import { ScanViewfinder, ScanResultPanel, FibonacciSpiral, Badge, Icon, Button, StatTile, Card } from '@/components'
import { useAuth } from '@/hooks/useAuth'
import { searchEbay } from '@/services/ebay'
import { saveScan, getRemainingScans, incrementScanCount } from '@/services/scans'
import type { ScanResponse, ScanResult } from '@/types/ebay'

export function ScanPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scansRemaining, setScansRemaining] = useState<number | null>(null)

  const handleScan = useCallback(async () => {
    if (!query.trim() || !user) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Check remaining scans
      const { remaining } = await getRemainingScans(user.id)
      if (remaining <= 0) {
        setError('Daily scan limit reached. Upgrade to Pro for unlimited scans.')
        setLoading(false)
        return
      }

      const data = await searchEbay(query.trim(), { limit: 12 })
      setResult(data)
      setScansRemaining(remaining - 1)

      // Persist scan + increment counter
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
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>
      {/* Status bar */}
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'calc(var(--status-bar-height, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)' }}
          >
            iSpy
          </span>
          <Badge variant="gold">AI</Badge>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-1 rounded-full border-none px-3 py-1.5"
            style={{
              background: 'var(--primary-tint)',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Icon name="flash_on" size={14} />
            <span>{scansRemaining ?? '—'} left</span>
          </button>
          <Icon name="history" size={22} style={{ color: 'var(--on-surface-variant)' }} />
        </div>
      </header>

      {/* AR HUD badges */}
      <div className="flex items-center gap-2 px-4 pb-2">
        <Badge variant="success">
          <Icon name="fiber_manual_record" size={8} /> LIVE
        </Badge>
        <Badge variant="subtle">eBay AU</Badge>
        <Badge variant="subtle">
          <Icon name="speed" size={12} /> Real-time
        </Badge>
      </div>

      {/* Viewfinder */}
      <div className="relative px-4">
        <ScanViewfinder showLaser={loading}>
          <FibonacciSpiral
            size={280}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"
          />

          {/* Search input overlay */}
          <div
            className="flex h-full flex-col items-center justify-center gap-3 px-6"
            style={{ minHeight: 240, background: 'var(--surface-dim)' }}
          >
            <Icon
              name={loading ? 'radar' : 'center_focus_strong'}
              size={48}
              style={{
                color: 'var(--primary-container)',
                opacity: loading ? 1 : 0.5,
                animation: loading ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
              }}
            />
            <p className="text-sm text-center" style={{ color: 'var(--on-surface-muted)' }}>
              {loading ? 'Scanning eBay marketplace...' : 'Enter item name to scan market value'}
            </p>
          </div>

          {/* Detection pins (when result active) */}
          {result && (
            <>
              <div
                className="absolute rounded-full"
                style={{
                  top: '30%', left: '40%', width: 12, height: 12,
                  background: 'var(--success)',
                  boxShadow: '0 0 8px var(--success)',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  top: '55%', left: '60%', width: 8, height: 8,
                  background: 'var(--primary-container)',
                  boxShadow: '0 0 6px var(--primary-container)',
                  animation: 'pulse-glow 2s ease-in-out infinite 0.5s',
                }}
              />
            </>
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
          placeholder="e.g. Louis Vuitton Speedy 30, Nike Dunk Low..."
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
          {loading ? '' : 'Scan'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 rounded-[var(--radius-lg)] px-4 py-3" style={{ background: 'var(--error-container, #fde8e8)' }}>
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {/* Market stats */}
      {result && (
        <div className="grid grid-cols-3 gap-2 px-4 pt-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <StatTile
            label="Avg Price"
            value={`$${result.averagePrice}`}
            icon={<Icon name="analytics" size={14} style={{ color: 'var(--primary)' }} />}
          />
          <StatTile
            label="Median"
            value={`$${result.medianPrice}`}
            icon={<Icon name="trending_up" size={14} style={{ color: 'var(--success)' }} />}
          />
          <StatTile
            label="Listings"
            value={result.totalResults > 999 ? `${(result.totalResults / 1000).toFixed(1)}k` : result.totalResults}
            icon={<Icon name="storefront" size={14} style={{ color: 'var(--on-surface-variant)' }} />}
          />
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
            variant="light"
          />

          {/* Full results list */}
          {result.items.length > 4 && (
            <Card variant="frosted" className="mt-3">
              <h4
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)' }}
              >
                All Results ({result.items.length})
              </h4>
              <div className="flex flex-col gap-2">
                {result.items.slice(4).map((item: ScanResult) => (
                  <a
                    key={item.id}
                    href={item.itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 no-underline"
                    style={{
                      background: 'var(--surface-dim)',
                      color: 'var(--on-surface)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm">{item.name}</span>
                      <span className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
                        {item.condition} · {item.seller}
                      </span>
                    </div>
                    <span
                      className="ml-2 shrink-0 text-sm font-semibold tabular-nums"
                      style={{ color: 'var(--primary)' }}
                    >
                      {item.estimatedValue}
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
