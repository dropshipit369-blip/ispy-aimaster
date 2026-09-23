import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, BrandLogo, Button, Icon, ScanResultPanel } from '@/components'
import { LiveViewfinder } from '@/components/scan/LiveViewfinder'
import { ModeBar } from '@/components/scan/ModeBar'
import { modeHint, type ScanMode } from '@/components/scan/modes'
import { ProfitPotential } from '@/components/scan/ProfitPotential'
import { ScanHud } from '@/components/scan/ScanHud'
import { SoldPanel } from '@/components/scan/SoldPanel'
import { SOLD_BASIS_LABEL } from '@/lib/sold'
import { useMarketScan } from '@/hooks/useMarketScan'
import { formatMoney, formatResetTime } from '@/lib/format'
import { fileToJpeg } from '@/lib/image'
import { expandUpcE } from '@/services/barcode'
import { normaliseBarcode } from '@/services/ebay'
import { ApiError } from '@/services/functions'
import { identifyFromPhoto, searchPhraseFor, type IdentifiedItem } from '@/services/liveScan'
import { isUnlimited } from '@/services/usage'
import type { ConditionFilter } from '@/types/ebay'

const CONDITIONS: { id: ConditionFilter; label: string }[] = [
  { id: 'any', label: 'Any condition' },
  { id: 'used', label: 'Pre-owned' },
  { id: 'new', label: 'New' },
]

interface ScanPageProps {
  initialCondition?: ConditionFilter
}

export function ScanPage({ initialCondition = 'any' }: ScanPageProps) {
  const navigate = useNavigate()
  const [condition, setCondition] = useState<ConditionFilter>(initialCondition)
  const { allowance, environment, result, searching, error, setError, historyWarning, outOfScans, runScan, setResult } =
    useMarketScan(condition)

  const [mode, setMode] = useState<ScanMode>('live')
  const [cameraArmed, setCameraArmed] = useState(false)
  const [query, setQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [identifying, setIdentifying] = useState(false)
  const [identified, setIdentified] = useState<IdentifiedItem | null>(null)
  const [lotItems, setLotItems] = useState<IdentifiedItem[]>([])
  const [gtin, setGtin] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const busy = searching || identifying

  const resetScan = useCallback(() => {
    setPhoto(null)
    setIdentified(null)
    setLotItems([])
    setGtin(null)
    setResult(null)
    setError(null)
  }, [setError, setResult])

  const changeMode = (next: ScanMode) => {
    if (next === mode) return
    resetScan()
    setMode(next)
    if (next === 'live' || next === 'barcode' || next === 'lot') setCameraArmed(true)
  }

  const guardAllowance = useCallback(() => {
    if (!outOfScans) return true
    setError({ message: "You've used today's market scans. Upgrade for more, or scan again after midnight.", limitReached: true })
    return false
  }, [outOfScans, setError])

  /** Identify a photo. Single/Live price the best match straight away; Lot lists every item found. */
  const handlePhoto = useCallback(
    async (image: string) => {
      if (!guardAllowance()) return
      setPhoto(image)
      setIdentified(null)
      setLotItems([])
      setGtin(null)
      setResult(null)
      setError(null)
      setIdentifying(true)
      try {
        const { items } = await identifyFromPhoto(image)
        if (!items.length) throw new Error('No item was recognised. Move closer, fill the frame and retry.')
        if (mode === 'lot') {
          setLotItems(items)
          return
        }
        const top = items[0]
        setIdentified(top)
        const phrase = searchPhraseFor(top)
        setQuery(phrase)
        setIdentifying(false)
        await runScan(phrase)
      } catch (err) {
        const limit = err instanceof ApiError && err.status === 402
        setError({
          message: limit
            ? "You've used this month's AI photo IDs. Type the item name instead, or upgrade for more."
            : err instanceof Error
              ? err.message
              : 'The photo could not be identified. Please retry.',
          limitReached: limit,
        })
      } finally {
        setIdentifying(false)
      }
    },
    [guardAllowance, mode, runScan, setError, setResult],
  )

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      await handlePhoto(await fileToJpeg(file))
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : 'This photo could not be read.', limitReached: false })
    }
  }

  const priceLotItem = async (item: IdentifiedItem) => {
    if (busy || !guardAllowance()) return
    setIdentified(item)
    setGtin(null)
    await runScan(searchPhraseFor(item))
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleTextScan = async () => {
    if (!query.trim() || busy || !guardAllowance()) return
    setPhoto(null)
    setIdentified(null)
    setGtin(null)
    await runScan(query)
  }

  const handleBarcode = useCallback(
    async (code: string) => {
      // Record the code first: it pauses the camera scanner, and "Scan another barcode" resumes it.
      setGtin(code)
      if (!guardAllowance()) return
      setBarcodeInput(code)
      setIdentified(null)
      setPhoto(null)
      await runScan('', { gtin: code })
    },
    [guardAllowance, runScan],
  )

  const submitBarcode = async () => {
    // 8 digits starting 0/1 are printed UPC-E codes (US/Canada products); eBay indexes their expanded
    // UPC-A form. Other 8-digit numbers are EAN-8 (e.g. Australian 93… codes).
    const digits = barcodeInput.replace(/\D/g, '')
    const code = (/^[01]\d{7}$/.test(digits) ? expandUpcE(digits) : null) ?? normaliseBarcode(digits)
    if (!code) {
      setError({ message: "That isn't a valid barcode number. Type all the digits under the bars (8, 12 or 13 digits).", limitReached: false })
      return
    }
    await handleBarcode(code)
  }

  const remainingLabel = !allowance
    ? '—'
    : isUnlimited(allowance)
      ? 'Unlimited'
      : `${allowance.scans_remaining ?? 0} left today`

  const listings = result?.items.slice(0, 12) ?? []
  const hasListings = listings.length > 0
  const firstTitle = listings[0]?.name

  const hudTag = identified
    ? `${identified.confidence}% AI match • ${identified.name}`
    : gtin
      ? `Barcode match • ${firstTitle ?? gtin}`
      : `${(result?.totalResults ?? 0).toLocaleString('en-AU')} live listings • eBay AU`

  const sold = result?.sold ?? null
  const askingRange = hasListings && result
    ? `${formatMoney(result.lowPrice, result.currency)}–${formatMoney(result.highPrice, result.currency)}`
    : null
  const conditionLine = identified?.condition
    ? { label: 'Condition (AI)', value: identified.condition, tone: 'gold' as const }
    : null

  // Sold prices lead when iSpy has enough real sales; live asking prices are the fallback.
  const hud = result ? (
    sold ? (
      <ScanHud
        tag={hudTag}
        headline={{ label: 'Sold median', value: formatMoney(sold.median) }}
        lines={[
          { label: 'Based on', value: SOLD_BASIS_LABEL[sold.basis](sold.count), tone: 'green' as const },
          ...(hasListings ? [{ label: 'Asking now', value: formatMoney(result.medianPrice, result.currency), tone: 'plain' as const }] : []),
          ...(conditionLine ? [conditionLine] : []),
        ]}
      />
    ) : (
      <ScanHud
        tag={hudTag}
        headline={{
          label: 'Median asking',
          value: hasListings ? formatMoney(result.medianPrice, result.currency) : 'No listings yet',
        }}
        lines={[
          ...(askingRange ? [{ label: 'Asking range', value: askingRange, tone: 'green' as const }] : []),
          conditionLine ?? { label: 'Listings found', value: result.totalResults.toLocaleString('en-AU'), tone: 'gold' as const },
        ]}
      />
    )
  ) : null

  const busyLabel = identifying
    ? mode === 'lot'
      ? 'Finding every item in the photo…'
      : 'Identifying the item…'
    : searching
      ? gtin
        ? 'Looking up this barcode on eBay AU…'
        : 'Checking live eBay AU prices…'
      : null

  const cameraPurpose = mode === 'barcode' ? 'barcode' : mode === 'live' || mode === 'lot' ? 'photo' : null
  // After a barcode is read the scanner pauses until "Scan another barcode", so a failed lookup can't re-fire on the same code.
  const showCamera = cameraPurpose !== null && cameraArmed && !result && !gtin && lotItems.length === 0

  const startPrompt = (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm" style={{ color: '#fef3c7', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
        {modeHint(mode)}
      </p>
      {cameraPurpose && !cameraArmed ? (
        <Button variant="gold" icon={<Icon name="photo_camera" size={20} />} onClick={() => setCameraArmed(true)}>
          Start camera
        </Button>
      ) : null}
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4 pb-1"
        style={{ paddingTop: 'calc(var(--status-bar-height, 0px) + 12px)' }}
      >
        <BrandLogo size={32} />
        <h1
          className="text-center text-2xl font-medium tracking-wide"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--ispy-charcoal)' }}
        >
          AI Scan &amp; Flow
        </h1>
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          aria-label={`Market scans: ${remainingLabel}. See plans`}
          className="flex items-center gap-1 rounded-full px-2.5 py-1"
          style={{
            background: 'rgba(254, 243, 199, 0.7)',
            border: '1px solid rgba(252, 211, 77, 0.6)',
            color: 'var(--ispy-obsidian)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Icon name="bolt" size={13} style={{ color: 'var(--primary-deep)' }} />
          <span className="tabular-nums">{remainingLabel}</span>
        </button>
      </header>

      <ModeBar mode={mode} onChange={changeMode} disabled={busy} />

      <div id="scan-panel" role="tabpanel" aria-labelledby={`mode-${mode}`} className="flex flex-col gap-3 px-4 pt-1">
        <LiveViewfinder
          camera={showCamera ? cameraPurpose : null}
          image={photo}
          busyLabel={busyLabel}
          hud={hud}
          placeholder={startPrompt}
          onCapture={(image) => void handlePhoto(image)}
          onBarcode={(code) => void handleBarcode(code)}
          captureLabel={mode === 'lot' ? 'Capture the lot' : 'Capture and price this item'}
        />

        {/* Mode controls */}
        {mode === 'single' && (
          <form
            className="flex gap-2"
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
              placeholder="e.g. LV Speedy 30, Nike Dunk Low…"
              maxLength={200}
              disabled={busy}
              enterKeyHint="search"
              className="min-w-0 flex-1 rounded-full px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--outline)', color: 'var(--on-surface)' }}
            />
            <Button type="button" variant="outline" aria-label="Upload a photo" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Icon name="photo_library" size={20} />
            </Button>
            <Button type="submit" variant="gold" disabled={busy || !query.trim()}>
              {searching ? <Icon name="hourglass_top" size={20} /> : 'Scan'}
            </Button>
          </form>
        )}

        {mode === 'barcode' && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void submitBarcode()
            }}
          >
            <label htmlFor="barcode-number" className="sr-only">
              Barcode number
            </label>
            <input
              id="barcode-number"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value.replace(/[^0-9\s-]/g, '').slice(0, 17))}
              placeholder="Or type the number, e.g. 9780141036144"
              disabled={busy}
              className="min-w-0 flex-1 rounded-full px-4 py-3 text-sm tabular-nums outline-none"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--outline)', color: 'var(--on-surface)' }}
            />
            <Button type="submit" variant="gold" disabled={busy || barcodeInput.replace(/\D/g, '').length < 8}>
              Look up
            </Button>
          </form>
        )}

        {(mode === 'live' || mode === 'lot') && !result && lotItems.length === 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-snug" style={{ color: 'var(--on-surface-muted)' }}>
              {mode === 'lot'
                ? 'Lay the items out and capture them together. Uses 1 AI photo ID; pricing each item uses 1 scan.'
                : 'Tap the gold button to identify and price. Uses 1 AI photo ID and 1 scan.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Icon name="photo_library" size={16} /> Upload
            </Button>
          </div>
        )}

        {(result || photo || gtin || lotItems.length > 0) && !busy && (
          <Button variant="secondary" size="sm" icon={<Icon name="restart_alt" size={16} />} onClick={resetScan}>
            {mode === 'barcode' ? 'Scan another barcode' : mode === 'single' ? 'Clear' : 'Scan again'}
          </Button>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        <div role="radiogroup" aria-label="Listing condition" className="flex flex-wrap items-center gap-2">
          {CONDITIONS.map((c) => {
            const active = c.id === condition
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={busy}
                onClick={() => setCondition(c.id)}
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: active ? 'var(--ispy-obsidian)' : 'transparent',
                  color: active ? 'var(--ispy-gold-light)' : 'var(--on-surface-variant)',
                  border: `1px solid ${active ? 'var(--ispy-obsidian)' : 'var(--outline)'}`,
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {c.label}
              </button>
            )
          })}
          {environment === 'sandbox' && <Badge variant="warning">Test data</Badge>}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 flex flex-col gap-2 rounded-[var(--radius-lg)] px-4 py-3"
          style={{ background: 'var(--error-container)' }}
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

      {lotItems.length > 0 && (
        <section aria-labelledby="lot-title" className="px-4 pt-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <h2 id="lot-title" className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)' }}>
            {lotItems.length} {lotItems.length === 1 ? 'item' : 'items'} in this lot
          </h2>
          <p className="mb-2 text-xs" style={{ color: 'var(--on-surface-muted)' }}>
            Price the ones worth checking. Each uses 1 scan.
          </p>
          <ul className="flex flex-col gap-2">
            {lotItems.map((item) => {
              const current = identified?.key === item.key
              return (
                <li
                  key={item.key}
                  className="marble-panel flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                  style={{ border: `1px solid ${current ? 'var(--primary-deep)' : 'var(--outline-variant)'}` }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                      {item.name}
                    </p>
                    <p className="truncate text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
                      {[item.brand, item.condition, `${item.confidence}% sure`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Button
                    variant={current && result ? 'secondary' : 'gold'}
                    size="sm"
                    disabled={busy}
                    onClick={() => void priceLotItem(item)}
                  >
                    {current && searching ? 'Pricing…' : current && result ? 'Priced' : 'Price it'}
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <ProfitPotential
        key={result?.timestamp ?? 'none'}
        salePrice={sold ? sold.median : result && hasListings ? result.medianPrice : null}
        priceBasis={sold ? 'sold' : 'asking'}
        currency={sold ? 'AUD' : (result?.currency ?? 'AUD')}
      />

      <div ref={panelRef} className="scroll-mt-4">
        {sold && (
          <div className="px-4 pt-4" style={{ animation: 'fadeInUp 0.35s ease-out' }}>
            <SoldPanel sold={sold} />
          </div>
        )}
        {result && !sold && hasListings && (
          <p className="px-4 pt-4 text-xs leading-snug" style={{ color: 'var(--on-surface-muted)' }}>
            iSpy doesn’t have enough recent eBay AU sales of this item yet, so the figures below are asking prices.
            Items often sell for less than they’re listed at.
            {result.soldTracking && (
              <>
                {' '}
                <span style={{ color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                  iSpy is now tracking eBay AU auctions for this item. Sold prices usually show up within 1–10 days.
                </span>
              </>
            )}
          </p>
        )}
        {result && hasListings && (
          <div className="px-4 pb-6 pt-4" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
            <ScanResultPanel
              title={gtin && firstTitle ? firstTitle : result.query}
              subtitle={`Based on ${listings.length} current eBay AU listings${result.condition === 'used' ? ' (pre-owned)' : result.condition === 'new' ? ' (new)' : ''}. Asking prices, not completed sales.`}
              valueLabel="Median asking price"
              value={formatMoney(result.medianPrice, result.currency)}
              range={{ low: formatMoney(result.lowPrice, result.currency), high: formatMoney(result.highPrice, result.currency) }}
              listings={listings.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.priceLabel,
                condition: item.condition,
                href: item.itemUrl || undefined,
                matchScore: item.matchScore,
              }))}
              variant="light"
            />
            <p className="mt-2 text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
              iSpy compares listing prices only. It doesn't authenticate items, so verify provenance before you buy.
            </p>
            {historyWarning && (
              <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-muted)' }}>
                This scan couldn't be saved to your history.
              </p>
            )}
            {environment === 'sandbox' && (
              <p className="mt-1 text-xs" style={{ color: 'var(--warning)' }}>
                These results come from eBay's test environment while live access is being enabled.
              </p>
            )}
          </div>
        )}

        {result && !hasListings && (
          <p className="px-4 pb-6 pt-4 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            {gtin
              ? `No eBay AU listings are linked to barcode ${gtin} right now. Try the name on the packaging in Single Item mode.`
              : `No current eBay AU listings match “${result.query}”. Try fewer words, or the brand and model only.`}
          </p>
        )}
      </div>
      {identified && (identified.originStory || identified.salesStrategy) && (
        <section className="marble-panel mx-4 mb-6 mt-2 rounded-2xl p-4" style={{ border: '1px solid var(--outline-variant)' }}>
          <Badge variant="gold">
            <Icon name="auto_awesome" size={12} /> AI notes · {identified.name}
          </Badge>
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
        </section>
      )}
    </div>
  )
}
