import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button, Icon, GoldDivider, BrandLogo } from '@/components'

export function AuthPage() {
  const navigate = useNavigate()
  const { signUp, signIn } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error: err } = await signUp(email, password)
      if (err) {
        setError(err.message)
      } else {
        setConfirmSent(true)
      }
    } else {
      const { error: err } = await signIn(email, password)
      if (err) {
        setError(err.message)
      } else {
        navigate('/scan')
      }
    }
    setLoading(false)
  }

  if (confirmSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5" style={{ background: 'var(--bg)' }}>
        <Icon name="mark_email_read" size={48} style={{ color: 'var(--primary)' }} />
        <h2
          className="mt-4 text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          Check your inbox
        </h2>
        <p className="mt-2 text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          We sent a confirmation link to <strong style={{ color: 'var(--on-surface)' }}>{email}</strong>.
          Click it to activate your account, then come back and sign in.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => { setConfirmSent(false); setMode('login') }}>
          Back to Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-5 pt-12 text-center">
        <BrandLogo variant="full" size={128} className="mx-auto" />
        <p className="mt-3 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          {mode === 'login' ? 'Welcome back, operator.' : 'Join the intelligence network.'}
        </p>
      </div>

      <GoldDivider variant="gradient" className="mx-5 mt-6" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full max-w-sm px-5">
        <div className="flex flex-col gap-4">
          <div>
            <label
              className="mb-1 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--on-surface-muted)' }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-[var(--radius-lg)] border px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--on-surface)',
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--on-surface-muted)' }}
            >
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full rounded-[var(--radius-lg)] border px-4 py-3 text-sm outline-none"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--on-surface)',
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}

          <Button
            variant="gold"
            size="lg"
            fullWidth
            icon={<Icon name={mode === 'login' ? 'login' : 'person_add'} size={20} />}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </div>
      </form>

      {/* Toggle mode */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          className="border-none bg-transparent text-sm"
          style={{ color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto px-5 pb-6 pt-8 text-center">
        <p className="text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
