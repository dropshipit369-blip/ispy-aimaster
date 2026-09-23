import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

const NAV_ITEMS = [
  { path: '/scan', icon: 'center_focus_strong', label: 'Scans', also: [] as string[] },
  { path: '/history', icon: 'bar_chart', label: 'History', also: [] as string[] },
  { path: '/pricing', icon: 'trending_up', label: 'Plans', also: ['/membership'] },
  { path: '/profile', icon: 'person', label: 'Profile', also: [] as string[] },
]

/** Cream glass tab bar with a gold-dark active dot, per the AI Scan & Flow design. */
export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-50 grid w-full max-w-[var(--app-max-width)] -translate-x-1/2 grid-cols-4 items-center justify-items-center border-t px-4 pt-2"
      style={{
        minHeight: 'var(--bottom-nav-height)',
        background: 'var(--ispy-nav)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'rgba(214, 211, 209, 0.6)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.03)',
        paddingBottom: 'calc(var(--home-indicator-height) + 10px)',
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
            className="group flex w-full flex-col items-center border-none bg-transparent"
            style={{ cursor: 'pointer' }}
          >
            <span className="relative p-1">
              <Icon
                name={item.icon}
                size={24}
                weight={isActive ? 500 : 300}
                style={{ color: isActive ? 'var(--primary-deep)' : '#a8a29e' }}
              />
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--primary-deep)' }}
                />
              )}
            </span>
            <span
              className="mt-0.5 text-[10.5px] tracking-tight"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--ispy-obsidian)' : 'var(--on-surface-muted)',
              }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
