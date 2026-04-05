'use client'

import { createClient } from '@/lib/supabase/client'

interface AppShellProps {
  current: string
  userEmail: string
  children: React.ReactNode
  topBar?: React.ReactNode
  plan?: string
}

const NAV = [
  {
    href: '/dashboard', key: 'dashboard', label: 'Dashboard',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    href: '/alerts', key: 'alertes', label: 'Alertes',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
  {
    href: '/analytics', key: 'analytics', label: 'Analytics',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    href: '/settings/rules', key: 'règles', label: 'Règles',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  },
  {
    href: '/settings/api', key: 'api', label: 'API',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  },
  {
    href: '/billing', key: 'billing', label: 'Billing',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
]

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free:  { label: 'Free',     color: 'rgba(226,224,218,.4)',  bg: 'rgba(255,255,255,.05)' },
  pro:   { label: 'Pro',      color: 'rgba(220,80,60,.85)',   bg: 'rgba(220,80,60,.1)'  },
  team:  { label: 'Team',     color: 'rgba(251,191,36,.85)',  bg: 'rgba(251,191,36,.1)' },
}

export default function AppShell({ current, userEmail, children, topBar, plan }: AppShellProps) {
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const planCfg = plan ? (PLAN_LABELS[plan] ?? PLAN_LABELS.free) : null

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#06060a}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        @keyframes shellFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .sh-nav-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;color:rgba(226,224,218,.32);text-decoration:none;transition:all .15s;font-size:13px;font-family:'DM Sans',sans-serif;margin:1px 0;border:none;background:none;cursor:pointer;width:100%}
        .sh-nav-item:hover{color:rgba(226,224,218,.75);background:rgba(255,255,255,.04)}
        .sh-nav-active{color:#fff!important;background:rgba(255,255,255,.07)!important}
        .sh-signout{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:6px;color:rgba(226,224,218,.28);font-size:12px;font-family:'DM Sans',sans-serif;background:none;border:none;cursor:pointer;transition:all .15s;width:100%;text-align:left}
        .sh-signout:hover{color:rgba(226,224,218,.6);background:rgba(255,255,255,.03)}
      `}</style>

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
        background: '#0b0b12',
        borderRight: '0.5px solid rgba(255,255,255,.06)',
        display: 'flex', flexDirection: 'column',
        zIndex: 100,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>

        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '0.5px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'rgba(220,80,60,.12)',
                border: '0.5px solid rgba(220,80,60,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#dc503c' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', letterSpacing: '0.01em', lineHeight: 1.2 }}>Caldra</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', letterSpacing: 2, textTransform: 'uppercase' }}>Session</div>
              </div>
            </div>
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.2)', padding: '4px 12px 8px' }}>Navigation</div>
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`sh-nav-item${current === item.key ? ' sh-nav-active' : ''}`}
            >
              <span style={{ opacity: current === item.key ? 1 : 0.6, color: current === item.key ? '#dc503c' : 'currentColor', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Bottom: plan + user + sign out */}
        <div style={{ padding: '12px 8px', borderTop: '0.5px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          {planCfg && (
            <div style={{ padding: '0 12px', marginBottom: 10 }}>
              <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: planCfg.color, background: planCfg.bg, padding: '2px 8px', borderRadius: 4 }}>
                {planCfg.label}
              </span>
            </div>
          )}
          <div style={{ padding: '4px 12px', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: 'rgba(226,224,218,.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </div>
          </div>
          <button className="sh-signout" onClick={handleSignOut}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Content */}
      <div style={{ marginLeft: 220, minHeight: '100vh', background: '#06060a', display: 'flex', flexDirection: 'column' }}>
        {/* Optional top bar */}
        {topBar && (
          <div style={{
            height: 46,
            borderBottom: '0.5px solid rgba(255,255,255,.06)',
            display: 'flex', alignItems: 'center',
            padding: '0 2rem',
            background: 'rgba(11,11,18,.7)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
            position: 'sticky', top: 0, zIndex: 50,
          }}>
            {topBar}
          </div>
        )}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </>
  )
}
