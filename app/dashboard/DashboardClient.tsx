'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ScoreRing from '@/components/dashboard/ScoreRing'
import AlertFeed, { AlertRow } from '@/components/dashboard/AlertFeed'
import TradeLog, { TradeRow } from '@/components/dashboard/TradeLog'
import AppShell from '@/components/AppShell'

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

// ── Mock data (shown when no real trades exist) ───────────────────────────────
const TODAY = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2026-04-05'

const MOCK_TRADES: TradeRow[] = [
  { id: 'm1', symbol: 'ES',  direction: 'long',  size: 2, entry_price: 5210.50, exit_price: 5221.75, pnl: 280.00, entry_time: `${TODAY}T09:32:00Z` },
  { id: 'm2', symbol: 'NQ',  direction: 'long',  size: 1, entry_price: 18340.00, exit_price: 18356.00, pnl: 160.00, entry_time: `${TODAY}T09:51:00Z` },
  { id: 'm3', symbol: 'NQ',  direction: 'short', size: 2, entry_price: 18350.00, exit_price: 18358.50, pnl: -85.00, entry_time: `${TODAY}T10:08:00Z` },
  { id: 'm4', symbol: 'ES',  direction: 'short', size: 3, entry_price: 5219.25, exit_price: 5206.50,  pnl: 320.00, entry_time: `${TODAY}T10:22:00Z` },
  { id: 'm5', symbol: 'ES',  direction: 'long',  size: 6, entry_price: 5208.75, exit_price: 5198.00,  pnl: -450.00, entry_time: `${TODAY}T10:31:00Z` },
  { id: 'm6', symbol: 'ES',  direction: 'long',  size: 6, entry_price: 5197.50, exit_price: 5194.00,  pnl: -125.00, entry_time: `${TODAY}T10:34:00Z` },
  { id: 'm7', symbol: 'NQ',  direction: 'short', size: 2, entry_price: 18298.50, exit_price: 18289.75, pnl: 180.00, entry_time: `${TODAY}T10:52:00Z` },
]

const MOCK_ALERTS: AlertRow[] = [
  { id: 'a1', type: 'revenge_sizing',     level: 2, message: 'Taille ×3 après deux pertes — pattern de revenge sizing détecté.', created_at: `${TODAY}T10:31:05Z` },
  { id: 'a2', type: 'immediate_reentry',  level: 1, message: 'Re-entrée 3 min après la sortie — respecte ton délai minimum.', created_at: `${TODAY}T10:34:08Z` },
  { id: 'a3', type: 'consecutive_losses', level: 2, message: '2 pertes consécutives — biais émotionnel probable en cours de session.', created_at: `${TODAY}T10:34:10Z` },
  { id: 'a4', type: 'drawdown_alert',     level: 2, message: 'Drawdown session −50 % depuis le pic — seuil critique approché.', created_at: `${TODAY}T10:35:00Z` },
]

// ── Session PnL sparkline ─────────────────────────────────────────────────────
function SessionChart({ trades }: { trades: TradeRow[] }) {
  const sorted = [...trades]
    .filter(t => t.pnl != null && t.entry_time)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  if (sorted.length < 2) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'rgba(226,224,218,.2)', fontSize: 12, letterSpacing: .3 }}>
        {sorted.length === 0 ? 'La session démarre ici' : 'Trades insuffisants'}
      </div>
    )
  }

  const pts: { t: string; v: number }[] = [{ t: 'Ouv.', v: 0 }]
  let cum = 0
  for (const t of sorted) { cum += t.pnl ?? 0; pts.push({ t: formatTime(t.entry_time), v: cum }) }

  const W = 600, H = 100, PX = 4, PY = 10
  const vals = pts.map(p => p.v)
  const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
  const range = maxV - minV || 1
  const n = pts.length
  const xOf = (i: number) => PX + (i / (n - 1)) * (W - 2 * PX)
  const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
  const y0 = yOf(0)
  const linePts = pts.map((p, i) => `${xOf(i)},${yOf(p.v)}`).join(' ')
  const last = vals[vals.length - 1]
  const isPos = last >= 0
  const lc = isPos ? '#10b981' : '#f43f5e'
  const fillPath = `M${xOf(0)},${y0} ${pts.map((p, i) => `L${xOf(i)},${yOf(p.v)}`).join(' ')} L${xOf(n - 1)},${y0} Z`

  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
        <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke="rgba(255,255,255,.06)" strokeWidth={1} strokeDasharray="3 5" />
        <path d={fillPath} fill={isPos ? 'rgba(16,185,129,.07)' : 'rgba(244,63,94,.07)'} />
        <polyline points={linePts} fill="none" stroke={lc} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xOf(n - 1)} cy={yOf(last)} r={2.5} fill={lc} />
        <circle cx={xOf(n - 1)} cy={yOf(last)} r={6} fill={lc} opacity={0.15} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(226,224,218,.2)', fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace" }}>
        <span>{pts[0].t}</span><span>{pts[pts.length - 1].t}</span>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardClient({
  userId, userEmail, initialScore, initialAlerts, initialTrades, initialStats,
}: DashboardClientProps) {
  const isEmpty = initialTrades.length === 0 && initialAlerts.length === 0
  const isMock = isEmpty

  const [alerts, setAlerts] = useState<AlertRow[]>(isMock ? MOCK_ALERTS : initialAlerts)
  const [trades]  = useState<TradeRow[]>(isMock ? MOCK_TRADES : initialTrades)
  const [stats]   = useState<SessionStats>(isMock
    ? { total_trades: 7, total_pnl: 280.00, wins: 4, losses: 3 }
    : initialStats
  )
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)
  const today = new Date().toISOString().split('T')[0]

  const score = computeScore(alerts)

  useEffect(() => {
    if (isMock) return
    const supabase = createClient()
    channelRef.current = supabase
      .channel('caldra-alerts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const a = payload.new as AlertRow & { session_date?: string }
        const isToday = a.session_date === today || !a.session_date
        const isMe = (a as any).user_id === userId || !(a as any).user_id
        if (isToday && isMe) { setAlerts(prev => [a, ...prev]); setLastUpdate(new Date()) }
      })
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))
    return () => { channelRef.current?.unsubscribe() }
  }, [userId, today, isMock])

  const pnlPos = stats.total_pnl >= 0
  const pnlColor = stats.total_pnl > 0 ? '#10b981' : stats.total_pnl < 0 ? '#f43f5e' : 'rgba(226,224,218,.4)'
  const pnlSign = stats.total_pnl >= 0 ? '+' : ''
  const winRate = stats.total_trades > 0 ? Math.round((stats.wins / stats.total_trades) * 100) : null
  const hasCritical = alerts.some(a => (a.level ?? a.severity ?? 1) === 3)

  const CARD: React.CSSProperties = {
    background: '#0f0f17',
    border: '0.5px solid rgba(255,255,255,.065)',
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  }

  const topBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <span style={{ fontSize: 11, color: 'rgba(226,224,218,.35)', fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace" }}>
          {today}
        </span>
        {isMock && (
          <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(220,80,60,.75)', background: 'rgba(220,80,60,.1)', border: '0.5px solid rgba(220,80,60,.2)', borderRadius: 4, padding: '2px 8px' }}>
            Données de démo
          </span>
        )}
      </div>
      {!isMock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connected ? '#10b981' : 'rgba(255,255,255,.2)',
            boxShadow: connected ? '0 0 6px rgba(16,185,129,.5)' : 'none',
            transition: 'all .3s',
          }} />
          <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: connected ? 'rgba(16,185,129,.65)' : 'rgba(255,255,255,.22)', fontFamily: "'DM Sans',sans-serif" }}>
            {connected ? 'live' : 'sync…'}
          </span>
          {lastUpdate && (
            <span style={{ fontSize: 10, color: 'rgba(226,224,218,.2)', fontFamily: "'JetBrains Mono',monospace" }}>
              {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes dshFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .dsh-stat:hover{border-color:rgba(255,255,255,.12)!important}
        .dsh-row:hover{background:rgba(255,255,255,.02)!important}
      `}</style>
      <AppShell current="dashboard" userEmail={userEmail} topBar={topBar}>
        <main style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'dshFadeIn .4s ease both' }}>

          {/* ── Row 1: Score + PnL Chart ──────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '1.25rem', alignItems: 'stretch' }}>

            {/* Score */}
            <div style={{ ...CARD, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', alignSelf: 'stretch' }}>Score comportemental</div>
              <ScoreRing score={score} size={162} />
            </div>

            {/* PnL Chart */}
            <div style={{ ...CARD, padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', marginBottom: '.4rem' }}>P&L de session</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 400, color: pnlColor, letterSpacing: -1, fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
                      {pnlSign}{stats.total_pnl.toFixed(2)}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(226,224,218,.3)' }}>USD</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'rgba(226,224,218,.2)', fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace" }}>{stats.total_trades} trades</div>
                  {winRate !== null && (
                    <div style={{ fontSize: 10, color: winRate >= 50 ? 'rgba(16,185,129,.6)' : 'rgba(245,158,11,.6)', marginTop: 3 }}>{winRate}% réussite</div>
                  )}
                </div>
              </div>
              {/* Colored left border based on PnL */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, background: pnlColor, opacity: .4, borderRadius: '10px 0 0 10px' }} />
              <SessionChart trades={trades} />
            </div>
          </div>

          {/* ── Row 2: Stats grid ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '.875rem' }}>
            {[
              { label: 'PnL total',  value: `${pnlSign}${stats.total_pnl.toFixed(2)}`, unit: '$', color: pnlColor },
              { label: 'Trades',     value: String(stats.total_trades),  unit: '',  color: 'rgba(226,224,218,.8)' },
              { label: 'Gagnants',   value: String(stats.wins),    unit: '',  color: '#10b981' },
              { label: 'Perdants',   value: String(stats.losses),  unit: '',  color: '#f43f5e' },
              { label: 'Win rate',   value: winRate !== null ? `${winRate}%` : '—', unit: '', color: winRate !== null ? (winRate >= 50 ? '#10b981' : '#f59e0b') : 'rgba(226,224,218,.35)' },
              { label: 'Alertes',    value: String(alerts.length), unit: '',  color: alerts.length === 0 ? '#10b981' : hasCritical ? '#f43f5e' : '#f59e0b' },
            ].map((s, i) => (
              <div key={i} className="dsh-stat" style={{ ...CARD, padding: '1rem 1.1rem', transition: 'border-color .15s', cursor: 'default' }}>
                <div style={{ fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(226,224,218,.25)', marginBottom: '.5rem', fontFamily: "'DM Sans',sans-serif" }}>{s.label}</div>
                <div style={{ fontSize: 'clamp(1.1rem,1.8vw,1.4rem)', fontWeight: 500, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace", letterSpacing: -.5 }}>
                  {s.value}
                  {s.unit && <span style={{ fontSize: '0.55em', opacity: .5, marginLeft: 3 }}>{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ── Row 3: Alerts + Trades ────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.65fr', gap: '1.25rem', alignItems: 'start' }}>

            {/* Alerts */}
            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', maxHeight: 420 }}>
              <div style={{ padding: '1.1rem 1.25rem .75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(255,255,255,.05)', flexShrink: 0 }}>
                <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)' }}>Alertes du jour</span>
                {alerts.length > 0 && (
                  <span style={{ fontSize: 9, padding: '2px 8px', background: hasCritical ? 'rgba(244,63,94,.1)' : 'rgba(245,158,11,.08)', border: `0.5px solid ${hasCritical ? 'rgba(244,63,94,.28)' : 'rgba(245,158,11,.22)'}`, borderRadius: 100, color: hasCritical ? 'rgba(244,63,94,.85)' : 'rgba(245,158,11,.8)', letterSpacing: 1 }}>
                    {alerts.length}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden', padding: '0 .75rem .75rem' }}>
                <AlertFeed alerts={alerts} />
              </div>
            </div>

            {/* Trades */}
            <div style={{ ...CARD, maxHeight: 420, overflowY: 'auto' }}>
              <div style={{ padding: '1.1rem 1.25rem .75rem', borderBottom: '0.5px solid rgba(255,255,255,.05)', position: 'sticky', top: 0, background: '#0f0f17', zIndex: 1 }}>
                <span style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)' }}>Trades du jour</span>
              </div>
              <div style={{ padding: '0 .25rem .5rem' }}>
                <TradeLog trades={trades} />
              </div>
            </div>
          </div>
        </main>
      </AppShell>
    </>
  )
}
