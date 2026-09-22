import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Badge, GoldDivider, Card, Button, StatTile } from '@/components'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { formatResetTime } from '@/lib/format'
import { openBillingPortal } from '@/services/billing'
import { countScans } from '@/services/scans'
import { getScanAllowance, isUnlimited, PLAN_LABELS, type ScanAllowance } from '@/services/usage'

interface Profile {
  display_name: string | null
  full_name: string | null
  created_at: string
}

interface Row {
  icon: string
  label: string
  value?: ReactNode
  onClick?: () => void
}

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [allowance, setAllowance] = useState<ScanAllowance | null>(null)
  const [totalScans, setTotalScans] = useState<number | null>(null)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('display_name, full_name, created_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data as Profile)
      })
    getScanAllowance().then(setAllowance).catch(() => undefined)
    countScans(user.id).then(setTotalScans).catch(() => undefined)
  }, [user])

  const displayName = profile?.display_name ?? profile?.full_name ?? user?.email?.split('@')[0] ?? 'Reseller'
  const initial = displayName.charAt(0).toUpperCase()
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
    : '—'
  const plan = allowance?.plan_type ?? 'free'
  const todayLabel = !allowance ? '—' : isUnlimited(allowance) ? `${allowance.scans_used} (unlimited)` : `${allowance.scans_used} / ${allowance.scans_limit}`

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const manageMembership = async () => {
    if (plan === 'free') {
      navigate('/pricing')
      return
    }
    setOpeningPortal(true)
    setPortalError(null)
    try {
      await openBillingPortal()
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : 'Could not open billing. Please retry.')
      setOpeningPortal(false)
    }
  }

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Account',
      rows: [
        { icon: 'person', label: 'Name', value: displayName },
        { icon: 'email', label: 'Email', value: user?.email ?? '—' },
        { icon: 'calendar_today', label: 'Member since', value: memberSince },
      ],
    },
    {
      title: 'Membership',
      rows: [
        {
          icon: 'diamond',
          label: 'Plan',
          value: <Badge variant={plan === 'free' ? 'subtle' : 'gold'}>{PLAN_LABELS[plan]}</Badge>,
        },
        {
          icon: 'workspace_premium',
          label: plan === 'free' ? 'Upgrade plan' : openingPortal ? 'Opening billing…' : 'Manage subscription',
          onClick: () => void manageMembership(),
        },
      ],
    },
    {
      title: 'Scanning',
      rows: [
        { icon: 'center_focus_strong', label: 'Market scans today', value: todayLabel },
        ...(allowance && !isUnlimited(allowance)
          ? [{ icon: 'schedule', label: 'Resets at', value: formatResetTime(allowance.resets_at) }]
          : []),
        { icon: 'history', label: 'Scan history', value: totalScans ?? '—', onClick: () => navigate('/history') },
        { icon: 'payments', label: 'Currency', value: 'AUD' },
      ],
    },
  ]

  return (
    <div className="flex min-h-screen flex-col" data-screen="profile" style={{ background: 'var(--bg)' }}>
      <div
        className="relative px-4 pb-6 pt-4 text-center"
        style={{
          paddingTop: 'calc(var(--status-bar-height, 0px) + 16px)',
          background: 'linear-gradient(180deg, var(--surface-container-high) 0%, var(--bg) 100%)',
        }}
      >
        <div
          className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, var(--primary-container), var(--primary))',
            boxShadow: '0 0 24px var(--primary-glow, rgba(197,168,105,0.2))',
          }}
        >
          <span className="text-3xl font-bold" style={{ color: 'var(--bg)', fontFamily: 'var(--font-display)' }}>
            {initial}
          </span>
        </div>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}>
          {displayName}
        </h1>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          {user?.email}
        </p>
        <div className="mt-2 flex justify-center">
          <Badge variant="gold">
            <Icon name="workspace_premium" size={12} /> {PLAN_LABELS[plan].toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        <StatTile label="Total scans" value={totalScans ?? '—'} />
        <StatTile label="Today" value={allowance?.scans_used ?? '—'} />
        <StatTile
          label="Left today"
          value={!allowance ? '—' : isUnlimited(allowance) ? '∞' : (allowance.scans_remaining ?? 0)}
        />
      </div>

      <GoldDivider variant="gradient" className="mx-4" />

      {portalError && (
        <p role="alert" className="mx-4 mt-4 rounded-[var(--radius-lg)] px-4 py-3 text-sm" style={{ background: 'var(--error-container, #fde8e8)', color: 'var(--error)' }}>
          {portalError}
        </p>
      )}

      {sections.map((section) => (
        <div key={section.title} className="px-4 py-4">
          <h3
            className="mb-3 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)' }}
          >
            {section.title}
          </h3>
          <Card variant="filled" className="!p-0 overflow-hidden">
            {section.rows.map((row, i) => {
              const inner = (
                <>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                    style={{ background: 'var(--primary-tint)' }}
                  >
                    <Icon name={row.icon} size={18} style={{ color: 'var(--primary)' }} />
                  </div>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                    {row.label}
                  </span>
                  {row.value !== undefined && (
                    <span className="min-w-0 truncate text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {row.value}
                    </span>
                  )}
                  {row.onClick && <Icon name="chevron_right" size={18} style={{ color: 'var(--on-surface-muted)' }} />}
                </>
              )
              const rowStyle = {
                borderBottom: i < section.rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }
              return row.onClick ? (
                <button
                  key={row.label}
                  type="button"
                  onClick={row.onClick}
                  className="flex w-full items-center gap-3 border-none bg-transparent px-4 py-3 text-left"
                  style={{ ...rowStyle, cursor: 'pointer' }}
                >
                  {inner}
                </button>
              ) : (
                <div key={row.label} className="flex items-center gap-3 px-4 py-3" style={rowStyle}>
                  {inner}
                </div>
              )
            })}
          </Card>
        </div>
      ))}

      <div className="px-4 pb-6">
        <Button variant="ghost" fullWidth style={{ color: 'var(--error)' }} onClick={() => void handleSignOut()}>
          <Icon name="logout" size={18} />
          Sign out
        </Button>
        <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
          iSpy AI · Melbourne, Australia
        </p>
      </div>
    </div>
  )
}
