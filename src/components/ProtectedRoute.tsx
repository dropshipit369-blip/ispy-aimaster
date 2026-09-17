import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/Icon'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <Icon
          name="hourglass_top"
          size={32}
          style={{ color: 'var(--primary)', animation: 'pulse-glow 1.5s ease-in-out infinite' }}
        />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
