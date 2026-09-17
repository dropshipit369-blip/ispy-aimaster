import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'

export function AppLayout() {
  return (
    <div className="relative mx-auto min-h-screen max-w-[var(--app-max-width)]">
      <main className="pb-[calc(var(--bottom-nav-height)+var(--home-indicator-height))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
