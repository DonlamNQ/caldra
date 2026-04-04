'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ScoreRing from '@/components/dashboard/ScoreRing'
import AlertFeed, { AlertRow } from '@/components/dashboard/AlertFeed'
import TradeLog, { TradeRow } from '@/components/dashboard/TradeLog'
import AppHeader from '@/components/AppHeader'

interface SessionStats {
  total_trades: number
  total_pnl: number
  wins: number
  losses: number
}

interface DashboardClientProps {
  userId: string
  userEmail: string
  initialScore: number
  initialAlerts: AlertRow[]
  initialTrades: TradeRow[]
  initialStats: SessionStats
}

function computeScore(alerts: AlertRow[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? a.severity ?? 1
    if (level === 3) return sum + 18
    if (level === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function SessionChart({ trades }: { trades: TradeRow[] }) {
  const sorted = [...trades]
    .filter(t => t.pnl != null && t.entry_time)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  if (sorted.length < 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 90, color: 'rgba(232,230,224,.2)', fontSize: 12, letterSpacing: .5 }}>
        {sorted.length === 0 ? 'Aucun trade — la session démarre ici' : 'Données insuffisantes (min. 2 trades)'}
      </div>
    )
  }

  const points: { time: string; cum: number }[] = [{ time: 'Ouv.', cum: 0 }]
  let cum = 0
  for (const t of sorted) {
    cum += t.pnl ?? 0
    points.push({ time: formatTime(t.entry_time), cum })
  }

  const W = 560, H = 90, PX = 6, PY = 12
  const values = points.map(p => p.cum)
  const minV = Math.min(0, ...values)
  const maxV = Math.max(0, ...values)
  const range = maxV - minV || 1
  const n = points.length

  const xOf = (i: number) => PX + (i / (n - 1)) * (W - 2 * PX)
  const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
  const y0 = yOf(0)

  const linePts = points.map((p, i) => `${xOf(i)},${yOf(p.cum)}`).join(' ')
  const lastCum = values[values.length - 1]
  const isPos = lastCum >= 0
  const lineColor = isPos ? '#22c55e' : '#ef4444'
  const fillColor = isPos ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.06)'
  const fillPath = `M${xOf(0)},${y0} ${points.map((p, i) => `L${xOf(i)},${yOf(p.cum)}`).join(' ')} L${xOf(n - 1)},${y0} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 90 }}>
        <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke="rgba(255,255,255,.05)" strokeWidth={1} strokeDasharray="3 4" />
        <path d={fillPath} fill={fillColor} />
        <polyline points={linePts} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xOf(n - 1)} cy={yOf(lastCum)} r={2.5} fill={lineColor} />
        <circle cx={xOf(n - 1)} cy={yOf(lastCum)} r={5} fill={lineColor} opacity={0.2} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(232,230,224,.22)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
        <span>{points[0].time}</span>
        <span>{points[points.length - 1].time}</span>
      </div>
    </div>
  )
}

export default function DashboardClient({
  userId,
  userEmail,
  initialScore,
  initialAlerts,
  initialTrades,
  initialStats,
}: DashboardClientProps) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts)
  const [trades] = useState<TradeRow[]>(initialTrades)
  const [stats] = useState<SessionStats>(initialStats)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)

  const score = computeScore(alerts)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const supabase = createClient()
    channelRef.current = supabase
      .channel('caldra-alerts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const newAlert = payload.new as AlertRow & { session_date?: string }
        const isToday = newAlert.session_date === today || !newAlert.session_date
        const isCurrentUser = (newAlert as any).user_id === userId || !(newAlert as any).user_id
        if (isToday && isCurrentUser) {
          setAlerts(prev => [newAlert, ...prev])
          setLastUpdate(new Date())
        }
      })
      .subscribe((status) => { setConnected(status === 'SUBSCRIBED') })
    return () => { channelRef.current?.unsubscribe() }
  }, [userId, today])

  const pnlColor = stats.total_pnl > 0 ? '#22c55e' : stats.total_pnl < 0 ? '#ef4444' : 'rgba(232,230,224,.4)'
  const pnlSign = stats.total_pnl >= 0 ? '+' : ''
  const winRate = stats.total_trades > 0 ? Math.round((stats.wins / stats.total_trades) * 100) : null
  const hasCritical = alerts.some(a => (a.level ?? a.severity ?? 1) === 3)

  const CARD: React.CSSProperties = {
    background: '#0d0d18',
    border: '0.5px solid rgba(255,255,255,.08)',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  }

  const statCards = [
    { label: 'PnL session',  value: `${pnlSign}${stats.total_pnl.toFixed(2)}`, sub: 'USD', color: pnlColor },
    { label: 'Trades',       value: stats.total_trades, sub: "aujourd'hui", color: 'rgba(232,230,224,.85)' },
    { label: 'Gagnants',     value: stats.wins,  sub: 'positifs', color: '#22c55e' },
    { label: 'Perdants',     value: stats.losses, sub: 'négatifs', color: '#ef4444' },
    {
      label: 'Win rate',
      value: winRate !== null ? `${winRate}%` : '—',
      sub: 'réussite',
      color: winRate !== null ? (winRate >= 50 ? '#22c55e' : '#f59e0b') : 'rgba(232,230,224,.35)',
    },
    {
      label: 'Alertes',
      value: alerts.length,
      sub: 'déclenchées',
      color: alerts.length === 0 ? '#22c55e' : hasCritical ? '#ef4444' : '#f59e0b',
    },
  ]

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#07070e}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        @keyframes dFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dPulse{0%,100%{opacity:1}50%{opacity:.3}}
        .dsh-stat:hover{border-color:rgba(255,255,255,.14)!important}
        .dsh-row:hover{background:rgba(255,255,255,.025)!important}
        .dsh-live-label{font-size:9px;letter-spacing:1.5px;text-transform:uppercase}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#07070e', color: '#e8e6e0', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* Header — own version with live dot */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 3rem', height: 52,
          borderBottom: '0.5px solid rgba(255,255,255,.07)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          background: 'rgba(7,7,14,.92)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <a href="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 3, marginRight: '2rem' }}>
              <span style={{ fontWeight: 300, fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>
                Cald<span style={{ color: '#dc503c' }}>ra</span>
              </span>
              <span style={{ fontSize: 7, letterSpacing: 7, textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', lineHeight: 1 }}>Session</span>
            </a>
            <div style={{ width: 0.5, height: 22, background: 'rgba(255,255,255,.08)', marginRight: '2rem' }} />
            <nav style={{ display: 'flex', gap: '1.75rem' }}>
              {[
                { href: '/dashboard', label: 'Dashboard', active: true },
                { href: '/alerts',    label: 'Alertes',   active: false },
                { href: '/analytics', label: 'Analytics', active: false },
                { href: '/settings/rules', label: 'Règles', active: false },
                { href: '/settings/api',   label: 'API',   active: false },
                { href: '/billing',   label: 'Billing',   active: false },
              ].map(n => (
                <a key={n.href} href={n.href} style={{
                  fontSize: 9, fontWeight: 400, letterSpacing: 2, textTransform: 'uppercase',
                  color: n.active ? '#fff' : 'rgba(232,230,224,.35)',
                  textDecoration: 'none', transition: 'color .2s',
                }}>
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <span style={{ fontSize: 10, color: 'rgba(232,230,224,.22)', fontVariantNumeric: 'tabular-nums', letterSpacing: .5 }}>{today}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#22c55e' : 'rgba(255,255,255,.18)',
                boxShadow: connected ? '0 0 7px rgba(34,197,94,.55)' : 'none',
                animation: connected ? 'none' : 'dPulse 2s infinite',
                transition: 'all .3s',
              }} />
              <span className="dsh-live-label" style={{ color: connected ? 'rgba(34,197,94,.65)' : 'rgba(255,255,255,.2)' }}>
                {connected ? 'live' : 'sync…'}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(232,230,224,.25)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</span>
            <button
              onClick={async () => { const s = createClient(); await s.auth.signOut(); window.location.href = '/login' }}
              style={{ fontSize: 9, padding: '6px 13px', background: 'transparent', border: '0.5px solid rgba(255,255,255,.13)', borderRadius: 4, color: 'rgba(232,230,224,.4)', cursor: 'pointer', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", transition: 'all .2s' }}
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* Main */}
        <main style={{ padding: '5.5rem 3rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── Row 1: Score ring | PnL Chart ──────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.25rem', animation: 'dFadeIn .5s ease both' }}>

            {/* Score card */}
            <div style={{ ...CARD, padding: '1.75rem 1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', alignSelf: 'flex-start' }}>Score comportemental</div>
              <ScoreRing score={score} size={166} />
              {lastUpdate && (
                <div style={{ fontSize: 9, color: 'rgba(232,230,224,.2)', letterSpacing: .5, fontVariantNumeric: 'tabular-nums' }}>
                  màj {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}
            </div>

            {/* PnL Chart card */}
            <div style={{ ...CARD, padding: '1.5rem 1.75rem' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '.5rem' }}>P&L de session</div>
                  <div style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 200, color: pnlColor, lineHeight: 1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
                    {pnlSign}{stats.total_pnl.toFixed(2)}
                    <span style={{ fontSize: '0.35em', fontWeight: 400, color: 'rgba(232,230,224,.35)', marginLeft: 6, letterSpacing: 1 }}>USD</span>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(232,230,224,.2)', letterSpacing: .5, textAlign: 'right' }}>
                  <div>{stats.total_trades} trade{stats.total_trades !== 1 ? 's' : ''}</div>
                  <div style={{ marginTop: 3 }}>{today}</div>
                </div>
              </div>
              <SessionChart trades={trades} />
            </div>
          </div>

          {/* ── Row 2: Stat cards ──────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '1rem', animation: 'dFadeIn .5s ease .1s both' }}>
            {statCards.map((s, i) => (
              <div key={i} className="dsh-stat" style={{ ...CARD, padding: '1.1rem 1.25rem', transition: 'border-color .2s', animation: `dFadeIn .4s ease ${.1 + i * .05}s both` }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)' }} />
                <div style={{ fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '.6rem' }}>{s.label}</div>
                <div style={{ fontSize: 'clamp(1.2rem,2vw,1.55rem)', fontWeight: 200, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: -.5 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9.5, color: 'rgba(232,230,224,.25)', marginTop: '.3rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Row 3: Alerts | Trades ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', animation: 'dFadeIn .5s ease .2s both' }}>

            {/* Alert feed */}
            <div style={{ ...CARD, padding: '1.4rem', maxHeight: 460, display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.9rem' }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)' }}>Alertes du jour</div>
                {alerts.length > 0 && (
                  <div style={{
                    fontSize: 9, padding: '2px 9px',
                    background: hasCritical ? 'rgba(220,80,60,.1)' : 'rgba(245,158,11,.08)',
                    border: `0.5px solid ${hasCritical ? 'rgba(220,80,60,.28)' : 'rgba(245,158,11,.22)'}`,
                    borderRadius: 100, color: hasCritical ? 'rgba(220,80,60,.85)' : 'rgba(245,158,11,.8)',
                    letterSpacing: 1,
                  }}>
                    {alerts.length}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}><AlertFeed alerts={alerts} /></div>
            </div>

            {/* Trade log */}
            <div style={{ ...CARD, padding: '1.4rem', maxHeight: 460, overflowY: 'auto' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '.9rem' }}>Trades du jour</div>
              <TradeLog trades={trades} />
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
