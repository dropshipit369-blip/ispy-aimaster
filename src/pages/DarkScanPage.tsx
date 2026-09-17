import { ScanViewfinder, ScanResultPanel, FibonacciSpiral, Badge, Icon } from '@/components'

const MOCK_RESULT = {
  primaryItem: {
    name: 'Louis Vuitton Speedy 30',
    confidence: 97,
    estimatedValue: '$1,450',
    margin: '+62%',
  },
  secondaryItems: [
    { name: 'Hermès Twilly Scarf', confidence: 89, estimatedValue: '$280' },
    { name: 'Chanel No.5 Vintage', confidence: 82, estimatedValue: '$195' },
  ],
  totalValue: '$1,925',
}

export function DarkScanPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      data-screen="dark-scan"
      style={{ background: 'var(--bg)' }}
    >
      {/* Luxury header */}
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ paddingTop: 'calc(var(--status-bar-height) + 16px)' }}
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
        <Badge variant="subtle">Lot #2847</Badge>
      </div>

      {/* Viewfinder — boutique variant */}
      <div className="relative px-4">
        <ScanViewfinder showLaser>
          <FibonacciSpiral
            size={280}
            color="var(--primary)"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"
          />
          <div
            className="flex h-full items-center justify-center"
            style={{ minHeight: 240, background: 'var(--surface-dim)' }}
          >
            <div className="text-center">
              <Icon
                name="center_focus_strong"
                size={48}
                style={{ color: 'var(--primary)', opacity: 0.4 }}
              />
              <p
                className="mt-2 text-xs uppercase tracking-[0.15em]"
                style={{ color: 'var(--on-surface-variant)', fontFamily: "'Italiana', var(--font-body)" }}
              >
                Provenance Verification Active
              </p>
            </div>
          </div>

          {/* Detection pins */}
          <div
            className="absolute rounded-full"
            style={{
              top: '30%', left: '40%', width: 12, height: 12,
              background: 'var(--primary)',
              boxShadow: '0 0 12px var(--primary)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}
          />
        </ScanViewfinder>
      </div>

      {/* Results */}
      <div className="flex-1 px-4 pt-4" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
        <ScanResultPanel
          primaryItem={MOCK_RESULT.primaryItem}
          secondaryItems={MOCK_RESULT.secondaryItems}
          totalValue={MOCK_RESULT.totalValue}
          variant="dark"
        />

        {/* Provenance register — dark scan exclusive */}
        <div
          className="mt-3 rounded-[var(--radius-xl)] p-4"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h4
            className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]"
            style={{ color: 'var(--primary)' }}
          >
            Provenance Register
          </h4>
          {[
            { label: 'Serial Verification', status: 'Confirmed', icon: 'verified' },
            { label: 'Authentication Score', status: '97/100', icon: 'shield' },
            { label: 'Market Comparables', status: '12 found', icon: 'analytics' },
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
        </div>
      </div>
    </div>
  )
}
