'use client'

import { createClient } from '@/lib/supabase/client'

interface AppHeaderProps {
  current: string
  userEmail: string
  liveStatus?: boolean
}

const NAV = [
  { href: '/dashboard',      label: 'dashboard',  display: 'Dashboard' },
  { href: '/alerts',         label: 'alertes',    display: 'Alertes' },
  { href: '/analytics',      label: 'analytics',  display: 'Analytics' },
  { href: '/settings/rules', label: 'règles',     display: 'Règles' },
  { href: '/settings/api',   label: 'api',        display: 'API' },
  { href: '/billing',        label: 'billing',    display: 'Billing' },
]

export default function AppHeader({ current, userEmail, liveStatus }: AppHeaderProps) {
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      <style>{`
        .ap-link{font-size:9px;font-weight:400;letter-spacing:2px;text-transform:uppercase;color:rgba(232,230,224,.35);text-decoration:none;transition:color .2s;padding:5px 0;font-family:'DM Sans',sans-serif}
        .ap-link:hover{color:rgba(232,230,224,.75)}
        .ap-link-active{color:#fff!important}
        .ap-signout{font-size:9px;padding:6px 13px;background:transparent;border:0.5px solid rgba(255,255,255,.13);border-radius:4px;color:rgba(232,230,224,.4);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .2s}
        .ap-signout:hover{background:rgba(255,255,255,.05);color:rgba(232,230,224,.8);border-color:rgba(255,255,255,.25)}
      `}</style>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 3rem', height: 52,
        borderBottom: '0.5px solid rgba(255,255,255,.07)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        background: 'rgba(7,7,14,.92)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        {/* Left: logo + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <a href="/dashboard" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 3, marginRight: '2rem' }}>
            <span style={{ fontWeight: 300, fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
              Cald<span style={{ color: '#dc503c' }}>ra</span>
            </span>
            <span style={{ fontSize: 7, letterSpacing: 7, textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', lineHeight: 1 }}>Session</span>
          </a>
          <div style={{ width: 0.5, height: 22, background: 'rgba(255,255,255,.08)', marginRight: '2rem' }} />
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            {NAV.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`ap-link${current === item.label ? ' ap-link-active' : ''}`}
              >
                {item.display}
              </a>
            ))}
          </nav>
        </div>

        {/* Right: live dot (optional) + email + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          {liveStatus !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: liveStatus ? '#22c55e' : 'rgba(255,255,255,.18)',
                boxShadow: liveStatus ? '0 0 7px rgba(34,197,94,.55)' : 'none',
                transition: 'all .3s',
              }} />
              <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: liveStatus ? 'rgba(34,197,94,.65)' : 'rgba(255,255,255,.2)' }}>
                {liveStatus ? 'live' : 'sync…'}
              </span>
            </div>
          )}
          <span style={{ fontSize: 11, color: 'rgba(232,230,224,.25)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </span>
          <button className="ap-signout" onClick={handleSignOut}>Déconnexion</button>
        </div>
      </header>
    </>
  )
}
