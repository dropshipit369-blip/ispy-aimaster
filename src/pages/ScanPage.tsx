import { useState } from 'react'
import { ScanViewfinder, ScanResultPanel, FibonacciSpiral, Badge, Icon, Button } from '@/components'

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

export function ScanPage() {
  const [hasResult, setHasResult] = useState(true)

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>
      {/* Status bar */}
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'calc(var(--status-bar-height) + 12px)' }}
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
            <span>3 / 3</span>
          </button>
          <Icon name="history" size={22} style={{ color: 'var(--on-surface-variant)' }} />
        </div>
      </header>

      {/* AR HUD badges */}
      <div className="flex items-center gap-2 px-4 pb-2">
        <Badge variant="success">
          <Icon name="fiber_manual_record" size={8} /> LIVE
        </Badge>
        <Badge variant="subtle">TensorFlow 2.x</Badge>
        <Badge variant="subtle">
          <Icon name="speed" size={12} /> 0.3s
        </Badge>
      </div>

      {/* Viewfinder */}
      <div className="relative px-4">
        <ScanViewfinder showLaser={!hasResult}>
          {/* Fibonacci spiral overlay */}
          <FibonacciSpiral
            size={280}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"
          />

          {/* Camera placeholder */}
          <div
            className="flex h-full items-center justify-center"
            style={{ minHeight: 240, background: 'var(--surface-dim)' }}
          >
            <div className="text-center">
              <Icon name="center_focus_strong" size={48} style={{ color: 'var(--primary-container)', opacity: 0.5 }} />
              <p className="mt-2 text-sm" style={{ color: 'var(--on-surface-muted)' }}>
                Point camera at item to scan
              </p>
            </div>
          </div>

          {/* Detection pins (when result active) */}
          {hasResult && (
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

      {/* Scan button */}
      {!hasResult && (
        <div className="flex justify-center py-4">
          <Button
            variant="gold"
            size="lg"
            icon={<Icon name="center_focus_strong" size={20} />}
            onClick={() => setHasResult(true)}
          >
            Scan Item
          </Button>
        </div>
      )}

      {/* Results */}
      {hasResult && (
        <div className="flex-1 px-4 pt-4" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          <ScanResultPanel
            primaryItem={MOCK_RESULT.primaryItem}
            secondaryItems={MOCK_RESULT.secondaryItems}
            totalValue={MOCK_RESULT.totalValue}
            variant="light"
          />
        </div>
      )}
    </div>
  )
}
