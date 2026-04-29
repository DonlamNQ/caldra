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
  pro:      { label: 'PRO',      color: 'rgba(234,232,245,.5)' },
  sentinel: { label: 'SENTINEL', color: '#dc503c' },
}

export default function AppShell({ current, userEmail, children, topBar, plan }: AppShellProps) {
  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const planCfg = plan ? (PLAN_LABELS[plan] ?? PLAN_LABELS.pro) : null

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#08080d}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
        .sh-nav-item{
          display:flex;align-items:center;gap:9px;padding:7px 12px;
          color:rgba(234,232,245,.3);text-decoration:none;
          transition:color .12s,background .12s;font-size:11px;
          font-family:var(--font-geist-mono),monospace;letter-spacing:.04em;
          margin:1px 0;border:none;background:none;cursor:pointer;width:100%;
          border-left:2px solid transparent;
        }
        .sh-nav-item:hover{color:rgba(234,232,245,.65);background:rgba(255,255,255,.03);border-left-color:rgba(255,255,255,.12)}
        .sh-nav-active{color:#eae8f5!important;background:rgba(220,80,60,.07)!important;border-left-color:#dc503c!important}
        .sh-signout{
          display:flex;align-items:center;gap:8px;padding:7px 12px;
          color:rgba(234,232,245,.22);font-size:11px;
          font-family:var(--font-geist-mono),monospace;background:none;border:none;
          cursor:pointer;transition:color .12s;width:100%;text-align:left;
          letter-spacing:.03em;
        }
        .sh-signout:hover{color:rgba(234,232,245,.5)}
      `}</style>

      {/* Sidebar */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 196,
        background: '#0c0c15',
        borderRight: '0.5px solid rgba(255,255,255,.06)',
        display: 'flex', flexDirection: 'column',
        zIndex: 100,
      }}>

        {/* Logo */}
        <div style={{ padding: '18px 14px 14px', borderBottom: '0.5px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6,
                background: 'rgba(220,80,60,.12)',
                border: '0.5px solid rgba(220,80,60,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#dc503c' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#eae8f5', letterSpacing: 6, textTransform: 'uppercase', fontFamily: 'var(--font-geist-mono),monospace' }}>CALDRA</div>
                <div style={{ fontSize: 7, color: 'rgba(234,232,245,.2)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 1 }}>SESSION</div>
              </div>
            </div>
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`sh-nav-item${current === item.key ? ' sh-nav-active' : ''}`}
            >
              <span style={{ opacity: current === item.key ? 1 : 0.45, flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '10px 0', borderTop: '0.5px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          {planCfg && (
            <div style={{ padding: '0 14px', marginBottom: 8 }}>
              <span style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: planCfg.color, border: `0.5px solid ${planCfg.color}55`, padding: '2px 7px', borderRadius: 3, fontFamily: 'var(--font-geist-mono),monospace' }}>
                {planCfg.label}
              </span>
            </div>
          )}
          <div style={{ padding: '3px 14px', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: 'rgba(234,232,245,.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-geist-mono),monospace' }}>
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
      <div style={{ marginLeft: 196, minHeight: '100vh', background: '#08080d', display: 'flex', flexDirection: 'column' }}>
        {topBar && (
          <div style={{
            height: 44,
            borderBottom: '0.5px solid rgba(255,255,255,.06)',
            display: 'flex', alignItems: 'center',
            padding: '0 1.5rem',
            background: '#0c0c15',
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
