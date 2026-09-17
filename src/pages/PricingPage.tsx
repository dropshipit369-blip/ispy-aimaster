import { useState } from 'react'
import { PricingCard, Icon, Badge, GoldDivider, Button } from '@/components'

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'Try iSpy AI with basic scanning capabilities',
    features: [
      { text: '3 scans per day', included: true },
      { text: 'Basic item identification', included: true },
      { text: 'Price estimates', included: true },
      { text: 'Advanced analytics', included: false },
      { text: 'Bulk scanning', included: false },
      { text: 'API access', included: false },
    ],
    ctaLabel: 'Start Free',
  },
  {
    name: 'Pro',
    price: 29,
    description: 'For serious resellers who need deeper intelligence',
    isPopular: true,
    features: [
      { text: '50 scans per day', included: true },
      { text: 'AI item identification', included: true },
      { text: 'Market pricing intelligence', included: true },
      { text: 'Margin calculator', included: true },
      { text: 'Sales channel suggestions', included: true },
      { text: 'Priority support', included: true },
    ],
    ctaLabel: 'Upgrade to Pro',
  },
  {
    name: 'Unlimited',
    price: 79,
    description: 'Full-spectrum intelligence for power sellers',
    features: [
      { text: 'Unlimited scans', included: true },
      { text: 'Everything in Pro', included: true },
      { text: 'Bulk batch scanning', included: true },
      { text: 'API access', included: true },
      { text: 'Custom alerts & watchlists', included: true },
      { text: 'White-label reports', included: true },
    ],
    ctaLabel: 'Go Unlimited',
  },
]

const FAQ = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No lock-in contracts. Cancel through your profile and keep access until the end of your billing period.',
  },
  {
    q: 'What counts as a scan?',
    a: "Each time you point the camera at an item and tap Scan. Re-viewing saved results doesn't count.",
  },
  {
    q: 'Is there a free trial for Pro?',
    a: "The Free tier is your trial — upgrade when you're ready. First month Pro comes with a 7-day money-back guarantee.",
  },
]

export function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div
      className="flex min-h-screen flex-col"
      data-screen="pricing"
      style={{ background: 'var(--bg)' }}
    >
      {/* Header */}
      <header
        className="px-4 pt-4 text-center"
        style={{ paddingTop: 'calc(var(--status-bar-height) + 16px)' }}
      >
        <Badge variant="gold" className="mb-3">
          <Icon name="diamond" size={12} /> PRICING
        </Badge>
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          Find Your Edge
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Every scan is a potential profit. Choose the plan that matches your volume.
        </p>
      </header>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 py-5">
        <span
          className="text-sm font-medium"
          style={{ color: billingCycle === 'monthly' ? 'var(--primary)' : 'var(--on-surface-muted)' }}
        >
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
          className="relative h-7 w-12 rounded-full border-none"
          style={{
            background: billingCycle === 'annual'
              ? 'var(--primary-container)'
              : 'var(--surface-elevated)',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <div
            className="absolute top-0.5 h-6 w-6 rounded-full transition-all duration-200"
            style={{
              left: billingCycle === 'annual' ? 'calc(100% - 26px)' : 2,
              background: billingCycle === 'annual' ? 'var(--bg)' : 'var(--on-surface-muted)',
            }}
          />
        </button>
        <span
          className="text-sm font-medium"
          style={{ color: billingCycle === 'annual' ? 'var(--primary)' : 'var(--on-surface-muted)' }}
        >
          Annual
        </span>
        {billingCycle === 'annual' && (
          <Badge variant="success">Save 20%</Badge>
        )}
      </div>

      {/* Pricing cards */}
      <div className="flex flex-col gap-4 px-4">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.name}
            {...plan}
            price={billingCycle === 'annual' ? Math.round(plan.price * 0.8) : plan.price}
            period={billingCycle === 'annual' ? '/mo (billed yearly)' : '/mo'}
          />
        ))}
      </div>

      <GoldDivider variant="gradient" className="mx-4 my-8" />

      {/* FAQ */}
      <div className="px-4 pb-8">
        <h2
          className="mb-4 text-center text-lg font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)' }}
        >
          Common Questions
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] overflow-hidden"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between border-none bg-transparent px-4 py-3 text-left"
                style={{ color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                <span className="text-sm font-semibold">{item.q}</span>
                <Icon
                  name={openFaq === i ? 'expand_less' : 'expand_more'}
                  size={20}
                  style={{ color: 'var(--on-surface-variant)' }}
                />
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

      {/* Bottom CTA */}
      <div
        className="sticky bottom-[var(--bottom-nav-height)] px-4 py-3"
        style={{
          background: 'linear-gradient(to top, var(--bg) 80%, transparent)',
        }}
      >
        <Button variant="gold" fullWidth size="lg">
          <Icon name="rocket_launch" size={20} />
          Start Scanning Smarter
        </Button>
      </div>
    </div>
  )
}
