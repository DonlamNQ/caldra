'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AppHeaderProps {
  current: string
  userEmail: string
  liveStatus?: boolean // dashboard only
}

const NAV = [
  { href: '/dashboard',      label: 'dashboard' },
  { href: '/alerts',         label: 'alertes' },
  { href: '/analytics',      label: 'analytics' },
  { href: '/settings/rules', label: 'règles' },
  { href: '/settings/api',   label: 'api' },
  { href: '/billing',        label: 'billing' },
]

export default function AppHeader({ current, userEmail, liveStatus }: AppHeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 52,
        borderBottom: '1px solid #1e1e35',
        background: '#0a0a14',
        fontFamily: 'system-ui, sans-serif',
        flexShrink: 0,
      }}
    >
      {/* Left — logo + nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <a href="/dashboard" style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#e2e8f0', textDecoration: 'none', marginRight: 6 }}>
          caldra
        </a>
        {NAV.map(item => (
          <span key={item.href} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ color: '#1e2035', fontSize: 14, padding: '0 2px' }}>/</span>
            <a
              href={item.href}
              style={{
                color: current === item.label ? '#cbd5e1' : '#374151',
                fontSize: 13,
                textDecoration: 'none',
                padding: '4px 6px',
                borderRadius: 6,
                fontWeight: current === item.label ? 600 : 400,
                background: current === item.label ? '#13132a' : 'transparent',
                transition: 'color 0.15s',
              }}
            >
              {item.label}
            </a>
          </span>
        ))}
      </div>

      {/* Right — live status + user + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {liveStatus !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: liveStatus ? '#22c55e' : '#374151',
              boxShadow: liveStatus ? '0 0 6px #22c55e' : 'none',
              transition: 'all 0.3s',
            }} />
            <span style={{ color: '#374151', fontSize: 11 }}>{liveStatus ? 'live' : 'connecting…'}</span>
          </div>
        )}
        <span style={{ color: '#374151', fontSize: 12 }}>{userEmail}</span>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: '1px solid #1e1e35', borderRadius: 6,
            color: '#374151', fontSize: 12, padding: '4px 10px', cursor: 'pointer',
          }}
        >
          Déconnexion
        </button>
      </div>
    </header>
  )
}
