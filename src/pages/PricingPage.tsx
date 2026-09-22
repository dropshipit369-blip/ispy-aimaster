import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PricingCard, Icon, Badge, GoldDivider, Button } from '@/components'
import { formatDateAU } from '@/lib/format'
import { getMembership, openBillingPortal, startCheckout, type Membership, type PaidPlan } from '@/services/billing'
import { getScanAllowance, PLAN_LABELS, type PlanType } from '@/services/usage'
import { PLANS } from '../../shared/plans'

/** Daily market-scan caps enforced by ispy_market_scan_cap(). Keep in sync with that SQL function. */
const MARKET_SCANS_PER_DAY: Record<PlanType, number> = { free: 3, pro: 50, unlimited: -1 }

const aiIds = (plan: PlanType) => {
  const n = PLANS[plan].liveRequestsPerMonth
  return n < 0 ? 'Unlimited AI photo IDs' : `${n} AI photo IDs per month`
}
const marketScans = (plan: PlanType) => {
  const n = MARKET_SCANS_PER_DAY[plan]
  return n < 0 ? 'Unlimited market scans (fair use)' : `${n} market scans per day`
}

const PLAN_CARDS: { plan: PlanType; description: string; popular?: boolean; extras: string[] }[] = [
  {
    plan: 'free',
    description: 'Try iSpy on your next op-shop or garage-sale run.',
    extras: ['eBay AU asking-price comparison', 'Pre-owned-only market check', 'Scan history'],
  },
  {
    plan: 'pro',
    description: 'For resellers sourcing every week.',
    popular: true,
    extras: ['Everything in Free'],
  },
  {
    plan: 'unlimited',
    description: 'For full-time flippers working auctions and estate sales.',
    extras: ['Everything in Pro'],
  },
]

const FAQ = [
  {
    q: 'What counts as a scan?',
    a: 'A market scan is one eBay AU price lookup, typed or from a photo. A photo scan also uses one AI photo ID. Lookups that fail because of an eBay or network error are not counted.',
  },
  {
    q: 'When do my scans reset?',
    a: 'Market scans reset every day at midnight Melbourne time. AI photo IDs reset at the start of each month.',
  },
  {
    q: 'Are these sold prices?',
    a: "No. iSpy shows current asking prices from active eBay AU listings. They're a guide to today's market, not a guarantee of what an item will sell for.",
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Open Manage subscription to change plans, update your card or cancel. Your paid plan stays active until the end of the period you have paid for.',
  },
]

export function PricingPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [membership, setMembership] = useState<Membership | null>(null)
  const [fallbackPlan, setFallbackPlan] = useState<PlanType | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const success = params.get('success') === 'true'
  const canceled = params.get('canceled') === 'true'
  const [activation, setActivation] = useState<'idle' | 'waiting' | 'active' | 'slow'>(success ? 'waiting' : 'idle')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const m = await getMembership()
      setMembership(m)
      return m
    } catch {
      getScanAllowance().then((a) => setFallbackPlan(a.plan_type)).catch(() => undefined)
      return null
    }
  }, [])

  useEffect(() => {
    if (!success) void refresh()
  }, [refresh, success])

  // After Stripe Checkout, the webhook activates the plan within seconds. Poll until it lands.
  useEffect(() => {
    if (!success) return
    let cancelled = false
    void (async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
        const m = await refresh()
        if (m?.subscribed) {
          if (!cancelled) setActivation('active')
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
      if (!cancelled) setActivation('slow')
    })()
    return () => {
      cancelled = true
    }
  }, [success, refresh])

  const currentPlan: PlanType = membership?.plan_type ?? fallbackPlan ?? 'free'

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please retry.')
      setBusy(null)
    }
  }

  const manage = () => run('portal', openBillingPortal)

  const cta = (plan: PlanType): { label: string; disabled: boolean; onSelect?: () => void } => {
    if (plan === currentPlan) {
      return plan === 'free'
        ? { label: 'Your current plan', disabled: true }
        : { label: busy === 'portal' ? 'Opening…' : 'Manage subscription', disabled: busy !== null, onSelect: manage }
    }
    if (plan === 'free') {
      return { label: 'Change in billing portal', disabled: busy !== null, onSelect: manage }
    }
    if (currentPlan !== 'free') {
      return { label: busy === 'portal' ? 'Opening…' : `Switch to ${PLAN_LABELS[plan]}`, disabled: busy !== null, onSelect: manage }
    }
    const paid = plan as PaidPlan
    return {
      label: busy === paid ? 'Opening checkout…' : `Upgrade to ${PLAN_LABELS[plan]}`,
      disabled: busy !== null,
      onSelect: () => run(paid, () => startCheckout(paid)),
    }
  }

  const dismissReturn = () => {
    params.delete('success')
    params.delete('canceled')
    setParams(params, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col" data-screen="pricing" style={{ background: 'var(--bg)' }}>
      <header className="px-4 pt-4 text-center" style={{ paddingTop: 'calc(var(--status-bar-height, 0px) + 16px)' }}>
        <Badge variant="gold" className="mb-3">
          <Icon name="diamond" size={12} /> PLANS
        </Badge>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>
          Find Your Edge
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          You're on <strong>{PLAN_LABELS[currentPlan]}</strong>. Choose the volume that matches how often you source.
        </p>
      </header>

      {success && (
        <div
          role="status"
          className="mx-4 mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] px-4 py-3"
          style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
        >
          <Icon name={activation === 'active' ? 'check_circle' : 'hourglass_top'} size={20} />
          <div className="flex-1 text-sm">
            {activation === 'active' && `Payment received — you're on ${PLAN_LABELS[currentPlan]}. Happy flipping.`}
            {activation === 'waiting' && 'Payment received. Activating your plan…'}
            {activation === 'slow' &&
              'Payment received. Stripe is still confirming it — your plan will switch on automatically within a few minutes.'}
          </div>
          <button type="button" onClick={dismissReturn} aria-label="Dismiss" className="border-none bg-transparent" style={{ color: 'inherit', cursor: 'pointer' }}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      {canceled && (
        <div
          role="status"
          className="mx-4 mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] px-4 py-3"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', color: 'var(--on-surface-variant)' }}
        >
          <Icon name="info" size={20} />
          <p className="flex-1 text-sm">Checkout cancelled. You haven't been charged.</p>
          <button type="button" onClick={dismissReturn} aria-label="Dismiss" className="border-none bg-transparent" style={{ color: 'inherit', cursor: 'pointer' }}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      {membership?.billing_verification_required && (
        <p className="mx-4 mt-4 rounded-[var(--radius-lg)] px-4 py-3 text-sm" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
          We're verifying your billing account. If this doesn't clear shortly, contact support.
        </p>
      )}
      {membership?.subscribed && membership.cancel_at_period_end && membership.subscription_end && (
        <p className="mx-4 mt-4 rounded-[var(--radius-lg)] px-4 py-3 text-sm" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
          Your {PLAN_LABELS[currentPlan]} plan is cancelled and ends on {formatDateAU(membership.subscription_end)}.
        </p>
      )}
      {error && (
        <p role="alert" className="mx-4 mt-4 rounded-[var(--radius-lg)] px-4 py-3 text-sm" style={{ background: 'var(--error-container, #fde8e8)', color: 'var(--error)' }}>
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 px-4 pt-6">
        {PLAN_CARDS.map((card) => {
          const action = cta(card.plan)
          return (
            <PricingCard
              key={card.plan}
              name={PLAN_LABELS[card.plan]}
              description={card.description}
              price={PLANS[card.plan].monthlyAmountMinor / 100}
              period="/month"
              isPopular={card.popular}
              features={[marketScans(card.plan), aiIds(card.plan), ...card.extras].map((text) => ({ text, included: true }))}
              ctaLabel={action.label}
              ctaDisabled={action.disabled}
              onSelect={action.onSelect}
            />
          )
        })}
      </div>

      <p className="mx-auto mt-4 max-w-sm px-4 text-center text-xs leading-relaxed" style={{ color: 'var(--on-surface-muted)' }}>
        Prices are in Australian dollars and are the total you pay each month. Payments are processed securely by Stripe.
      </p>

      <GoldDivider variant="gradient" className="mx-4 my-8" />

      <div className="px-4 pb-8">
        <h2 className="mb-4 text-center text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>
          Common questions
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((item, i) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-[var(--radius-lg)]"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="flex w-full items-center justify-between border-none bg-transparent px-4 py-3 text-left"
                style={{ color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                <span className="text-sm font-semibold">{item.q}</span>
                <Icon name={openFaq === i ? 'expand_less' : 'expand_more'} size={20} style={{ color: 'var(--on-surface-variant)' }} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3">
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8">
        <Button variant="outline" fullWidth onClick={() => navigate('/scan')}>
          <Icon name="center_focus_strong" size={20} />
          Back to scanning
        </Button>
      </div>
    </div>
  )
}
