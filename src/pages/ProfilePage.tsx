import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Badge, GoldDivider, Card, Button, StatTile } from '@/components'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getScanHistory } from '@/services/scans'

interface Profile {
  display_name: string | null
  full_name: string | null
  plan: string
  scans_today: number
  scans_limit: number
  created_at: string
}

export function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [totalScans, setTotalScans] = useState(0)

  useEffect(() => {
    if (!user) return

    // Fetch profile
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile)
      })

    // Get total scan count
    getScanHistory(user.id, 1000).then((scans) => setTotalScans(scans.length))
  }, [user])

  const displayName = profile?.display_name ?? profile?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
    : '—'

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const PROFILE_SECTIONS = [
    {
      title: 'Account',
      items: [
        { icon: 'person', label: 'Display Name', value: displayName },
        { icon: 'email', label: 'Email', value: user?.email ?? '—' },
        { icon: 'diamond', label: 'Plan', value: profile?.plan ?? 'free', badge: (profile?.plan === 'pro' || profile?.plan === 'elite') ? 'gold' as const : undefined },
        { icon: 'calendar_today', label: 'Member Since', value: memberSince },
      ],
    },
    {
      title: 'Scanning',
      items: [
        { icon: 'center_focus_strong', label: 'Scans Today', value: `${profile?.scans_today ?? 0} / ${profile?.scans_limit ?? 3}` },
        { icon: 'history', label: 'Total Scans', value: String(totalScans) },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications', label: 'Notifications', value: 'On' },
        { icon: 'dark_mode', label: 'Appearance', value: 'Auto' },
        { icon: 'language', label: 'Currency', value: 'AUD $' },
        { icon: 'security', label: 'Privacy', value: 'Standard' },
      ],
    },
  ]

  return (
    <div
      className="flex min-h-screen flex-col"
      data-screen="profile"
      style={{ background: 'var(--bg)' }}
    >
      {/* Header with gradient */}
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
          <span
            className="text-3xl font-bold"
            style={{ color: 'var(--bg)', fontFamily: 'var(--font-display)' }}
          >
            {initial}
          </span>
          <div
            className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2"
            style={{ background: 'var(--success)', borderColor: 'var(--bg)' }}
          />
        </div>

        <h1
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--on-surface)' }}
        >
          {displayName}
        </h1>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Resale Intelligence Operator
        </p>

        <div className="mt-2 flex justify-center">
          <Badge variant="gold">
            <Icon name="workspace_premium" size={12} /> {(profile?.plan ?? 'free').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        <StatTile label="Scans" value={totalScans} trend={{ direction: 'up', value: 'total' }} />
        <StatTile label="Today" value={profile?.scans_today ?? 0} />
        <StatTile label="Limit" value={profile?.scans_limit ?? 3} />
      </div>

      <GoldDivider variant="gradient" className="mx-4" />

      {/* Sections */}
      {PROFILE_SECTIONS.map((section) => (
        <div key={section.title} className="px-4 py-4">
          <h3
            className="mb-3 text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)' }}
          >
            {section.title}
          </h3>
          <Card variant="filled" className="!p-0 overflow-hidden">
            {section.items.map((item, i) => (
              <button
                key={i}
                className="flex w-full items-center gap-3 border-b border-none bg-transparent px-4 py-3 text-left last:border-b-0"
                style={{
                  borderBottomColor: 'var(--border-subtle)',
                  borderBottomWidth: i < section.items.length - 1 ? 1 : 0,
                  borderBottomStyle: 'solid',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]"
                  style={{ background: 'var(--primary-tint)' }}
                >
                  <Icon name={item.icon} size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge ? (
                    <Badge variant={item.badge}>{item.value}</Badge>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                      {item.value}
                    </span>
                  )}
                  <Icon name="chevron_right" size={18} style={{ color: 'var(--on-surface-muted)' }} />
                </div>
              </button>
            ))}
          </Card>
        </div>
      ))}

      {/* Sign out */}
      <div className="px-4 pb-6">
        <Button variant="ghost" fullWidth style={{ color: 'var(--error)' }} onClick={handleSignOut}>
          <Icon name="logout" size={18} />
          Sign Out
        </Button>
        <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--on-surface-muted)' }}>
          iSpy AI v1.0.0 · Melbourne, AU
        </p>
      </div>
    </div>
  )
}
