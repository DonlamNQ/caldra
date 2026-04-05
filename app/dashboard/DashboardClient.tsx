'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ScoreRing from '@/components/dashboard/ScoreRing'
import AlertFeed, { AlertRow } from '@/components/dashboard/AlertFeed'
import TradeLog, { TradeRow } from '@/components/dashboard/TradeLog'
import AppShell from '@/components/AppShell'

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  bg:          '#0f0d00',
  surface:     '#1a1500',
  surface2:    '#141100',
  border:      '#3d3000',
  border2:     '#5a4800',
  accent:      '#f5a623',
  accentDim:   'rgba(245,166,35,.15)',
  accentBdr:   'rgba(245,166,35,.3)',
  text:        '#e8dfc0',
  textMuted:   'rgba(232,223,192,.4)',
  textFaint:   'rgba(232,223,192,.18)',
  green:       '#7acc3a',
  red:         '#dc3218',
  orange:      '#dc8200',
}
const MONO = "'IBM Plex Mono', monospace"

// ── Types ──────────────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function computeScore(alerts: AlertRow[]): number {
  const deductions = alerts.reduce((sum, a) => {
    const level = a.level ?? a.severity ?? 1
    if (level === 3) return sum + 18
    if (level === 2) return sum + 8
    return sum + 3
  }, 0)
  return Math.max(0, 100 - deductions)
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtPnl(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const TODAY = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2026-04-05'

const MOCK_TRADES: TradeRow[] = [
  { id: 'm1', symbol: 'ES',  direction: 'long',  size: 2, entry_price: 5210.50, exit_price: 5221.75, pnl:  280.00, entry_time: `${TODAY}T09:32:00Z` },
  { id: 'm2', symbol: 'NQ',  direction: 'long',  size: 1, entry_price: 18340.00, exit_price: 18356.00, pnl: 160.00, entry_time: `${TODAY}T09:51:00Z` },
  { id: 'm3', symbol: 'NQ',  direction: 'short', size: 2, entry_price: 18350.00, exit_price: 18358.50, pnl: -85.00,  entry_time: `${TODAY}T10:08:00Z` },
  { id: 'm4', symbol: 'ES',  direction: 'short', size: 3, entry_price: 5219.25,  exit_price: 5206.50,  pnl:  320.00, entry_time: `${TODAY}T10:22:00Z` },
  { id: 'm5', symbol: 'ES',  direction: 'long',  size: 6, entry_price: 5208.75,  exit_price: 5198.00,  pnl: -450.00, entry_time: `${TODAY}T10:31:00Z` },
  { id: 'm6', symbol: 'ES',  direction: 'long',  size: 6, entry_price: 5197.50,  exit_price: 5194.00,  pnl: -125.00, entry_time: `${TODAY}T10:34:00Z` },
  { id: 'm7', symbol: 'NQ',  direction: 'short', size: 2, entry_price: 18298.50, exit_price: 18289.75, pnl:  180.00, entry_time: `${TODAY}T10:52:00Z` },
]

const MOCK_ALERTS: AlertRow[] = [
  { id: 'a1', type: 'revenge_sizing',     level: 2, message: 'Taille ×3 après deux pertes — pattern de revenge sizing détecté.', created_at: `${TODAY}T10:31:05Z` },
  { id: 'a2', type: 'immediate_reentry',  level: 1, message: 'Re-entrée 3 min après la sortie — respecte ton délai minimum.', created_at: `${TODAY}T10:34:08Z` },
  { id: 'a3', type: 'consecutive_losses', level: 2, message: '2 pertes consécutives — biais émotionnel probable en cours de session.', created_at: `${TODAY}T10:34:10Z` },
  { id: 'a4', type: 'drawdown_alert',     level: 2, message: 'Drawdown session −50% depuis le pic — seuil critique approché.', created_at: `${TODAY}T10:35:00Z` },
]

// ── Metric bars ────────────────────────────────────────────────────────────────
function metricScore(alerts: AlertRow[], type: string): number {
  const count = alerts.filter(a => (a.type ?? a.pattern ?? '').includes(type)).length
  return Math.max(0, 100 - count * 25)
}

interface MetricBarProps { label: string; value: number }
function MetricBar({ label, value }: MetricBarProps) {
  const color = value >= 70 ? C.accent : value >= 40 ? C.orange : C.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 8, color: C.textFaint, letterSpacing: '.12em', textTransform: 'uppercase', fontFamily: MONO, width: 80, flexShrink: 0, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 2, background: 'rgba(245,166,35,.1)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${value}%`, background: color, transition: 'width .8s ease, background .4s' }} />
      </div>
      <span style={{ fontSize: 9, color, fontFamily: MONO, fontWeight: 600, width: 26, textAlign: 'right', letterSpacing: '.04em' }}>{value}</span>
    </div>
  )
}

// ── PnL Chart ──────────────────────────────────────────────────────────────────
function PnlChart({ trades }: { trades: TradeRow[] }) {
  const sorted = [...trades]
    .filter(t => t.pnl != null && t.entry_time)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  if (sorted.length < 2) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textFaint, fontSize: 11, fontFamily: MONO, letterSpacing: '.06em' }}>
        {sorted.length === 0 ? '// aucun trade — session en attente' : '// données insuffisantes'}
      </div>
    )
  }

  const pts: { t: string; v: number }[] = [{ t: 'open', v: 0 }]
  let cum = 0
  for (const t of sorted) { cum += t.pnl ?? 0; pts.push({ t: fmtTime(t.entry_time), v: cum }) }

  const W = 600, H = 110, PX = 6, PY = 12
  const vals = pts.map(p => p.v)
  const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
  const range = maxV - minV || 1
  const n = pts.length
  const xOf = (i: number) => PX + (i / (n - 1)) * (W - 2 * PX)
  const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
  const y0 = yOf(0)
  const last = vals[vals.length - 1]
  const isPos = last >= 0
  const lc = isPos ? C.accent : C.red
  const linePts = pts.map((p, i) => `${xOf(i)},${yOf(p.v)}`).join(' ')
  const fillPath = `M${xOf(0)},${y0} ${pts.map((p, i) => `L${xOf(i)},${yOf(p.v)}`).join(' ')} L${xOf(n - 1)},${y0} Z`

  // Gridlines
  const gridLevels = [minV, 0, maxV].filter((v, i, arr) => arr.indexOf(v) === i)

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', flex: 1 }} preserveAspectRatio="none">
        {/* Grid */}
        {gridLevels.map((gv, i) => {
          const gy = yOf(gv)
          return (
            <g key={i}>
              <line x1={PX} y1={gy} x2={W - PX} y2={gy}
                stroke={gv === 0 ? 'rgba(245,166,35,.15)' : 'rgba(61,48,0,.6)'}
                strokeWidth={gv === 0 ? 1 : 0.5} strokeDasharray={gv === 0 ? '4 6' : '2 8'}
              />
            </g>
          )
        })}
        {/* Fill */}
        <path d={fillPath} fill={isPos ? 'rgba(245,166,35,.06)' : 'rgba(220,50,24,.06)'} />
        {/* Line */}
        <polyline points={linePts} fill="none" stroke={lc} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots at each trade */}
        {pts.slice(1).map((p, i) => (
          <circle key={i} cx={xOf(i + 1)} cy={yOf(p.v)} r={2} fill={C.bg} stroke={lc} strokeWidth={1} />
        ))}
        {/* End dot */}
        <circle cx={xOf(n - 1)} cy={yOf(last)} r={3.5} fill={lc} />
        <circle cx={xOf(n - 1)} cy={yOf(last)} r={7} fill={lc} opacity={0.15} />
      </svg>
      {/* X labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px' }}>
        {[pts[0], pts[Math.floor(n / 2)], pts[n - 1]].map((p, i) => (
          <span key={i} style={{ fontSize: 8.5, color: C.textFaint, fontFamily: MONO, letterSpacing: '.04em' }}>{p.t}</span>
        ))}
      </div>
    </div>
  )
}

// ── Live clock ─────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return <span style={{ fontFamily: MONO, fontSize: 12, color: C.textMuted, letterSpacing: '.08em', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const channelRef = useRef<any>(null)
  const today = new Date().toISOString().split('T')[0]

  const score = computeScore(alerts)
  const hasCritical = alerts.some(a => (a.level ?? a.severity ?? 1) === 3)

  useEffect(() => {
    if (isMock) return
    const supabase = createClient()
    channelRef.current = supabase
      .channel('caldra-alerts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const a = payload.new as AlertRow & { session_date?: string }
        const isToday = a.session_date === today || !a.session_date
        const isMe = (a as any).user_id === userId || !(a as any).user_id
        if (isToday && isMe) setAlerts(prev => [a, ...prev])
      })
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))
    return () => { channelRef.current?.unsubscribe() }
  }, [userId, today, isMock])

  const pnlPos = stats.total_pnl >= 0
  const pnlColor = stats.total_pnl > 0 ? C.accent : stats.total_pnl < 0 ? C.red : C.textMuted
  const winRate = stats.total_trades > 0 ? Math.round((stats.wins / stats.total_trades) * 100) : null
  const drawdownPct = Math.min(100, Math.round(Math.abs(Math.min(0, stats.total_pnl)) / 500 * 100))

  // Metric bar values
  const mSizing    = metricScore(alerts, 'revenge_sizing')
  const mRisk      = metricScore(alerts, 'drawdown')
  const mReentry   = metricScore(alerts, 'reentry')
  const mDrawdown  = 100 - drawdownPct
  const mDiscipline = metricScore(alerts, 'outside_session')

  // Top bar
  const topBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: '.18em' }}>CALDRA</span>
        <span style={{ color: '#3d3000', fontSize: 10 }}>|</span>
        <span style={{ fontSize: 9, color: C.textFaint, fontFamily: MONO, letterSpacing: '.08em' }}>{today}</span>
        {isMock && (
          <span style={{ fontSize: 8, letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(220,50,24,.7)', border: '1px solid rgba(220,50,24,.25)', padding: '1px 7px', fontFamily: MONO }}>
            démo
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LiveClock />
        <span style={{ color: '#3d3000', fontSize: 10 }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 5, height: 5,
            background: isMock ? C.accent : connected ? C.green : C.textFaint,
            boxShadow: (isMock || connected) ? `0 0 6px ${isMock ? C.accent : C.green}88` : 'none',
            animation: (isMock || connected) ? 'livePulse 2s ease infinite' : 'none',
          }} />
          <span style={{ fontSize: 8, letterSpacing: '.2em', color: isMock ? C.accentBdr : connected ? 'rgba(122,204,58,.6)' : C.textFaint, fontFamily: MONO }}>
            {isMock ? 'DÉMO' : connected ? 'LIVE' : 'SYNC'}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        @keyframes dshIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes livePulse{0%,100%{opacity:1}50%{opacity:.5}}
        .dsh-stat-card:hover{border-color:${C.border2}!important}
      `}</style>

      <AppShell current="dashboard" userEmail={userEmail} topBar={topBar}>
        <main style={{
          padding: '1.25rem 1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          animation: 'dshIn .35s ease both',
          fontFamily: MONO,
          background: C.bg,
          minHeight: 'calc(100vh - 44px)',
        }}>

          {/* ── Stats row ────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
            {[
              {
                label: 'P&L SESSION',
                value: `${fmtPnl(stats.total_pnl)}`,
                unit: 'USD',
                color: pnlColor,
                sub: winRate !== null ? `${winRate}% win rate` : null,
              },
              {
                label: 'TRADES',
                value: String(stats.total_trades),
                unit: 'today',
                color: C.text,
                sub: `${stats.wins}W / ${stats.losses}L`,
              },
              {
                label: 'DRAWDOWN',
                value: `${drawdownPct}%`,
                unit: 'used',
                color: drawdownPct > 70 ? C.red : drawdownPct > 40 ? C.orange : C.green,
                sub: 'vs. max autorisé',
              },
              {
                label: 'ALERTES',
                value: String(alerts.length),
                unit: 'actives',
                color: alerts.length === 0 ? C.green : hasCritical ? C.red : C.orange,
                sub: hasCritical ? '⚠ critique détectée' : 'session OK',
              },
            ].map((s, i) => (
              <div key={i} className="dsh-stat-card" style={{
                background: C.surface2,
                border: `1px solid ${C.border}`,
                padding: '12px 14px',
                transition: 'border-color .12s',
                cursor: 'default',
              }}>
                <div style={{ fontSize: 7.5, letterSpacing: '.2em', color: 'rgba(245,166,35,.4)', marginBottom: 6, fontFamily: MONO }}>
                  {s.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 'clamp(1.2rem,2vw,1.6rem)', fontWeight: 600, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: MONO, letterSpacing: -1 }}>
                    {s.value}
                  </span>
                  {s.unit && <span style={{ fontSize: 9, color: C.textFaint, letterSpacing: '.06em' }}>{s.unit}</span>}
                </div>
                {s.sub && <div style={{ fontSize: 9, color: C.textFaint, marginTop: 5, letterSpacing: '.04em' }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* ── Main 2-column layout ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', alignItems: 'start' }}>

            {/* ── Left column ──────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* PnL Chart */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 8, letterSpacing: '.2em', color: 'rgba(245,166,35,.4)', fontFamily: MONO }}>P&amp;L CUMULÉ</span>
                    <span style={{ fontSize: 8, color: C.border2, letterSpacing: '.06em' }}>session</span>
                  </div>
                  <span style={{ fontSize: 'clamp(.9rem,1.5vw,1.2rem)', fontWeight: 600, color: pnlColor, fontFamily: MONO, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
                    {fmtPnl(stats.total_pnl)} <span style={{ fontSize: '.5em', color: C.textFaint, fontWeight: 400 }}>USD</span>
                  </span>
                </div>
                <div style={{ padding: '12px 8px 8px', height: 160, display: 'flex', flexDirection: 'column' }}>
                  <PnlChart trades={trades} />
                </div>
              </div>

              {/* Trade log */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 44, background: C.surface, zIndex: 10 }}>
                  <span style={{ fontSize: 8, letterSpacing: '.2em', color: 'rgba(245,166,35,.4)', fontFamily: MONO }}>JOURNAL DE TRADES</span>
                  <span style={{ fontSize: 8.5, color: C.textFaint, fontFamily: MONO }}>{trades.length} enregistrements</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <TradeLog trades={trades} />
                </div>
              </div>
            </div>

            {/* ── Right column ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Score ring + metrics */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 8, letterSpacing: '.2em', color: 'rgba(245,166,35,.4)', fontFamily: MONO }}>SCORE COMPORTEMENTAL</span>
                </div>
                <div style={{ padding: '18px 18px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <ScoreRing score={score} size={148} />
                  {/* Metric bars */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 7.5, letterSpacing: '.18em', color: C.textFaint, fontFamily: MONO, paddingTop: 8 }}>MÉTRIQUES</div>
                    <MetricBar label="Sizing"     value={mSizing} />
                    <MetricBar label="Risk"       value={mRisk} />
                    <MetricBar label="Re-entrées" value={mReentry} />
                    <MetricBar label="Drawdown"   value={mDrawdown} />
                    <MetricBar label="Horaires"   value={mDiscipline} />
                  </div>
                </div>
              </div>

              {/* Alert feed */}
              <div style={{ background: C.surface, border: `1px solid ${hasCritical ? 'rgba(220,50,24,.35)' : C.border}`, transition: 'border-color .3s' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 8, letterSpacing: '.2em', color: 'rgba(245,166,35,.4)', fontFamily: MONO }}>ALERTES</span>
                  {alerts.length > 0 && (
                    <span style={{
                      fontSize: 8, padding: '1px 6px', fontFamily: MONO, letterSpacing: '.12em',
                      background: hasCritical ? 'rgba(220,50,24,.1)' : 'rgba(245,166,35,.08)',
                      border: `1px solid ${hasCritical ? 'rgba(220,50,24,.3)' : C.accentBdr}`,
                      color: hasCritical ? C.red : C.accent,
                      borderRadius: 100,
                    }}>
                      {alerts.length}
                    </span>
                  )}
                </div>
                <div style={{ padding: '6px 14px 10px', maxHeight: 380, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <AlertFeed alerts={alerts} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer status ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 8, color: C.textFaint, fontFamily: MONO, letterSpacing: '.1em' }}>
              CALDRA v2 — MONITORING COMPORTEMENTAL
            </span>
            <span style={{ fontSize: 8, color: '#3d3000' }}>·</span>
            <span style={{ fontSize: 8, color: C.textFaint, fontFamily: MONO, letterSpacing: '.06em' }}>
              {isMock ? 'mode démo' : connected ? 'realtime connecté' : 'connexion…'}
            </span>
          </div>

        </main>
      </AppShell>
    </>
  )
}
