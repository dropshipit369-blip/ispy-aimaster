import { useNavigate } from 'react-router-dom'
import { Button, Icon, Badge, GoldDivider, Card, BrandLogo, BrandLockup } from '@/components'

const FEATURES = [
  {
    icon: 'photo_camera',
    title: 'Snap It or Type It',
    desc: 'Photograph an item and our AI reads labels, logos and model numbers to name it. Or just type what it is.',
  },
  {
    icon: 'storefront',
    title: 'Live eBay AU Prices',
    desc: 'See the median, low and high asking prices from current eBay AU listings in seconds, with links to each one.',
  },
  {
    icon: 'diamond',
    title: 'Pre-owned Market Check',
    desc: 'Filter to pre-owned listings only, so a used bag or watch is compared with used, not brand new.',
  },
  {
    icon: 'barcode_scanner',
    title: 'Barcodes and Whole Lots',
    desc: 'Scan a UPC, EAN or ISBN for an exact product match, or photograph a box of items and price the ones worth it.',
  },
  {
    icon: 'savings',
    title: 'Profit After eBay Fees',
    desc: "Enter what you'd pay and see your margin after eBay AU fees, whether you sell fee-free or on a Pro plan.",
  },
  {
    icon: 'history',
    title: 'Every Scan Saved',
    desc: 'Your scans are saved with the prices at the time, so you can review your haul when you get home.',
  },
]

const HOW_IT_WORKS = [
  { icon: 'photo_camera', title: 'Point your camera', desc: 'Take a photo of one item at the op shop, market or auction.' },
  { icon: 'auto_awesome', title: 'iSpy identifies it', desc: 'AI names the brand and model and builds the right eBay search.' },
  { icon: 'payments', title: 'Decide in seconds', desc: "Compare today's eBay AU asking prices with the price tag before you buy." },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4" style={{ paddingTop: 'calc(var(--status-bar-height) + 12px)' }}>
        <BrandLockup size={36} />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
            Pricing
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/scan')}>
            Open App
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-5 pb-10 pt-6 text-center">
        <BrandLogo variant="full" size={148} className="mx-auto mb-5" />
        <Badge variant="gold" className="mb-4">
          <Icon name="auto_awesome" size={12} /> Resale Intelligence
        </Badge>
        <h1
          className="mx-auto max-w-md text-4xl font-bold leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          Know What It's Worth{' '}
          <span style={{ color: 'var(--primary)' }}>Before You Buy</span>
        </h1>
        <p
          className="mx-auto mt-4 max-w-sm text-base leading-relaxed"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Photograph an item, let AI identify it, and see what similar items are listed for on
          eBay AU — before you hand over any cash.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="gold"
            size="lg"
            icon={<Icon name="center_focus_strong" size={20} />}
            onClick={() => navigate('/scan')}
          >
            Start Scanning Free
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/pricing')}>
            View Plans
          </Button>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--on-surface-muted)' }}>
          No credit card required · 3 free scans daily
        </p>
      </section>

      <GoldDivider variant="gradient" className="mx-5" />

      {/* Features */}
      <section className="px-5 py-10">
        <h2
          className="mb-8 text-center text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          Your Competitive Edge
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title} variant="filled" className="flex flex-col gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)]"
                style={{ background: 'var(--primary-tint)' }}
              >
                <Icon name={f.icon} size={22} style={{ color: 'var(--primary)' }} />
              </div>
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--on-surface)', fontFamily: 'var(--font-body)' }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                {f.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <GoldDivider variant="gradient" className="mx-5" />

      {/* How it works */}
      <section className="px-5 py-10">
        <h2
          className="mb-6 text-center text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          How It Works
        </h2>
        <ol className="flex flex-col gap-4">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title}>
              <Card variant="elevated" className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
                  style={{ background: 'var(--primary-tint)', color: 'var(--primary)' }}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                    <Icon name={step.icon} size={16} style={{ color: 'var(--primary)' }} />
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                    {step.desc}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-xs leading-relaxed" style={{ color: 'var(--on-surface-muted)' }}>
          Prices shown are current asking prices from active listings, not completed sales.
        </p>
      </section>

      {/* Final CTA */}
      <section
        className="px-5 py-12 text-center"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--primary-tint) 100%)',
        }}
      >
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          Stop Guessing.{' '}
          <span style={{ color: 'var(--primary)' }}>Start Knowing.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Built in Melbourne for Australian resellers. Start with 3 free market scans a day — no card needed.
        </p>
        <Button
          variant="gold"
          size="lg"
          className="mt-6"
          icon={<Icon name="rocket_launch" size={20} />}
          onClick={() => navigate('/scan')}
        >
          Get Started — It's Free
        </Button>
      </section>

      {/* Footer */}
      <footer className="px-5 py-6 text-center" style={{ borderTop: '1px solid var(--border-divider)' }}>
        <p className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
          © 2026 ispy.ai · Melbourne, Australia · ABN pending
        </p>
        <div className="mt-2 flex justify-center gap-4">
          {['Terms', 'Privacy', 'Contact'].map((link) => (
            <a
              key={link}
              href="#"
              className="text-xs no-underline"
              style={{ color: 'var(--primary)' }}
            >
              {link}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
