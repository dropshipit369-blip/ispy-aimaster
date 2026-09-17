import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

const NAV_ITEMS = [
  { path: '/scan', icon: 'center_focus_strong', label: 'Scan' },
  { path: '/discover', icon: 'explore', label: 'Discover' },
  { path: '/collection', icon: 'collections_bookmark', label: 'Collection' },
  { path: '/pricing', icon: 'diamond', label: 'Pro' },
  { path: '/profile', icon: 'person', label: 'Profile' },
] as const

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[var(--app-max-width)] -translate-x-1/2 items-center justify-around border-t"
      style={{
        height: 'var(--bottom-nav-height)',
        background: 'var(--surface-card)',
        borderColor: 'var(--border-divider)',
        paddingBottom: 'var(--home-indicator-height)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-0.5 border-none bg-transparent px-3 py-1.5"
            style={{
              color: isActive ? 'var(--primary)' : 'var(--on-surface-muted)',
              cursor: 'pointer',
            }}
          >
            <Icon name={item.icon} size={22} fill={isActive} />
            <span
              className="font-body text-[10px] font-medium tracking-wide"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
