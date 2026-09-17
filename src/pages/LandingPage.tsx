import { useNavigate } from 'react-router-dom'
import { Button, Icon, Badge, GoldDivider, Card } from '@/components'

const FEATURES = [
  {
    icon: 'center_focus_strong',
    title: 'Instant AI Scanning',
    desc: 'Point, shoot, profit. Our AI identifies items and fetches real-time market data in under a second.',
  },
  {
    icon: 'trending_up',
    title: 'Margin Intelligence',
    desc: 'Know your profit before you buy. See estimated selling prices, margins, and the best sales channels.',
  },
  {
    icon: 'shield',
    title: 'Authenticity Verification',
    desc: 'AI-powered provenance checking cross-references serial numbers, materials, and known counterfeits.',
  },
  {
    icon: 'analytics',
    title: 'Market Analytics',
    desc: 'Track price trends, seasonal demand, and comparable sales across eBay, Depop, Facebook Marketplace, and more.',
  },
]

const TESTIMONIALS = [
  {
    quote: 'Found a $400 vintage jacket at an op shop for $12. iSpy told me exactly what it was worth before I even picked it up.',
    name: 'Sarah K.',
    role: 'Vintage Reseller, Sydney',
  },
  {
    quote: 'I use iSpy at every garage sale and auction. It paid for itself in the first weekend.',
    name: 'Marcus T.',
    role: 'eBay Power Seller',
  },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4" style={{ paddingTop: 'calc(var(--status-bar-height) + 12px)' }}>
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)' }}
          >
            iSpy
          </span>
          <Badge variant="gold">AI</Badge>
        </div>
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
      <section className="px-5 pb-10 pt-8 text-center">
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
          AI-powered scanning that instantly identifies items, checks authenticity,
          and shows you the profit — all from your phone camera.
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

      {/* Social proof */}
      <section className="px-5 py-10">
        <h2
          className="mb-6 text-center text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          Resellers Love iSpy
        </h2>
        <div className="flex flex-col gap-4">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} variant="elevated">
              <p
                className="text-sm italic leading-relaxed"
                style={{ color: 'var(--on-surface)' }}
              >
                "{t.quote}"
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--primary-tint)', color: 'var(--primary)' }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
                    {t.role}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
          Join thousands of Australian resellers using AI to find hidden profit in everyday items.
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
          © 2026 iSpy AI · Melbourne, Australia · ABN pending
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
