import { useNavigate } from 'react-router-dom'
import { Badge, Icon, Card, Button, GoldDivider } from '@/components'

const SOCIAL_COPY = {
  headline: 'Know before you buy.',
  body: 'Stop guessing what that vintage leather bag, mid-century ceramic, or antique timepiece is worth. Point your camera, and iSpy AI cross-indexes over 100K+ weekly Australian sold comps in 0.4s.',
  bullets: [
    'Net profit margins calculated after platform fees & shipping',
    'Real-time AU eBay, Gumtree & 1stDibs data',
    'Single item or batch lot multi-bounding',
  ],
  cta: 'Tap the link in bio to start scanning free on iOS and Web.',
}

const DISPLAY_ADS = {
  headlines: [
    'See What Others Miss | ISPY',
    'AU Resale Comps in 0.4s',
    'Know Before You Buy Today',
  ],
  description:
    'Instant Australian resale comps, net profit margins & sell-through velocity on your phone.',
  cta: 'Start Scanning Free →',
}

const ASSETS = [
  { name: 'Social Media Card', spec: '1:1 Aspect Ratio (Instagram / Square)' },
  { name: 'Digital Banner Ad', spec: '16:9 Aspect Ratio (Display / Web)' },
  { name: 'Email Header Banner', spec: '16:9 Aspect Ratio (Newsletter / Header)' },
]

export function MarketingKitPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-5 py-4"
        style={{ paddingTop: 'calc(var(--status-bar-height) + 12px)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)' }}
          >
            iSpy
          </span>
          <Badge variant="gold">AI</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Back
        </Button>
      </nav>

      {/* Header */}
      <header className="px-5 pb-6 pt-4">
        <Badge variant="gold" className="mb-3">
          <Icon name="campaign" size={12} /> Marketing Asset Suite
        </Badge>
        <h1
          className="text-3xl font-bold leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          Campaign Kit & Editorial Copy
        </h1>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          Comprehensive marketing collateral and multi-channel campaign copy aligned
          with the iSpy AI luxury editorial visual system.
        </p>
      </header>

      <GoldDivider variant="gradient" className="mx-5" />

      {/* Email Campaign Preview */}
      <section className="px-5 py-8">
        <Card variant="outlined" className="overflow-hidden !p-0">
          {/* Email chrome bar */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: 'var(--surface-container-high)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: '#e57373' }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: '#ffb74d' }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: '#81c784' }}
              />
              <span
                className="ml-2 text-[11px]"
                style={{ fontFamily: 'monospace', color: 'var(--on-surface-muted)' }}
              >
                newsletter-dispatch-v1.html
              </span>
            </div>
            <Badge variant="gold">Email Channel Asset</Badge>
          </div>

          {/* Email body */}
          <div className="px-5 py-6">
            <p
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: 'var(--primary)', borderBottom: '1px solid var(--primary)', display: 'inline-block', paddingBottom: 2 }}
            >
              The Curator's Weekly Dispatch
            </p>

            <h2
              className="mb-4 text-xl font-bold leading-snug"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
            >
              You walked past $1,400 AUD on Sunday.{' '}
              <span
                className="italic font-normal"
                style={{ color: 'var(--primary)' }}
              >
                Next time, you won't.
              </span>
            </h2>

            <p
              className="mb-3 text-sm leading-relaxed"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Whether you're sweeping vintage racks on Chapel Street, triaging an
              estate lot in Double Bay, or browsing weekend markets in Paddington,
              true treasure doesn't announce itself. It hides beneath patina,
              unbranded tags, and dust.
            </p>

            <p
              className="mb-4 text-sm leading-relaxed"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              With <strong style={{ color: 'var(--on-surface)' }}>iSpy AI</strong>,
              Australia's most discerning antique curators and high-margin pickers
              turn their mobile camera into an institutional-grade forensic terminal.
              Real sold comps from eBay AU, Depop, and local auction houses give you
              net margins in under 0.4 seconds.
            </p>

            {/* Pull quote */}
            <div
              className="my-5 rounded-r-[var(--radius-lg)] p-4"
              style={{
                background: 'var(--primary-tint)',
                borderLeft: '2px solid var(--primary)',
              }}
            >
              <p
                className="text-sm italic leading-relaxed"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
              >
                "iSpy spotted an unmarked mid-century Danish teak credenza at a rural
                clearance sale. Comped at $1,850 AUD on 1stDibs; acquired for $120.
                It paid for a year of our business operations in 3 seconds."
              </p>
              <span
                className="mt-2 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--on-surface-muted)' }}
              >
                — Julian S., Melbourne Curatorial Vault
              </span>
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="gold"
                size="lg"
                fullWidth
                icon={<Icon name="qr_code_scanner" size={18} />}
                onClick={() => navigate('/scan')}
              >
                Claim 3 Daily Free Scans
              </Button>
              <p
                className="mt-2 text-[11px]"
                style={{ color: 'var(--on-surface-muted)' }}
              >
                Instant Web & iOS access · No credit card · Calibrated for AU
                secondary markets
              </p>
            </div>
          </div>
        </Card>
      </section>

      <GoldDivider variant="gradient" className="mx-5" />

      {/* Multi-Channel Copy */}
      <section className="px-5 py-8">
        <h2
          className="mb-6 text-center text-xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          Multi-Channel Copy Vault
        </h2>

        <div className="flex flex-col gap-4">
          {/* Social Copy */}
          <Card variant="filled" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge variant="gold">Social Channels</Badge>
              <span className="text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
                Instagram / LinkedIn / X
              </span>
            </div>

            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--on-surface)' }}
            >
              High-Impact Social Ad Copy
            </h3>

            <div
              className="rounded-[var(--radius-lg)] p-4"
              style={{
                background: 'var(--surface-container-high)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--on-surface)' }}
              >
                Headline: {SOCIAL_COPY.headline}
              </p>
              <p
                className="mb-3 text-sm leading-relaxed"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                {SOCIAL_COPY.body}
              </p>
              <div className="mb-3 flex flex-col gap-1">
                {SOCIAL_COPY.bullets.map((b) => (
                  <p key={b} className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    ✦ {b}
                  </p>
                ))}
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                👉 {SOCIAL_COPY.cta}
              </p>
            </div>

            <div
              className="flex items-center justify-between pt-2 text-[11px]"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <span style={{ color: 'var(--on-surface-muted)' }}>
                Pairs with: Social Media Card Asset (1:1)
              </span>
              <span className="font-medium" style={{ color: 'var(--primary)' }}>
                Ready to deploy
              </span>
            </div>
          </Card>

          {/* Display / PPC Copy */}
          <Card variant="filled" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge variant="gold">Digital Display / PPC</Badge>
              <span className="text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
                Google Ads / Meta Ads
              </span>
            </div>

            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--on-surface)' }}
            >
              Display Ad Headlines & Descriptions
            </h3>

            <div
              className="rounded-[var(--radius-lg)] p-4"
              style={{
                background: 'var(--surface-container-high)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <p
                className="mb-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--primary)' }}
              >
                Headline Variations (30 char)
              </p>
              <div className="mb-3 flex flex-col gap-1">
                {DISPLAY_ADS.headlines.map((h) => (
                  <p key={h} className="text-sm" style={{ color: 'var(--on-surface)' }}>
                    • {h}
                  </p>
                ))}
              </div>

              <p
                className="mb-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--primary)' }}
              >
                Description (90 char)
              </p>
              <p
                className="mb-3 text-sm leading-relaxed"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                {DISPLAY_ADS.description}
              </p>

              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--primary)' }}
              >
                Primary Call to Action
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                {DISPLAY_ADS.cta}
              </p>
            </div>

            <div
              className="flex items-center justify-between pt-2 text-[11px]"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <span style={{ color: 'var(--on-surface-muted)' }}>
                Pairs with: Digital Banner Ad Asset (16:9)
              </span>
              <span className="font-medium" style={{ color: 'var(--primary)' }}>
                Ready to deploy
              </span>
            </div>
          </Card>
        </div>
      </section>

      <GoldDivider variant="gradient" className="mx-5" />

      {/* Asset Manifest */}
      <section className="px-5 py-8">
        <h3
          className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'var(--on-surface-muted)' }}
        >
          Generated Marketing Asset Manifest
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ASSETS.map((a, i) => (
            <Card key={a.name} variant="outlined" className="!p-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                {i + 1}. {a.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
                {a.spec}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-5 py-6 text-center"
        style={{ borderTop: '1px solid var(--border-divider)' }}
      >
        <p className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
          © 2026 iSpy AI · Melbourne, Australia · ABN pending
        </p>
      </footer>
    </div>
  )
}
