import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Icon } from '@/components'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTimeAU, formatMoney } from '@/lib/format'
import { deleteScan, getScanHistory, type SavedScan } from '@/services/scans'

const PAGE_SIZE = 20

export function HistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scans, setScans] = useState<SavedScan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(
    async (before?: string) => {
      if (!user) return
      const page = await getScanHistory(user.id, { limit: PAGE_SIZE, before })
      setScans((current) => (before ? [...current, ...page] : page))
      setHasMore(page.length === PAGE_SIZE)
    },
    [user],
  )

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [load])

  const loadMore = async () => {
    const last = scans.at(-1)
    if (!last) return
    setLoadingMore(true)
    try {
      await load(last.created_at)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingMore(false)
    }
  }

  const remove = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      return
    }
    try {
      await deleteScan(id)
      setScans((current) => current.filter((scan) => scan.id !== id))
      setConfirmDelete(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="flex min-h-screen flex-col" data-screen="history" style={{ background: 'var(--bg)' }}>
      <header className="px-4 pb-3" style={{ paddingTop: 'calc(var(--status-bar-height, 0px) + 16px)' }}>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>
          Scan history
        </h1>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Every market scan you've run, newest first.
        </p>
      </header>

      {error && (
        <p role="alert" className="mx-4 mb-3 rounded-[var(--radius-lg)] px-4 py-3 text-sm" style={{ background: 'var(--error-container, #fde8e8)', color: 'var(--error)' }}>
          {error}
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Icon name="hourglass_top" size={28} style={{ color: 'var(--primary)', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
        </div>
      )}

      {!loading && scans.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Icon name="manage_search" size={44} style={{ color: 'var(--primary)', opacity: 0.6 }} />
          <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            No scans yet. Your results are saved here automatically.
          </p>
          <Button variant="gold" icon={<Icon name="center_focus_strong" size={20} />} onClick={() => navigate('/scan')}>
            Run your first scan
          </Button>
        </div>
      )}

      <ul className="flex flex-col gap-3 px-4 pb-6">
        {scans.map((scan) => {
          const isOpen = expanded === scan.id
          const listings = Array.isArray(scan.results) ? scan.results.slice(0, 6) : []
          const currency = listings[0]?.currency ?? 'AUD'
          return (
            <li key={scan.id}>
              <Card variant="filled" className="!p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : scan.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 border-none bg-transparent px-4 py-3 text-left"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                      {scan.query}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--on-surface-muted)' }}>
                      {formatDateTimeAU(scan.created_at)} · {scan.item_count} listing{scan.item_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                      {scan.total_value != null ? formatMoney(Number(scan.total_value), currency) : '—'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--on-surface-muted)' }}>
                      median ask
                    </span>
                  </div>
                  <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={20} style={{ color: 'var(--on-surface-muted)' }} />
                </button>

                {isOpen && (
                  <div className="border-t px-4 pb-3 pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                    {listings.length === 0 ? (
                      <p className="py-2 text-sm" style={{ color: 'var(--on-surface-muted)' }}>
                        No listings were found for this scan.
                      </p>
                    ) : (
                      <ul className="flex flex-col">
                        {listings.map((item) => (
                          <li key={item.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                            <a
                              href={item.itemUrl || undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 py-2 no-underline"
                            >
                              <span className="line-clamp-2 text-sm" style={{ color: 'var(--on-surface)' }}>
                                {item.name}
                              </span>
                              <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
                                {item.priceLabel ?? formatMoney(item.price, item.currency)}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Badge variant="subtle">Prices as of {formatDateTimeAU(scan.created_at)}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        style={{ color: 'var(--error)' }}
                        onClick={() => void remove(scan.id)}
                      >
                        <Icon name="delete" size={16} />
                        {confirmDelete === scan.id ? 'Tap again to delete' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ul>

      {hasMore && (
        <div className="px-4 pb-8">
          <Button variant="outline" fullWidth onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load older scans'}
          </Button>
        </div>
      )}
    </div>
  )
}
