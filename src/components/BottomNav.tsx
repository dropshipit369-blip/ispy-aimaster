import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

const NAV_ITEMS = [
  { path: '/scan', icon: 'center_focus_strong', label: 'Scan', also: [] as string[] },
  { path: '/history', icon: 'history', label: 'History', also: [] as string[] },
  { path: '/pricing', icon: 'diamond', label: 'Plans', also: ['/membership'] },
  { path: '/profile', icon: 'person', label: 'Profile', also: [] as string[] },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[var(--app-max-width)] -translate-x-1/2 items-center justify-around border-t"
      style={{
        height: 'var(--bottom-nav-height)',
        background: 'var(--surface-card)',
        borderColor: 'var(--border-divider)',
        paddingBottom: 'var(--home-indicator-height)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = [item.path, ...item.also].some(
          (path) => location.pathname === path || location.pathname.startsWith(path + '/'),
        )
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-col items-center gap-0.5 border-none bg-transparent px-3 py-1.5"
            style={{
              color: isActive ? 'var(--primary)' : 'var(--on-surface-muted)',
              cursor: 'pointer',
            }}
          >
            <Icon name={item.icon} size={22} fill={isActive} />
            <span className="font-body text-[10px] font-medium tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
