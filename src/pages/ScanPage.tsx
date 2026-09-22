import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanViewfinder, ScanResultPanel, FibonacciSpiral, Badge, Icon, Button, StatTile, Card, CameraCapture } from '@/components'
import { useMarketScan } from '@/hooks/useMarketScan'
import { formatMoney, formatResetTime } from '@/lib/format'
import { ApiError } from '@/services/functions'
import { identifyFromPhoto, searchPhraseFor, type IdentifiedItem } from '@/services/liveScan'
import { isUnlimited } from '@/services/usage'

export function ScanPage() {
  const navigate = useNavigate()
  const { allowance, environment, result, searching, error, setError, historyWarning, outOfScans, runScan, setResult } =
    useMarketScan('any')
  const [query, setQuery] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [identifying, setIdentifying] = useState(false)
  const [identified, setIdentified] = useState<IdentifiedItem | null>(null)

  const busy = searching || identifying

  const handleTextScan = useCallback(async () => {
    if (!query.trim() || busy) return
    setPhoto(null)
    setIdentified(null)
    await runScan(query)
  }, [busy, query, runScan])

  const closeCamera = useCallback(() => setCameraOpen(false), [])

  const openCamera = useCallback(() => {
    if (outOfScans) {
      setError({ message: "You've used today's market scans. Upgrade for more, or scan again after midnight.", limitReached: true })
      return
    }
    setCameraOpen(true)
  }, [outOfScans, setError])

  const handleCapture = useCallback(
    async (image: string) => {
      setCameraOpen(false)
      setPhoto(image)
      setIdentified(null)
      setResult(null)
      setError(null)
      setIdentifying(true)
      try {
        const { items } = await identifyFromPhoto(image)
        const top = items[0]
        if (!top) throw new Error('No item was recognised. Move closer to one item and retry.')
        setIdentified(top)
        const phrase = searchPhraseFor(top)
        setQuery(phrase)
        setIdentifying(false)
        await runScan(phrase)
      } catch (err) {
        const message =
          err instanceof ApiError && err.status === 402
            ? "You've used this month's AI photo IDs. Type the item name instead, or upgrade for more."
            : err instanceof Error
              ? err.message
              : 'The photo could not be identified. Please retry.'
        setError({ message, limitReached: err instanceof ApiError && err.status === 402 })
      } finally {
        setIdentifying(false)
      }
    },
    [runScan, setError, setResult],
  )

  const remainingLabel = !allowance
    ? '—'
    : isUnlimited(allowance)
      ? 'Unlimited'
      : `${allowance.scans_remaining ?? 0} left today`

  const topListings = result?.items.slice(0, 12) ?? []

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'calc(var(--status-bar-height, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>
            iSpy
          </span>
          <Badge variant="gold">AI</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
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
            <span className="tabular-nums">{remainingLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/history')}
            aria-label="Scan history"
            className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-transparent"
            style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}
          >
            <Icon name="history" size={22} />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
        <Badge variant="subtle">eBay AU</Badge>
        <Badge variant="subtle">
          <Icon name="storefront" size={12} /> Live asking prices
        </Badge>
        {environment === 'sandbox' && <Badge variant="warning">Test data</Badge>}
        <button
          type="button"
          onClick={() => navigate('/scan/dark')}
          className="ml-auto border-none bg-transparent text-xs font-semibold"
          style={{ color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Pre-owned only →
        </button>
      </div>

      <div className="relative px-4">
        <ScanViewfinder showLaser={busy}>
          {photo ? (
            <img src={photo} alt="Your photo" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <FibonacciSpiral
              size={280}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"
            />
          )}
          <div
            className="relative flex h-full flex-col items-center justify-center gap-3 px-6"
            style={{ minHeight: 240, background: photo ? 'rgba(0,0,0,0.35)' : 'var(--surface-dim)' }}
          >
            {busy ? (
              <>
                <Icon
                  name="radar"
                  size={44}
                  style={{ color: photo ? '#fff' : 'var(--primary-container)', animation: 'pulse-glow 1.5s ease-in-out infinite' }}
                />
                <p className="text-center text-sm" style={{ color: photo ? '#fff' : 'var(--on-surface-muted)' }}>
                  {identifying ? 'Identifying the item…' : 'Checking eBay AU listings…'}
                </p>
              </>
            ) : photo ? null : (
              <>
                <Button variant="gold" icon={<Icon name="photo_camera" size={20} />} onClick={openCamera}>
                  Photograph an item
                </Button>
                <p className="text-center text-sm" style={{ color: 'var(--on-surface-muted)' }}>
                  or type what it is below
                </p>
              </>
            )}
          </div>
        </ScanViewfinder>
      </div>

      <form
        className="flex gap-2 px-4 pt-4"
        onSubmit={(event) => {
          event.preventDefault()
          void handleTextScan()
        }}
      >
        <label htmlFor="scan-query" className="sr-only">
          Item to scan
        </label>
        <input
          id="scan-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Louis Vuitton Speedy 30, Nike Dunk Low…"
          maxLength={200}
          disabled={busy}
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
          type="button"
          variant="outline"
          aria-label="Photograph an item"
          onClick={openCamera}
          disabled={busy}
        >
          <Icon name="photo_camera" size={20} />
        </Button>
        <Button
          type="submit"
          variant="gold"
          icon={<Icon name={searching ? 'hourglass_top' : 'search'} size={20} />}
          disabled={busy || !query.trim()}
        >
          {searching ? '' : 'Scan'}
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

      {identified && (
        <div className="px-4 pt-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <Card variant="filled">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge variant="gold">
                  <Icon name="auto_awesome" size={12} /> AI identified · {identified.confidence}% sure
                </Badge>
                <h3
                  className="mt-2 text-base font-semibold leading-snug"
                  style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}
                >
                  {identified.name}
                </h3>
                <p className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
                  {[identified.brand, identified.model, identified.yearMade, identified.condition].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            {identified.originStory && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                {identified.originStory}
              </p>
            )}
            {identified.salesStrategy && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--on-surface)' }}>
                <strong>Selling tip:</strong> {identified.salesStrategy}
                {identified.bestMarketplace ? ` (${identified.bestMarketplace})` : ''}
              </p>
            )}
            <p className="mt-2 text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
              AI identification can be wrong. Check labels and model numbers before you buy.
            </p>
          </Card>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-3 gap-2 px-4 pt-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <StatTile
            label="Median"
            value={result.items.length ? formatMoney(result.medianPrice, result.currency) : '—'}
            icon={<Icon name="trending_up" size={14} style={{ color: 'var(--success)' }} />}
          />
          <StatTile
            label="Average"
            value={result.items.length ? formatMoney(result.averagePrice, result.currency) : '—'}
            icon={<Icon name="analytics" size={14} style={{ color: 'var(--primary)' }} />}
          />
          <StatTile
            label="Listings"
            value={result.totalResults > 999 ? `${(result.totalResults / 1000).toFixed(1)}k` : result.totalResults}
            icon={<Icon name="storefront" size={14} style={{ color: 'var(--on-surface-variant)' }} />}
          />
        </div>
      )}

      {result && topListings.length > 0 && (
        <div className="flex-1 px-4 pb-4 pt-4" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <ScanResultPanel
            title={result.query}
            subtitle={`Based on ${topListings.length} current eBay AU listings. Asking prices, not completed sales.`}
            valueLabel="Median asking price"
            value={formatMoney(result.medianPrice, result.currency)}
            range={{ low: formatMoney(result.lowPrice, result.currency), high: formatMoney(result.highPrice, result.currency) }}
            listings={topListings.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.priceLabel,
              condition: item.condition,
              href: item.itemUrl || undefined,
              matchScore: item.matchScore,
            }))}
            variant="light"
          />
          {historyWarning && (
            <p className="mt-2 text-xs" style={{ color: 'var(--on-surface-muted)' }}>
              This scan couldn't be saved to your history.
            </p>
          )}
          {environment === 'sandbox' && (
            <p className="mt-2 text-xs" style={{ color: 'var(--warning)' }}>
              These results come from eBay's test environment while live access is being enabled.
            </p>
          )}
        </div>
      )}

      {result && topListings.length === 0 && (
        <p className="px-4 pt-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          No current eBay AU listings match “{result.query}”. Try fewer words, or the brand and model only.
        </p>
      )}

      {cameraOpen && <CameraCapture open onClose={closeCamera} onCapture={handleCapture} />}
    </div>
  )
}
