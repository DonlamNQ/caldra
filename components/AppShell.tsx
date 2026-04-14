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
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    href: '/alerts', key: 'alertes', label: 'Alertes',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
  {
    href: '/analytics', key: 'analytics', label: 'Analytics',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    href: '/settings/rules', key: 'règles', label: 'Règles',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  },
  {
    href: '/settings/api', key: 'api', label: 'API',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  },
  {
    href: '/settings/integrations', key: 'intégrations', label: 'Intégrations',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  },
  {
    href: '/billing', key: 'billing', label: 'Billing',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><rect x="1" y="4" width="22" height="16"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
]

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:  { label: 'FREE',     color: 'rgba(232,223,192,.3)' },
  pro:   { label: 'PRO',      color: '#f5a623' },
  team:  { label: 'TEAM',     color: '#f5a623' },
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
        html,body{margin:0;padding:0;background:#0f0d00}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#3d3000;border-radius:0}
        .sh-nav-item{
          display:flex;align-items:center;gap:9px;padding:7px 10px;
          color:rgba(232,223,192,.3);text-decoration:none;
          transition:color .12s,background .12s;font-size:12px;
          font-family:'IBM Plex Mono',monospace;letter-spacing:.03em;
          margin:1px 0;border:none;background:none;cursor:pointer;width:100%;
          border-left:2px solid transparent;
        }
        .sh-nav-item:hover{color:rgba(232,223,192,.7);background:rgba(245,166,35,.04);border-left-color:rgba(245,166,35,.2)}
        .sh-nav-active{color:#f5a623!important;background:rgba(245,166,35,.08)!important;border-left-color:#f5a623!important}
        .sh-signout{
          display:flex;align-items:center;gap:8px;padding:7px 10px;
          color:rgba(232,223,192,.25);font-size:11px;
          font-family:'IBM Plex Mono',monospace;background:none;border:none;
          cursor:pointer;transition:color .12s;width:100%;text-align:left;
          letter-spacing:.03em;
        }
        .sh-signout:hover{color:rgba(232,223,192,.55)}
      `}</style>

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 200,
        background: '#0a0900',
        borderRight: '1px solid #3d3000',
        display: 'flex', flexDirection: 'column',
        zIndex: 100,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>

        {/* Logo */}
        <div style={{ padding: '18px 12px 14px', borderBottom: '1px solid #3d3000', flexShrink: 0 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24,
                background: 'rgba(245,166,35,.1)',
                border: '1px solid rgba(245,166,35,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{ width: 7, height: 7, background: '#f5a623' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f5a623', letterSpacing: '.12em' }}>CALDRA</div>
                <div style={{ fontSize: 8, color: 'rgba(232,223,192,.25)', letterSpacing: '.2em', textTransform: 'uppercase' }}>terminal</div>
              </div>
            </div>
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          <div style={{ fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(232,223,192,.18)', padding: '6px 12px 8px', fontFamily: "'IBM Plex Mono',monospace" }}>Navigation</div>
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`sh-nav-item${current === item.key ? ' sh-nav-active' : ''}`}
            >
              <span style={{ opacity: current === item.key ? 1 : 0.5, flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '10px 0', borderTop: '1px solid #3d3000', flexShrink: 0 }}>
          {planCfg && (
            <div style={{ padding: '0 12px', marginBottom: 8 }}>
              <span style={{ fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', color: planCfg.color, border: `1px solid ${planCfg.color}44`, padding: '2px 6px', fontFamily: "'IBM Plex Mono',monospace" }}>
                {planCfg.label}
              </span>
            </div>
          )}
          <div style={{ padding: '3px 12px', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: 'rgba(232,223,192,.22)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono',monospace" }}>
              {userEmail}
            </div>
          </div>
          <button className="sh-signout" onClick={handleSignOut}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Content */}
      <div style={{ marginLeft: 200, minHeight: '100vh', background: '#0f0d00', display: 'flex', flexDirection: 'column' }}>
        {topBar && (
          <div style={{
            height: 44,
            borderBottom: '1px solid #3d3000',
            display: 'flex', alignItems: 'center',
            padding: '0 1.5rem',
            background: '#0a0900',
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
