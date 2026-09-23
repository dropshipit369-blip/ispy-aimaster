import { useId, useState } from 'react'
import { estimateProfit, SELLER_PLANS, type SellerPlan } from '@/lib/fees'
import { formatMoney } from '@/lib/format'

const PLAN_KEY = 'ispy.sellerPlan'

function readPlan(): SellerPlan {
  try {
    const saved = localStorage.getItem(PLAN_KEY)
    return saved === 'pro_starter' ? 'pro_starter' : 'free'
  } catch {
    return 'free'
  }
}

interface ProfitPotentialProps {
  /** Expected sale price for the latest scan (sold median when known, else median asking), or null. */
  salePrice: number | null
  /** Whether salePrice is a median of real sales or of current asking prices. */
  priceBasis: 'sold' | 'asking'
  currency: string
}

/** The signature teal-and-gold wave. */
function Wave() {
  return (
    <svg aria-hidden="true" className="h-full w-full" fill="none" preserveAspectRatio="none" viewBox="0 0 360 80">
      <path d="M0,45 C70,20 140,65 210,38 C280,10 320,40 360,25 L360,80 L0,80 Z" fill="#2d6482" fillOpacity="0.85" />
      <path d="M0,52 C85,30 150,68 235,42 C295,25 330,48 360,38 L360,80 L0,80 Z" fill="#437f9e" fillOpacity="0.65" />
      <path d="M0,45 C70,20 140,65 210,38 C280,10 320,40 360,25" stroke="#d5b879" strokeLinecap="round" strokeWidth="2.2" />
      <ellipse cx="65" cy="36" rx="16" ry="4" stroke="#c5a869" strokeOpacity="0.8" strokeWidth="1.2" />
      <ellipse cx="65" cy="36" rx="24" ry="6" stroke="#c5a869" strokeOpacity="0.5" strokeWidth="0.8" />
      <path d="M260,22 C285,15 310,26 335,18" stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.65" strokeWidth="1.2" />
    </svg>
  )
}

/**
 * Profit on the scanned item: the expected sale price (median of real sales when iSpy has them,
 * otherwise median asking) minus what you'd pay and eBay AU's selling fees for your plan. Postage is
 * left out (the buyer pays it), though Pro-plan fees also apply to postage charged.
 * Remount with a new `key` per scan so the buy price starts empty for each item.
 */
export function ProfitPotential({ salePrice, priceBasis, currency }: ProfitPotentialProps) {
  const id = useId()
  const [plan, setPlan] = useState<SellerPlan>(readPlan)
  const [buyInput, setBuyInput] = useState('')

  const choosePlan = (next: SellerPlan) => {
    setPlan(next)
    try {
      localStorage.setItem(PLAN_KEY, next)
    } catch {
      // Private browsing: the choice lasts for this visit only.
    }
  }

  const buyPrice = Number.parseFloat(buyInput.replace(/[^0-9.]/g, ''))
  const hasBuy = buyInput.trim() !== '' && Number.isFinite(buyPrice) && buyPrice >= 0
  const estimate = salePrice && hasBuy ? estimateProfit(salePrice, buyPrice, plan) : null

  let pill: string
  if (!salePrice) pill = 'Scan an item to see your margin'
  else if (!estimate) pill = 'Enter what you’d pay'
  else {
    const sign = estimate.profit >= 0 ? '+' : '−'
    const amount = formatMoney(Math.abs(estimate.profit), currency)
    pill = estimate.roi === null ? `${sign}${amount} (free find)` : `${sign}${estimate.roi.toFixed(1).replace('-', '')}% (${sign}${amount})`
  }

  return (
    <section aria-labelledby={`${id}-title`} className="relative flex flex-col items-center px-5 pt-3 text-center">
      <h2 id={`${id}-title`} className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        Profit Potential
      </h2>

      <div className="pointer-events-none relative my-0 h-16 w-full">
        <Wave />
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-xs tracking-tight" style={{ color: 'var(--on-surface)' }}>
        <span className="font-medium">Profit on this item:</span>
        <span
          className="rounded-full px-2 py-0.5 font-bold tabular-nums"
          style={{
            background: 'rgba(254, 243, 199, 0.7)',
            border: '1px solid rgba(252, 211, 77, 0.6)',
            color: estimate && estimate.profit < 0 ? 'var(--error)' : 'var(--ispy-obsidian)',
          }}
        >
          {pill}
        </span>
      </div>

      {salePrice !== null && (
        <div className="mt-3 flex w-full flex-col gap-2 text-left">
          <div className="flex items-center gap-2">
            <label htmlFor={`${id}-buy`} className="shrink-0 text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
              You’d pay
            </label>
            <div
              className="flex min-w-0 flex-1 items-center rounded-full px-3"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--outline)' }}
            >
              <span aria-hidden="true" className="text-sm" style={{ color: 'var(--on-surface-muted)' }}>
                $
              </span>
              <input
                id={`${id}-buy`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={buyInput}
                onChange={(e) => setBuyInput(e.target.value.slice(0, 10))}
                className="min-w-0 flex-1 border-none bg-transparent px-1 py-2 text-sm tabular-nums outline-none"
                style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-body)' }}
              />
            </div>
          </div>
          <div role="radiogroup" aria-label="Your eBay selling plan" className="grid grid-cols-2 gap-2">
            {(Object.keys(SELLER_PLANS) as SellerPlan[]).map((key) => {
              const active = plan === key
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choosePlan(key)}
                  className="rounded-xl px-3 py-2 text-left"
                  style={{
                    background: active ? 'var(--primary-tint)' : 'var(--surface-card)',
                    border: `1px solid ${active ? 'var(--primary-deep)' : 'var(--outline-variant)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <span className="block text-xs font-semibold" style={{ color: 'var(--on-surface)' }}>
                    {SELLER_PLANS[key].label}
                  </span>
                  <span className="block text-[11px] leading-snug" style={{ color: 'var(--on-surface-muted)' }}>
                    {SELLER_PLANS[key].detail}
                  </span>
                </button>
              )
            })}
          </div>
          {estimate && (
            <p className="text-[11px] leading-snug tabular-nums" style={{ color: 'var(--on-surface-muted)' }}>
              {formatMoney(salePrice, currency)} {priceBasis === 'sold' ? 'median sold' : 'median asking'} −{' '}
              {formatMoney(estimate.fee, currency)} eBay fees − {formatMoney(buyPrice, currency)} cost.{' '}
              {priceBasis === 'sold'
                ? 'Based on what this item has actually sold for.'
                : 'Asking prices guide, not guarantee, the sale price; items often sell for less.'}{' '}
              Postage not included{plan === 'pro_starter' ? '; on Pro plans eBay also takes 13.4% of any postage you charge' : ''}.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
