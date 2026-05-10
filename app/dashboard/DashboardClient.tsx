'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AlertRow } from '@/components/dashboard/AlertFeed'
import type { TradeRow } from '@/components/dashboard/TradeLog'
import type { DaySession } from './page'

// ── Palette ────────────────────────────────────────────────────────────────────
const C_DARK = {
  red: '#7c3aed', rd: 'rgba(124,58,237,.1)', rb: 'rgba(124,58,237,.25)', rg: 'rgba(124,58,237,.05)',
  bg: '#0c0c15', sf: '#12121c', sf2: '#181826',
  b: 'rgba(255,255,255,.055)', b2: 'rgba(255,255,255,.1)', b3: 'rgba(255,255,255,.16)',
  tx: '#eae8f5', tm: 'rgba(234,232,245,.95)', td: 'rgba(234,232,245,.65)', te: 'rgba(234,232,245,.4)',
  g: '#00d17a', o: '#ffab00',
}
const C_LIGHT = {
  red: '#7c3aed', rd: 'rgba(124,58,237,.08)', rb: 'rgba(124,58,237,.18)', rg: 'rgba(124,58,237,.04)',
  bg: '#c2c8e0', sf: '#ccd2ea', sf2: '#c6cce4',
  b: 'rgba(30,30,80,.14)', b2: 'rgba(30,30,80,.24)', b3: 'rgba(30,30,80,.34)',
  tx: '#06061c', tm: 'rgba(6,6,28,.98)', td: 'rgba(6,6,28,.84)', te: 'rgba(6,6,28,.62)',
  g: '#005c38', o: '#7a4800',
}
type Palette = typeof C_DARK
const ThemeCtx = createContext<Palette>(C_DARK)
const SANS = "var(--font-geist-sans), 'Geist', sans-serif"
const MONO = "var(--font-geist-mono), 'Geist Mono', monospace"

// ── Types ──────────────────────────────────────────────────────────────────────
interface TradingRules {
  max_daily_drawdown_pct: number
  max_consecutive_losses: number
  min_time_between_entries_sec: number
  session_start: string
  session_end: string
  max_trades_per_session: number
  max_risk_per_trade_pct: number
  account_size: number
  slack_webhook_url: string | null
  tz_offset_hours: number
}

interface SessionStats { total_trades: number; total_pnl: number; wins: number; losses: number }

interface DashboardClientProps {
  userId: string
  userEmail: string
  initialScore: number
  initialAlerts: AlertRow[]
  initialTrades: TradeRow[]
  initialStats: SessionStats
  yesterdayStats: { score: number; pnl: number; alerts: number } | null
  tradingRules: TradingRules | null
  apiKeyPrefix: string | null
  historicalSessions: DaySession[]
  plan: string
  userMeta: { first_name?: string; last_name?: string; phone?: string }
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

function fmtPnl(v: number) { return `${v >= 0 ? '+' : ''}${v.toFixed(2)}` }
function fmtEur(v: number) { return `${v >= 0 ? '+€' : '-€'}${Math.abs(v).toFixed(0)}` }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function scoreColor(s: number, C: Palette) { return s >= 70 ? C.g : s >= 40 ? C.o : C.red }

function fmtDuration(entry: string, exit?: string | null): string {
  if (!exit) return '—'
  const diff = Math.round((new Date(exit).getTime() - new Date(entry).getTime()) / 1000)
  if (diff <= 0) return '—'
  const m = Math.floor(diff / 60), s = diff % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function consecutiveLosses(trades: TradeRow[]): number {
  const sorted = [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
  let streak = 0
  for (const t of sorted) {
    if ((t.pnl ?? 0) < 0) streak++
    else break
  }
  return streak
}

function metricScore(alerts: AlertRow[], type: string): number {
  const count = alerts.filter(a => (a.type ?? (a as any).pattern ?? '').includes(type)).length
  return Math.max(0, 100 - count * 25)
}

// ── LiveClock ──────────────────────────────────────────────────────────────────
function LiveClock() {
  const C = useContext(ThemeCtx)
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update(); const id = setInterval(update, 1000); return () => clearInterval(id)
  }, [])
  return <span style={{ fontFamily: MONO, fontSize: 11, color: C.td }}>{time}</span>
}

// ── ScoreRingSvg ───────────────────────────────────────────────────────────────
function ScoreRingSvg({ score }: { score: number }) {
  const C = useContext(ThemeCtx)
  const CIRC = 226
  const offset = CIRC - (CIRC * score / 100)
  const col = scoreColor(score, C)
  return (
    <div style={{ position: 'relative', width: 86, height: 86, flexShrink: 0 }}>
      <svg width="86" height="86" viewBox="0 0 86 86" style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 10px ${col}55)`, transition: 'filter .5s' }}>
        <circle cx="43" cy="43" r="36" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5.5" />
        <circle cx="43" cy="43" r="36" fill="none" stroke={col} strokeWidth="5.5"
          strokeDasharray="226" strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s, stroke .5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 30, fontWeight: 300, letterSpacing: -1.5, lineHeight: 1, color: col, transition: 'color .5s' }}>{score}</span>
        <span style={{ fontSize: 9, color: C.te, fontFamily: MONO, marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

// ── MetricBar ──────────────────────────────────────────────────────────────────
function MetricBar({ label, value }: { label: string; value: number }) {
  const C = useContext(ThemeCtx)
  const col = scoreColor(value, C)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: C.td, width: 80, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.09)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: col, borderRadius: 3, transition: 'width .6s, background .4s', boxShadow: `0 0 5px ${col}70` }} />
      </div>
      <span style={{ fontSize: 12, color: C.td, fontFamily: MONO, width: 26, textAlign: 'right' as const }}>{value}</span>
    </div>
  )
}

// ── SessionLine — score comportemental dans le temps ──────────────────────────
const DAILY_RISK = 300

function llColor(score: number): string {
  if (score >= 70) return '#3cc87a'
  if (score >= 40) return '#f5a623'
  return '#dc503c'
}

const LL_STATES: { pts: number[][]; idle?: boolean }[] = [
  { pts: [[0,40],[160,40],[320,40],[480,40],[640,40],[800,40]], idle: true },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3]] },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3],[590,12]] },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3],[590,12],[650,22]] },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3],[590,12],[650,22],[720,34]] },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3],[590,12],[650,22],[720,34],[790,41]] },
]

function SessionLine({ alerts, score, pnl }: { alerts: AlertRow[]; score: number; pnl: number }) {
  const pnlRef = useRef(pnl)
  const scoreRef = useRef(score)
  const llStateRef = useRef(0)

  useEffect(() => { pnlRef.current = pnl }, [pnl])
  useEffect(() => { scoreRef.current = score }, [score])

  useEffect(() => {
    const stateIdx = Math.min(alerts.length, LL_STATES.length - 1)
    llStateRef.current = stateIdx
  }, [alerts.length])

  useEffect(() => {
    let llT = 0
    let rafId: number

    function ptsToPath(pts: number[][]): string {
      return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ')
    }
    function ptsToFill(pts: number[][]): string {
      const l = pts[pts.length - 1]
      return ptsToPath(pts) + ` L${l[0]} 44 L0 44Z`
    }

    function animateLine() {
      llT += 0.016
      const s = LL_STATES[llStateRef.current]
      const base = s.pts.map(p => [...p])
      let livePts: number[][]
      if (s.idle) {
        const wave = Math.sin(llT * 0.55) * 3.8 + Math.sin(llT * 1.35) * 1.4
        livePts = base.map(p => [p[0], Math.max(2, Math.min(42, p[1] + wave))])
      } else {
        const noise = Math.sin(llT * 1.4) * 1.0 + Math.sin(llT * 3.1) * 0.4
        const last = base[base.length - 1]
        const liveY = Math.max(1, Math.min(43, last[1] + noise))
        livePts = [...base.slice(0, -1), [last[0], liveY]]
      }
      document.getElementById('ll-path')?.setAttribute('d', ptsToPath(livePts))
      document.getElementById('ll-fill')?.setAttribute('d', ptsToFill(livePts))
      const c = llColor(scoreRef.current)
      document.getElementById('ll-start')?.setAttribute('stop-color', c)
      document.getElementById('ll-start')?.setAttribute('stop-opacity', '0.7')
      document.getElementById('ll-end')?.setAttribute('stop-color', c)
      document.getElementById('ll-end')?.setAttribute('stop-opacity', '0.95')
      const lp = livePts[livePts.length - 1]
      document.getElementById('ll-cur')?.setAttribute('cx', String(lp[0]))
      document.getElementById('ll-cur')?.setAttribute('cy', String(lp[1]))
      document.getElementById('ll-cur')?.setAttribute('fill', c)
      rafId = requestAnimationFrame(animateLine)
    }

    rafId = requestAnimationFrame(animateLine)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <svg width="100%" viewBox="0 0 800 44" preserveAspectRatio="none" height="44" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="llg" x1="0" y1="0" x2="1" y2="0">
          <stop id="ll-start" offset="0%" stopColor="#8ba0be" stopOpacity="0.7" />
          <stop id="ll-end" offset="100%" stopColor="#8ba0be" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path id="ll-path" d="M0 40 L800 40" fill="none" stroke="url(#llg)" strokeWidth="1.5" strokeLinecap="round" />
      <path id="ll-fill" d="M0 40 L800 40 L800 44 L0 44Z" fill="url(#llg)" opacity=".06" />
      <circle id="ll-cur" cx="800" cy="40" r="3.5" fill="#8ba0be" />
    </svg>
  )
}

// ── PnlChart — cumulative SVG chart with Y/X axes ────────────────────────────
function PnlChart({ trades, drawdownAmt }: { trades: TradeRow[]; drawdownAmt?: number }) {
  const C = useContext(ThemeCtx)
  const sorted = [...trades]
    .filter(t => t.pnl != null && t.entry_time)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  const W = 600, H = 120
  const PXL = 46, PXR = 10, PYT = 6, PYB = 18
  const DW = W - PXL - PXR, DH = H - PYT - PYB
  const axisColor = C.te
  const gridColor = C.b
  const fmtY = (v: number) => v === 0 ? '€0' : v > 0 ? `+€${Math.abs(v).toFixed(0)}` : `-€${Math.abs(v).toFixed(0)}`

  if (sorted.length === 0) {
    const yMid = PYT + DH / 2
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <line x1={PXL} y1={PYT} x2={PXL} y2={H - PYB} stroke={gridColor} strokeWidth={1} />
        <line x1={PXL} y1={H - PYB} x2={W - PXR} y2={H - PYB} stroke={gridColor} strokeWidth={1} />
        <line x1={PXL} y1={yMid} x2={W - PXR} y2={yMid} stroke={gridColor} strokeWidth={0.5} strokeDasharray="4 6" />
        <text x={PXL - 4} y={yMid + 3} textAnchor="end" fill={axisColor} fontSize="8" style={{ fontFamily: 'var(--font-geist-mono),monospace' }}>€0</text>
      </svg>
    )
  }

  const pts: { t: string; v: number }[] = [{ t: 'open', v: 0 }]
  let cum = 0
  for (const t of sorted) { cum += t.pnl ?? 0; pts.push({ t: fmtTime(t.entry_time), v: cum }) }

  const vals = pts.map(p => p.v)
  const rawMin = Math.min(0, ...vals), rawMax = Math.max(0, ...vals)
  const rawRange = rawMax - rawMin || 1
  const grace = rawRange * 0.08
  const minV = rawMin - grace, maxV = rawMax + grace
  const range = maxV - minV
  const n = pts.length
  const last = vals[n - 1]
  const LC = last >= 0 ? '#3cc87a' : (drawdownAmt !== undefined && last <= -drawdownAmt) ? '#dc503c' : '#e2e8f0'

  const xOf = (i: number) => PXL + (i / Math.max(n - 1, 1)) * DW
  const yOf = (v: number) => PYT + DH - ((v - minV) / range) * DH
  const y0 = yOf(0)

  const xyPts = pts.map((p, i) => [xOf(i), yOf(p.v)] as [number, number])
  const polyPoints = xyPts.map(([x, y]) => `${x},${y}`).join(' ')
  const fillPath = `M${xyPts[0][0]} ${xyPts[0][1]} ${xyPts.slice(1).map(([x, y]) => `L${x} ${y}`).join(' ')} L${xOf(n - 1)} ${y0} L${xOf(0)} ${y0} Z`
  const gridStepY = (H - PYB - PYT) / 5
  const gridYs = [1, 2, 3, 4].map(k => PYT + k * gridStepY)

  const rawTicks = [rawMin, 0, rawMax]
  const yTicks = rawTicks.filter((v, i, a) => a.findIndex(x => Math.abs(x - v) < rawRange * 0.12) === i)

  const step = Math.max(1, Math.floor((n - 1) / 4))
  const xIdxSet = new Set([0, n - 1])
  for (let i = step; i < n - 1; i += step) xIdxSet.add(i)
  const xIdxs = [...xIdxSet].sort((a, b) => a - b)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="pnl-grad" x1="0" y1={PYT} x2="0" y2={H - PYB} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={LC} stopOpacity="0.35"/>
          <stop offset="65%" stopColor={LC} stopOpacity="0.06"/>
          <stop offset="100%" stopColor={LC} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {gridYs.map((gy, k) => (
        <line key={`dg${k}`} x1={PXL} y1={gy} x2={W - PXR} y2={gy} stroke="rgba(255,255,255,.06)" strokeWidth={0.5} strokeDasharray="4 6" />
      ))}
      {yTicks.map(v => (
        <line key={`g${v}`} x1={PXL} y1={yOf(v)} x2={W - PXR} y2={yOf(v)} stroke={gridColor} strokeWidth={0.5} />
      ))}
      <line x1={PXL} y1={PYT} x2={PXL} y2={H - PYB} stroke={gridColor} strokeWidth={1} />
      <line x1={PXL} y1={H - PYB} x2={W - PXR} y2={H - PYB} stroke={gridColor} strokeWidth={1} />
      {yTicks.map(v => (
        <text key={`t${v}`} x={PXL - 4} y={Math.max(PYT + 7, Math.min(H - PYB - 2, yOf(v) + 3))}
          textAnchor="end" fill={axisColor} fontSize="8" style={{ fontFamily: 'var(--font-geist-mono),monospace' }}>{fmtY(v)}</text>
      ))}
      {xIdxs.map(i => (
        <text key={i} x={Math.max(PXL + 14, Math.min(W - PXR - 14, xOf(i)))}
          y={H - PYB + 12} textAnchor="middle" fill={axisColor} fontSize="7.5" style={{ fontFamily: 'var(--font-geist-mono),monospace' }}>
          {pts[i].t}
        </text>
      ))}
      {n > 2 && <path d={fillPath} fill="url(#pnl-grad)" />}
      {n >= 2
        ? <polyline points={polyPoints} fill="none" stroke={LC} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        : <circle cx={xOf(0)} cy={yOf(pts[0].v)} r={4} fill={LC} />
      }
    </svg>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ score, alerts, stats, rules, paused, onTogglePause, notifPerm, onRequestNotif }: {
  score: number; alerts: AlertRow[]; stats: SessionStats; rules: TradingRules | null
  paused: boolean; onTogglePause: () => void
  notifPerm: string; onRequestNotif: () => void
}) {
  const C = useContext(ThemeCtx)
  const drawdownPct = rules
    ? Math.min(100, Math.round(Math.abs(Math.min(0, stats.total_pnl)) / ((rules.max_daily_drawdown_pct / 100) * (rules.account_size || 10000)) * 100))
    : 0
  const tradesPct = rules ? Math.min(100, Math.round(stats.total_trades / rules.max_trades_per_session * 100)) : 0

  const scoreCol = scoreColor(score, C)
  const statusLabel = score >= 70 ? 'Contrôlé' : score >= 40 ? 'Attention' : 'STOP'
  const statusCls = score >= 70 ? 'ok' : score >= 40 ? 'warn' : 'danger'
  const statusNote = score >= 70
    ? 'Session stable. Sizing cohérent sur les derniers trades.'
    : score >= 40
    ? 'Attention — un pattern comportemental détecté. Reste vigilant.'
    : 'Session dégradée. Plusieurs alertes actives. Envisage une pause.'

  const mSizing    = metricScore(alerts, 'revenge_sizing')
  const mRisk      = metricScore(alerts, 'drawdown')
  const mReentry   = metricScore(alerts, 'reentry')
  const mDrawdown  = Math.max(0, 100 - drawdownPct)
  const mDiscipline = metricScore(alerts, 'outside_session')

  return (
    <div style={{ borderRight: `.5px solid ${C.b}`, display: 'flex', flexDirection: 'column', background: C.sf, overflowY: 'auto', overflowX: 'hidden', textDecoration: 'none', borderRadius: 16, margin: '10px 0 10px 10px', overflow: 'hidden' }}>

      {/* Score */}
      <div style={{ padding: '20px 20px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${scoreCol}12 0%, transparent 60%)`, pointerEvents: 'none', transition: 'background .5s' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${scoreCol}90, ${scoreCol}30, transparent)`, transition: 'background .5s' }} />
        <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.td, display: 'block', marginBottom: 12, textTransform: 'uppercase' as const, fontFamily: MONO }}>Score comportemental</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRingSvg score={score} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8,
              padding: '5px 12px', borderRadius: 99, fontSize: 10, letterSpacing: .7,
              fontFamily: MONO,
              background: statusCls === 'ok' ? 'rgba(0,209,122,.1)' : statusCls === 'warn' ? 'rgba(255,171,0,.1)' : 'rgba(124,58,237,.12)',
              border: `.5px solid ${statusCls === 'ok' ? 'rgba(0,209,122,.28)' : statusCls === 'warn' ? 'rgba(255,171,0,.3)' : C.rb}`,
              color: statusCls === 'ok' ? C.g : statusCls === 'warn' ? C.o : C.red,
              boxShadow: `0 0 0 2px ${statusCls === 'ok' ? 'rgba(0,209,122,.06)' : statusCls === 'warn' ? 'rgba(255,171,0,.06)' : 'rgba(124,58,237,.08)'}`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', animation: statusCls !== 'ok' ? 'pulse 1.5s infinite' : 'none' }} />
              {statusLabel}
            </div>
            <div style={{ fontSize: 11, color: C.td, lineHeight: 1.55, fontWeight: 300, fontStyle: 'italic' }}>{statusNote}</div>
          </div>
        </div>
      </div>

      {/* Métriques */}
      <div style={{ padding: '20px 20px', flexShrink: 0, background: 'rgba(255,255,255,.012)' }}>
        <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.td, display: 'block', marginBottom: 11, textTransform: 'uppercase' as const, fontFamily: MONO }}>Métriques</span>
        <MetricBar label="Sizing"     value={mSizing} />
        <MetricBar label="Risk/trade" value={mRisk} />
        <MetricBar label="Re-entrées" value={mReentry} />
        <MetricBar label="Drawdown"   value={mDrawdown} />
        <MetricBar label="Horaires"   value={mDiscipline} />
      </div>

      {/* Règles du jour */}
      {rules && (
        <div style={{ padding: '20px 20px', flexShrink: 0, background: 'rgba(255,255,255,.012)' }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.td, display: 'block', marginBottom: 11, textTransform: 'uppercase' as const, fontFamily: MONO }}>Règles du jour</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
            <span style={{ fontSize: 12, color: C.td }}>Max trades</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{stats.total_trades}</span>
              <span style={{ fontSize: 11, color: C.te, fontFamily: MONO }}>/ {rules.max_trades_per_session}</span>
              <div style={{ width: 40, height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${tradesPct}%`, background: scoreColor(100 - tradesPct, C), borderRadius: 2, transition: 'width .4s' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 12, color: C.td }}>Fenêtre</span>
            <span style={{ fontSize: 11, color: C.g, fontFamily: MONO }}>{rules.session_start.slice(0,5)}–{rules.session_end.slice(0,5)}</span>
          </div>
        </div>
      )}

      {/* Alertes */}
      <div style={{ padding: '15px 20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.td, textTransform: 'uppercase' as const, fontFamily: MONO }}>Alertes</span>
          {alerts.length > 0 && (
            <span style={{ fontSize: 9, fontFamily: MONO, padding: '2px 9px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 99, color: C.red, animation: 'pulse 2s infinite' }}>
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length === 0 ? null : (
          alerts.slice(0, 8).map((a, i) => {
            const lvl = a.level ?? 1
            const aCol = lvl >= 2 ? C.red : C.o
            const aBorder = lvl >= 3 ? `${C.red}` : lvl >= 2 ? `${C.red}bb` : `${C.o}99`
            const aBg = lvl >= 3 ? `${C.red}0a` : lvl >= 2 ? `${C.red}06` : 'rgba(255,171,0,.04)'
            return (
              <div key={a.id ?? i} style={{
                padding: '9px 9px 9px 11px',
                borderBottom: i < Math.min(alerts.length, 8) - 1 ? `.5px solid ${C.b}` : 'none',
                borderLeft: `2px solid ${aBorder}`,
                background: aBg,
                animation: 'fadeUp .25s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 8.5, fontFamily: MONO, padding: '2px 6px', borderRadius: 99,
                    background: lvl >= 2 ? C.rd : 'rgba(255,171,0,.09)',
                    border: `.5px solid ${lvl >= 2 ? C.rb : 'rgba(255,171,0,.22)'}`,
                    color: aCol, letterSpacing: .3,
                  }}>L{lvl}</span>
                  <span style={{ fontSize: 10.5, color: C.td, letterSpacing: .3 }}>{(a.type ?? '').replace(/_/g, ' ')}</span>
                </div>
                <div style={{ fontSize: 12, color: C.tm, lineHeight: 1.45, fontWeight: 300 }}>{a.message}</div>
              </div>
            )
          })
        )}
      </div>

      {/* Notifications status */}
      <div style={{ padding: '12px 20px', borderTop: `.5px solid ${C.b}`, flexShrink: 0 }}>
        {notifPerm === 'granted' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d17a' }} />
            <span style={{ fontSize: 10.5, color: C.td, fontFamily: MONO }}>Notifications actives</span>
          </div>
        ) : notifPerm === 'denied' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569', flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: C.te, fontFamily: MONO, lineHeight: 1.4 }}>
              Notifications désactivées dans le navigateur
            </span>
          </div>
        ) : (
          <button
            onClick={onRequestNotif}
            style={{ width: '100%', padding: 10, background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 7, color: C.red, fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: .5, transition: 'all .2s', animation: 'pulse 2s infinite' }}
            onMouseEnter={e => { e.currentTarget.style.background = C.rg; e.currentTarget.style.animation = 'none' }}
            onMouseLeave={e => { e.currentTarget.style.background = C.rd; e.currentTarget.style.animation = 'pulse 2s infinite' }}
          >
            🔔 Activer les notifications
          </button>
        )}
      </div>

      {/* Pause */}
      <div style={{ padding: '8px 20px 14px', flexShrink: 0 }}>
        <button
          onClick={onTogglePause}
          style={{ width: '100%', padding: 10, background: paused ? 'rgba(255,171,0,.08)' : C.rg, border: `.5px solid ${paused ? 'rgba(255,171,0,.28)' : C.rb}`, borderRadius: 7, color: paused ? C.o : C.red, fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: 1, transition: 'all .2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = paused ? 'rgba(255,171,0,.13)' : C.rd)}
          onMouseLeave={e => (e.currentTarget.style.background = paused ? 'rgba(255,171,0,.08)' : C.rg)}
        >
          {paused ? '⏸ Alertes suspendues · Reprendre' : '⏸ Pause session'}
        </button>
      </div>
    </div>
  )
}

// ── SessionPanel ───────────────────────────────────────────────────────────────
function SessionPanel({ trades, alerts, stats, yesterdayStats, yesterdayTrend, rules }: {
  trades: TradeRow[]; alerts: AlertRow[]; stats: SessionStats
  yesterdayStats: { score: number; pnl: number; alerts: number } | null
  yesterdayTrend: number | null; rules: TradingRules | null
}) {
  const C = useContext(ThemeCtx)
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null)
  const score = computeScore(alerts)
  const streak = consecutiveLosses(trades)
  const sortedTrades = [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
  const drawdownPct = rules
    ? Math.min(100, Math.round(Math.abs(Math.min(0, stats.total_pnl)) / ((rules.max_daily_drawdown_pct / 100) * (rules.account_size || 10000)) * 100))
    : 0

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>

      {/* Row 1: PnL card | Session line | 4 mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'start' }}>

        {/* PnL card */}
        <div className="c-card" style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 22px', minWidth: 160, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.b3} 40%, transparent)` }} />
          <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.td, marginBottom: 10, textTransform: 'uppercase' as const, fontFamily: MONO }}>P&L session</div>
          <div style={{ fontSize: 36, fontWeight: 300, letterSpacing: -1.5, lineHeight: 1, color: C.tx }}>
            {fmtEur(stats.total_pnl)}
          </div>
          <div style={{ fontSize: 10, color: C.te, fontFamily: MONO, marginTop: 6, letterSpacing: .5 }}>en cours</div>
        </div>

        {/* Chart card — session line + PnL chart empilés */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${scoreColor(score, C)}80, ${scoreColor(score, C)}20, transparent)`, transition: 'background .5s' }} />
          <div style={{ fontSize: 9, color: C.te, letterSpacing: 1.5, marginBottom: 5, textTransform: 'uppercase' as const, fontFamily: MONO }}>Score comportemental</div>
          <div style={{ border: `.5px solid ${C.b}`, borderRadius: 2, height: 44, overflow: 'hidden', flexShrink: 0 }}>
            <SessionLine alerts={alerts} score={score} pnl={stats.total_pnl} />
          </div>
          <div style={{ borderTop: `.5px solid ${C.b}`, margin: '10px 0' }} />
          <div style={{ fontSize: 9, color: C.te, letterSpacing: 1.5, marginBottom: 5, textTransform: 'uppercase' as const, fontFamily: MONO }}>Courbe P&L</div>
          <div style={{ height: 180, flexShrink: 0 }}>
            <PnlChart trades={trades} drawdownAmt={rules ? (rules.max_daily_drawdown_pct / 100) * (rules.account_size || 10000) : undefined} />
          </div>
        </div>

        {/* 4 mini stat cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: 110 }}>
          {[
            { val: String(stats.total_trades), lbl: 'Trades', accent: C.b3 },
            { val: `${drawdownPct}%`, lbl: 'Drawdown', accent: drawdownPct > 80 ? C.red : drawdownPct > 50 ? C.o : C.b3 },
            { val: String(alerts.length), lbl: 'Alertes', accent: alerts.length > 0 ? C.red : C.b3 },
            { val: String(streak), lbl: streak <= 1 ? 'Perte consec.' : 'Pertes consec.', accent: streak >= 3 ? C.red : streak >= 2 ? C.o : C.b3 },
          ].map((item, i) => (
            <div key={i} className="c-card" style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 9, padding: '8px 13px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: item.accent, borderRadius: '9px 0 0 9px' }} />
              <div style={{ fontSize: 17, fontWeight: 300, letterSpacing: -.5, color: C.tx, fontFamily: MONO }}>{item.val}</div>
              <div style={{ fontSize: 8, color: C.te, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: MONO, marginTop: 1 }}>{item.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: J-1 */}
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '12px 18px', display: 'flex', gap: 22, alignItems: 'center', flexShrink: 0, borderLeft: `3px solid ${yesterdayStats ? `${scoreColor(yesterdayStats.score, C)}70` : C.b}` }}>
        <div style={{ fontSize: 9, color: C.te, letterSpacing: 1.5, fontFamily: MONO, textTransform: 'uppercase' as const }}>J−1</div>
        {yesterdayStats ? (
          <>
            {[
              { val: fmtEur(yesterdayStats.pnl), lbl: 'P&L', col: C.tm },
              { val: String(yesterdayStats.score), lbl: 'Score', col: C.tm },
              { val: String(yesterdayStats.alerts), lbl: 'Alertes', col: C.tm },
              ...(yesterdayTrend !== null ? [{ val: `${yesterdayTrend > 0 ? '+' : ''}${yesterdayTrend}`, lbl: 'Tendance', col: yesterdayTrend > 0 ? C.g : yesterdayTrend < 0 ? C.red : C.tm }] : []),
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
                {i > 0 && <div style={{ width: .5, height: 18, background: C.b2 }} />}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: -.3, color: item.col }}>{item.val}</div>
                  <div style={{ fontSize: 9.5, color: C.te, letterSpacing: .4 }}>{item.lbl}</div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <span style={{ fontSize: 11, color: C.te }}>Aucune session hier</span>
        )}
      </div>

      {/* Row 3: Trade feed */}
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.b3} 40%, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: C.td, textTransform: 'uppercase' as const, fontFamily: MONO }}>Flux de trades</span>
          {trades.length > 0 && <span style={{ fontSize: 9, fontFamily: MONO, color: C.te }}>{trades.length} trade{trades.length > 1 ? 's' : ''}</span>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {sortedTrades.length === 0 ? (
            <div style={{ fontSize: 12, color: C.te, fontStyle: 'italic', fontWeight: 300, padding: '10px 0' }}>
              Aucun trade aujourd'hui — connectez votre plateforme via l'onglet Intégrations.
            </div>
          ) : (
            sortedTrades.map((t, i) => {
              const tradeAlerts = alerts.filter(a =>
                a.trade_id ? a.trade_id === t.id
                : a.created_at && t.entry_time && Math.abs(new Date(a.created_at).getTime() - new Date(t.entry_time).getTime()) < 90000
              )
              const topAlert = tradeAlerts.sort((a, b) => (b.level ?? b.severity ?? 1) - (a.level ?? a.severity ?? 1))[0]
              const lvl = topAlert ? (topAlert.level ?? topAlert.severity ?? 1) : 0

              const LVL_STYLE: Record<number, { bg: string; border: string; badge: string; dot: string }> = {
                1: { bg: 'rgba(245,166,35,.05)', border: 'rgba(245,166,35,.35)', badge: '#f5a623', dot: 'rgba(245,166,35,.9)' },
                2: { bg: C.rd, border: `${C.red}80`, badge: C.red, dot: C.red },
                3: { bg: 'rgba(220,50,24,.08)', border: 'rgba(220,50,24,.5)', badge: '#dc3218', dot: '#dc3218' },
              }
              const ls = lvl > 0 ? LVL_STYLE[lvl] ?? LVL_STYLE[1] : null

              const tradeKey = String(t.id ?? i)
              const isExpanded = expandedTrade === tradeKey
              return (
                <div key={tradeKey}>
                  <div className="c-row" onClick={() => setExpandedTrade(isExpanded ? null : tradeKey)} style={{
                    display: 'grid', gridTemplateColumns: '60px 1fr auto auto', alignItems: 'center',
                    minHeight: 32, borderBottom: `.5px solid ${C.b}`,
                    background: ls ? ls.bg : 'transparent',
                    borderLeft: `2px solid ${ls ? ls.border : C.b}`,
                    padding: '0 8px 0 10px',
                    borderRadius: '0 5px 5px 0',
                    transition: 'background .12s',
                    cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: 10.5, color: C.td, fontFamily: MONO }}>{fmtTime(t.entry_time)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13.5, color: C.tm, fontWeight: 400 }}>
                        {t.symbol} {t.direction === 'long' ? 'Long' : 'Short'} ×{t.size}
                      </span>
                      {ls && (
                        <span style={{
                          fontSize: 8, padding: '1px 5px', fontFamily: MONO, letterSpacing: '.16em',
                          background: ls.bg, border: `.5px solid ${ls.border}`, color: ls.badge,
                          fontWeight: 600, borderRadius: 99,
                        }}>
                          L{lvl}
                        </span>
                      )}
                    </span>
                    <span />
                    <span style={{ fontSize: 13, fontFamily: MONO, color: C.tx, whiteSpace: 'nowrap' as const }}>
                      {fmtEur(t.pnl ?? 0)}
                    </span>
                  </div>
                  {isExpanded && (
                    <div style={{
                      background: 'rgba(255,255,255,.04)',
                      border: '.5px solid rgba(255,255,255,.08)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      margin: '2px 0 4px',
                      display: 'flex',
                      gap: 24,
                      flexWrap: 'wrap' as const,
                      animation: 'fadeIn .15s',
                    }}>
                      {[
                        { label: 'Entrée',  val: t.entry_price != null ? String(t.entry_price) : '—' },
                        { label: 'Sortie',  val: t.exit_price  != null ? String(t.exit_price)  : '—' },
                        { label: 'Durée',   val: fmtDuration(t.entry_time, t.exit_time) },
                        { label: 'Taille',  val: `${t.size} lot` },
                        { label: 'Symbole', val: t.symbol },
                      ].map(({ label, val }) => (
                        <div key={label}>
                          <div style={{ fontSize: 11, color: 'rgba(234,232,245,.4)', fontFamily: MONO, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 11, color: 'rgba(234,232,245,.95)', fontFamily: MONO }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}

// ── CalendrierPanel ────────────────────────────────────────────────────────────
function CalendrierPanel({ sessions }: { sessions: DaySession[] }) {
  const C = useContext(ThemeCtx)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calOffset, setCalOffset] = useState(0)

  const now = new Date()
  const displayDate = new Date(now.getFullYear(), now.getMonth() + calOffset, 1)
  const year = displayDate.getFullYear()
  const month = displayDate.getMonth()
  const monthName = displayDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  const firstDOW = (displayDate.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const sessionByDate: Record<string, DaySession> = {}
  for (const s of sessions) { sessionByDate[s.date] = s }

  const selectedSession = selectedDate ? sessionByDate[selectedDate] : null

  function cellDate(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const weeks: { lbl: string; days: number[] }[] = []
  let weekDays: number[] = []
  let weekStart = 1
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = (new Date(year, month, d).getDay() + 6) % 7
    if (dow === 0 && weekDays.length > 0) {
      weeks.push({ lbl: `Sem (${weekStart}–${d - 1})`, days: [...weekDays] })
      weekDays = []; weekStart = d
    }
    weekDays.push(d)
  }
  if (weekDays.length > 0) weeks.push({ lbl: `Sem (${weekStart}–${daysInMonth})`, days: weekDays })

  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((s, d) => s + d.score, 0) / sessions.length) : 0
  const totalPnl = sessions.reduce((s, d) => s + d.pnl, 0)
  const critical = sessions.filter(d => d.criticalAlerts > 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflowY: 'auto' }}>
      {/* Calendar grid */}
      <div style={{ padding: '20px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.3, textTransform: 'capitalize' as const }}>{monthName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['rgba(0,209,122,.7)', '≥ 70'], ['rgba(255,171,0,.7)', '40–69'], ['rgba(255,90,61,.7)', '< 40']].map(([bg, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.td }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: bg }} />
                  {lbl}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => setCalOffset(o => o - 1)} style={{ background: 'transparent', border: `.5px solid ${C.b}`, borderRadius: 6, color: C.td, cursor: 'pointer', width: 28, height: 28, fontSize: 14 }}>‹</button>
              <button onClick={() => setCalOffset(o => o + 1)} style={{ background: 'transparent', border: `.5px solid ${C.b}`, borderRadius: 6, color: C.td, cursor: 'pointer', width: 28, height: 28, fontSize: 14 }}>›</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d, i) => (
            <div key={d} style={{ textAlign: 'center' as const, fontSize: 10.5, color: C.td, padding: 3, opacity: i >= 5 ? .4 : 1 }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: firstDOW }, (_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1
            const dateStr = cellDate(d)
            const dow = (new Date(year, month, d).getDay() + 6) % 7
            const isWeekend = dow >= 5
            const s = sessionByDate[dateStr]
            const isSelected = selectedDate === dateStr

            if (isWeekend || !s) {
              return (
                <div key={d} style={{ minHeight: 68, borderRadius: 9, border: `.5px solid ${C.b2}`, background: C.sf2, display: 'flex', flexDirection: 'column', padding: 9, opacity: isWeekend ? 0.3 : 0.45 }}>
                  <div style={{ fontSize: 11, color: C.td, fontFamily: MONO }}>{d}</div>
                </div>
              )
            }
            const col = scoreColor(s.score, C)
            const cellBg = s.score >= 70 ? 'rgba(0,209,122,.13)' : s.score >= 40 ? 'rgba(255,171,0,.12)' : 'rgba(255,90,61,.12)'
            const cellBorder = isSelected
              ? 'rgba(124,58,237,.6)'
              : s.score >= 70 ? 'rgba(0,209,122,.35)' : s.score >= 40 ? 'rgba(255,171,0,.35)' : 'rgba(255,90,61,.35)'

            return (
              <div key={d} onClick={() => setSelectedDate(isSelected ? null : dateStr)} style={{
                minHeight: 74, borderRadius: 9, border: `.5px solid ${cellBorder}`,
                background: isSelected ? 'rgba(124,58,237,.12)' : cellBg,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: 9,
                position: 'relative', transition: 'all .18s',
                outline: isSelected ? '1.5px solid rgba(124,58,237,.5)' : 'none', outlineOffset: 1,
              }}>
                {s.alertCount > 0 && <div style={{ position: 'absolute', top: 7, right: 7, width: 5, height: 5, borderRadius: '50%', background: C.red }} />}
                <div style={{ fontSize: 11, color: C.te, fontFamily: MONO, marginBottom: 4 }}>{d}</div>
                <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -1, lineHeight: 1, marginBottom: 2, color: col }}>{s.score}</div>
                <div style={{ fontSize: 10, color: C.td, fontFamily: MONO }}>{fmtEur(s.pnl)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail + weeks + stats */}
      <div style={{ padding: '0 26px 30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Day detail */}
        <div>
          <span style={{ fontSize: 11, letterSpacing: .3, color: C.td, display: 'block', marginBottom: 10 }}>Détail du jour</span>
          {selectedSession ? (
            <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: 'linear-gradient(90deg,transparent,rgba(124,58,237,.3),transparent)' }} />
              <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 10 }}>{selectedDate}</div>
              <div style={{ fontSize: 38, fontWeight: 300, letterSpacing: -1.5, lineHeight: 1, color: scoreColor(selectedSession.score, C) }}>{selectedSession.score}</div>
              <div style={{ fontSize: 13.5, color: C.tm, marginBottom: 12, marginTop: 4 }}>{fmtEur(selectedSession.pnl)}</div>
              {[
                { k: 'Trades', v: String(selectedSession.tradeCount) },
                { k: 'Win rate', v: selectedSession.tradeCount > 0 ? `${Math.round(selectedSession.wins / selectedSession.tradeCount * 100)}%` : '—' },
                { k: 'Alertes', v: String(selectedSession.alertCount) },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
                  <span style={{ fontSize: 12, color: C.td }}>{k}</span>
                  <span style={{ fontSize: 12.5, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              {selectedSession.alerts.slice(0, 2).map((a, i) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: 7, marginTop: 8, border: `.5px solid ${a.level >= 2 ? C.rb : 'rgba(255,171,0,.18)'}`, background: a.level >= 2 ? C.rd : 'rgba(255,171,0,.06)' }}>
                  <div style={{ fontSize: 10, fontFamily: MONO, marginBottom: 3, color: a.level >= 2 ? C.red : C.o }}>L{a.level} · {a.type}</div>
                  <div style={{ fontSize: 11.5, color: C.tm, lineHeight: 1.4, fontWeight: 300 }}>{a.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.te, fontStyle: 'italic', background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 16 }}>
              Clique sur un jour du calendrier pour voir le détail.
            </div>
          )}
        </div>

        {/* Weeks + month stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: .3, color: C.td, display: 'block', marginBottom: 10 }}>Scores par semaine</span>
            {weeks.map(w => {
              const wScores = w.days.map(d => sessionByDate[cellDate(d)]?.score).filter((s): s is number => s !== undefined)
              if (wScores.length === 0) return null
              const avg = Math.round(wScores.reduce((a, b) => a + b) / wScores.length)
              const col = scoreColor(avg, C)
              return (
                <div key={w.lbl} style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 9, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: C.td }}>{w.lbl}</span>
                    <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 500, color: col }}>{avg}</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${avg}%`, background: col, borderRadius: 2, transition: 'width .5s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {w.days.map(d => {
                      const ds = sessionByDate[cellDate(d)]
                      if (!ds) return <div key={d} style={{ width: 40, height: 40, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b2}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, opacity: .4 }}><span style={{ fontSize: 8.5, color: C.td, fontFamily: MONO }}>{d}</span></div>
                      const dc = scoreColor(ds.score, C)
                      const dbg = ds.score >= 70 ? 'rgba(0,209,122,' : ds.score >= 40 ? 'rgba(255,171,0,' : 'rgba(255,90,61,'
                      return (
                        <div key={d} onClick={() => setSelectedDate(cellDate(d))} style={{ width: 40, height: 40, borderRadius: 8, background: `${dbg}.14)`, border: `.5px solid ${dbg}.35)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', transition: 'filter .15s' }}>
                          <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 500, color: dc }}>{ds.score}</span>
                          <span style={{ fontSize: 8.5, color: C.td, fontFamily: MONO }}>{d}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div>
            <span style={{ fontSize: 11, letterSpacing: .3, color: C.td, display: 'block', marginBottom: 10 }}>Stats du mois</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { val: String(avgScore), lbl: 'Score moy.', col: scoreColor(avgScore, C) },
                { val: String(sessions.length), lbl: 'Sessions', col: C.tm },
                { val: String(critical), lbl: 'Critiques', col: critical > 0 ? C.red : C.te },
                { val: fmtEur(totalPnl), lbl: 'P&L total', col: '#e2e8f0' },
              ].map((item, i) => (
                <div key={i} style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 9, padding: '12px 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: -.5, color: item.col }}>{item.val}</div>
                  <div style={{ fontSize: 10, color: C.td, letterSpacing: .3, marginTop: 3 }}>{item.lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AnalyticsPanel ─────────────────────────────────────────────────────────────
function AnalyticsPanel({ sessions, todayAlerts }: { sessions: DaySession[]; todayAlerts: AlertRow[] }) {
  const C = useContext(ThemeCtx)
  if (sessions.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.te, fontSize: 13, fontFamily: MONO }}>
        // aucune donnée historique disponible
      </div>
    )
  }

  const totalPnl = sessions.reduce((s, d) => s + d.pnl, 0)
  const avgScore = Math.round(sessions.reduce((s, d) => s + d.score, 0) / sessions.length)
  const sessionsAbove80 = sessions.filter(d => d.score >= 80).length
  const sessionsCritical = sessions.filter(d => d.score < 40).length
  const allAlerts = [...sessions.flatMap(d => d.alerts), ...todayAlerts.map(a => ({ type: a.type ?? '', level: a.level ?? 1 }))]

  const patternCounts: Record<string, number> = {}
  for (const a of allAlerts) {
    const t = (a.type ?? '').replace(/_/g, ' ')
    if (t) patternCounts[t] = (patternCounts[t] ?? 0) + 1
  }
  const patterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxCount = patterns[0]?.[1] ?? 1

  const totalTrades = sessions.reduce((s, d) => s + d.tradeCount, 0)
  const totalWins = sessions.reduce((s, d) => s + d.wins, 0)
  const winRate = totalTrades > 0 ? Math.round(totalWins / totalTrades * 100) : 0
  const totalAlerts = sessions.reduce((s, d) => s + d.alertCount, 0)
  const avgTrades = sessions.length > 0 ? (totalTrades / sessions.length).toFixed(1) : '—'

  // Heatmap from weekday performance
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
  const byDow: Record<number, DaySession[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] }
  for (const s of sessions) {
    const dow = (new Date(s.date).getDay() + 6) % 7
    if (dow < 5) byDow[dow].push(s)
  }

  // Cumulative PnL chart
  const cumulPts = sessions.reduce<{ date: string; v: number }[]>((acc, s) => {
    const prev = acc[acc.length - 1]?.v ?? 0
    return [...acc, { date: s.date, v: prev + s.pnl }]
  }, [])

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>

      {/* Row 1: 3 KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

        {/* P&L cumulé */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 16 }}>P&L cumulé — {sessions.length}j</div>
          <div style={{ fontSize: 34, fontWeight: 300, letterSpacing: -2, lineHeight: 1, marginBottom: 3, color: '#e2e8f0' }}>{fmtEur(totalPnl)}</div>
          <div style={{ fontSize: 12, color: C.td }}>Sur {sessions.length} sessions tradées</div>
          {cumulPts.length >= 2 && (() => {
            const vals = cumulPts.map(p => p.v)
            const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
            const range = maxV - minV || 1
            const n = cumulPts.length
            const W2 = 600, H2 = 110, PXL2 = 42, PXR2 = 6, PYT2 = 6, PYB2 = 18
            const DW2 = W2 - PXL2 - PXR2, DH2 = H2 - PYT2 - PYB2
            const xOf = (i: number) => PXL2 + (i / (n - 1)) * DW2
            const yOf = (v: number) => PYT2 + DH2 - ((v - minV) / range) * DH2
            const y0 = yOf(0)
            const ptStr = cumulPts.map((p, i) => `${xOf(i)},${yOf(p.v)}`).join(' ')
            const fillPath = `M${xOf(0)},${y0} ${cumulPts.map((p, i) => `L${xOf(i)},${yOf(p.v)}`).join(' ')} L${xOf(n-1)},${y0} Z`
            const rawTicks = [minV, 0, maxV].filter((v, i, a) => a.findIndex(x => Math.abs(x - v) < range * 0.12) === i)
            const fmtY2 = (v: number) => v === 0 ? '€0' : v > 0 ? `+€${Math.abs(v).toFixed(0)}` : `-€${Math.abs(v).toFixed(0)}`
            const step2 = Math.max(1, Math.floor((n - 1) / 4))
            const xIdxSet2 = new Set([0, n - 1])
            for (let i = step2; i < n - 1; i += step2) xIdxSet2.add(i)
            const xIdxs2 = [...xIdxSet2].sort((a, b) => a - b)
            return (
              <div style={{ marginTop: 14, height: 110 }}>
                <svg viewBox={`0 0 ${W2} ${H2}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <line x1={PXL2} y1={PYT2} x2={PXL2} y2={H2 - PYB2} stroke="rgba(255,255,255,.08)" strokeWidth={1} />
                  <line x1={PXL2} y1={H2 - PYB2} x2={W2 - PXR2} y2={H2 - PYB2} stroke="rgba(255,255,255,.08)" strokeWidth={1} />
                  <line x1={PXL2} y1={y0} x2={W2 - PXR2} y2={y0} stroke="rgba(255,255,255,.08)" strokeWidth={0.5} strokeDasharray="4 6" />
                  {rawTicks.map(v => <text key={v} x={PXL2 - 4} y={Math.max(PYT2 + 7, Math.min(H2 - PYB2 - 2, yOf(v) + 3))} textAnchor="end" fill="rgba(234,232,245,.35)" fontSize="8" style={{ fontFamily: 'monospace' }}>{fmtY2(v)}</text>)}
                  {xIdxs2.map(i => <text key={i} x={Math.max(PXL2 + 14, Math.min(W2 - PXR2 - 14, xOf(i)))} y={H2 - PYB2 + 12} textAnchor="middle" fill="rgba(234,232,245,.3)" fontSize="7.5" style={{ fontFamily: 'monospace' }}>{cumulPts[i].date.slice(5)}</text>)}
                  <path d={fillPath} fill="rgba(234,232,245,.05)" />
                  <polyline points={ptStr} fill="none" stroke="#e2e8f0" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={xOf(n-1)} cy={yOf(vals[n-1])} r={3} fill="#e2e8f0" />
                </svg>
              </div>
            )
          })()}
        </div>

        {/* Score moyen */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 16 }}>Score moyen</div>
          <div style={{ fontSize: 34, fontWeight: 300, letterSpacing: -2, lineHeight: 1, marginBottom: 3, color: scoreColor(avgScore, C) }}>{avgScore}</div>
          <div style={{ fontSize: 12, color: C.td, marginBottom: 14 }}>Sur {sessions.length} sessions</div>
          {[
            { k: `Sessions > 80`, v: `${sessionsAbove80} / ${sessions.length}` },
            { k: `Sessions critiques`, v: `${sessionsCritical} / ${sessions.length}` },
            { k: `Tendance 30j`, v: '— pts' },
          ].map(({ k, v }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
              <span style={{ fontSize: 12.5, color: C.td }}>{k}</span>
              <span style={{ fontSize: 12.5, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Performance par jour */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 16 }}>Performance par jour</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, marginTop: 8 }}>
            {dayNames.map((name, i) => {
              const ds = byDow[i] ?? []
              const avg = ds.length > 0 ? Math.round(ds.reduce((s, d) => s + d.score, 0) / ds.length) : null
              const col = avg !== null ? scoreColor(avg, C) : C.te
              const dbg = avg !== null ? (avg >= 70 ? 'rgba(0,209,122,' : avg >= 40 ? 'rgba(255,171,0,' : 'rgba(255,90,61,') : 'rgba(255,255,255,'
              return (
                <div key={name} style={{ borderRadius: 7, height: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: `${dbg}.09)`, border: `.5px solid ${dbg}.22)` }}>
                  <span style={{ fontSize: 14, fontFamily: MONO, fontWeight: 500, color: col }}>{avg ?? '—'}</span>
                  <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.3)', fontFamily: MONO }}>{name}</span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 12 }}>
            {[
              { k: 'Meilleur créneau', v: 'Lun–Mar' },
              { k: 'Win rate global', v: `${winRate}%` },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
                <span style={{ fontSize: 12.5, color: C.td }}>{k}</span>
                <span style={{ fontSize: 12.5, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Patterns + Stats détaillées */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>

        {/* Patterns */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 16 }}>Patterns déclenchés ce mois</div>
          {patterns.length === 0 ? (
            <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic' }}>Aucun pattern détecté — excellent travail.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {patterns.map(([type, count]) => {
                const pct = Math.round((count / maxCount) * 100)
                const col = pct >= 60 ? C.red : pct >= 30 ? C.o : C.b3
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ fontSize: 12, color: C.td, width: 130, flexShrink: 0 }}>{type}</span>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, color: C.tm, fontFamily: MONO, width: 28, textAlign: 'right' as const, fontWeight: 500 }}>{count}×</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Stats détaillées */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 16 }}>Stats détaillées</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { val: `${winRate}%`, lbl: 'Win rate global' },
              { val: String(sessions.length), lbl: 'Sessions ce mois' },
              { val: '—', lbl: 'Sessions pausées' },
              { val: String(totalAlerts), lbl: 'Alertes totales' },
            ].map((item, i) => (
              <div key={i} style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: 9, padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: -.5 }}>{item.val}</div>
                <div style={{ fontSize: 9.5, color: C.te, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: MONO, marginTop: 3 }}>{item.lbl}</div>
              </div>
            ))}
          </div>
          {[
            { k: 'Moy. alertes / session', v: sessions.length > 0 ? (totalAlerts / sessions.length).toFixed(1) : '—' },
            { k: 'Trades / session', v: avgTrades },
            { k: 'Trades total', v: String(totalTrades) },
          ].map(({ k, v }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
              <span style={{ fontSize: 12.5, color: C.td }}>{k}</span>
              <span style={{ fontSize: 12.5, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── RapportsPanel ──────────────────────────────────────────────────────────────
function RapportsPanel() {
  const C = useContext(ThemeCtx)
  const [loading, setLoading] = useState<string | null>(null)

  function getWeekMonday(offsetWeeks: number = 0): Date {
    const now = new Date()
    const dow = now.getDay()
    const diff = dow === 0 ? -6 : 1 - dow
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff + offsetWeeks * 7)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  function toISODate(d: Date): string {
    return d.toISOString().split('T')[0]
  }

  function frWeekLabel(monday: Date): string {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmtStart = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const fmtEnd = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${fmtStart} – ${fmtEnd}`
  }

  async function downloadPdf(weekStart: string) {
    setLoading(weekStart)
    try {
      const res = await fetch(`/api/report/weekly?week_start=${weekStart}`)
      if (!res.ok) throw new Error('Erreur génération PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `caldra-rapport-${weekStart}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent — user can retry
    } finally {
      setLoading(null)
    }
  }

  const currentMonday = getWeekMonday(0)
  const weeks = [
    { monday: getWeekMonday(-1), isCurrent: false },
    { monday: getWeekMonday(-2), isCurrent: false },
    { monday: getWeekMonday(-3), isCurrent: false },
    { monday: getWeekMonday(-4), isCurrent: false },
  ]

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.3, marginBottom: 5 }}>Rapports hebdomadaires</div>
        <div style={{ fontSize: 12.5, color: C.td }}>PDF généré à la demande — score, PnL, alertes comportementales, journal des trades.</div>
      </div>

      {/* Semaine en cours — non disponible */}
      <div style={{
        background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 20,
        display: 'flex', alignItems: 'center', gap: 16, opacity: .5,
      }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          📋
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 400, color: C.tx, marginBottom: 3 }}>
            {frWeekLabel(currentMonday)}
          </div>
          <div style={{ fontSize: 11, color: C.td }}>Semaine en cours — disponible lundi prochain</div>
        </div>
        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontFamily: MONO, whiteSpace: 'nowrap' as const, background: 'rgba(255,255,255,.04)', border: `.5px solid ${C.b}`, color: C.td }}>
          En cours
        </span>
      </div>

      {/* Semaines passées */}
      {weeks.map(({ monday }, i) => {
        const weekStart = toISODate(monday)
        const isLoading = loading === weekStart
        return (
          <div key={i} style={{
            background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 20,
            display: 'flex', alignItems: 'center', gap: 16,
            transition: 'border-color .18s',
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              📋
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 400, color: C.tx, marginBottom: 3 }}>
                {frWeekLabel(monday)}
              </div>
              <div style={{ fontSize: 11, color: C.td }}>
                {i === 0 ? 'Semaine précédente' : `Il y a ${i + 1} semaines`}
              </div>
            </div>
            <button
              onClick={() => downloadPdf(weekStart)}
              disabled={isLoading}
              style={{
                fontSize: 11, padding: '7px 16px', borderRadius: 8, fontFamily: MONO,
                whiteSpace: 'nowrap' as const, cursor: isLoading ? 'default' : 'pointer',
                background: isLoading ? 'rgba(124,58,237,.05)' : C.rd,
                border: `.5px solid ${C.rb}`,
                color: isLoading ? C.td : C.red,
                transition: 'all .18s',
                opacity: isLoading ? .6 : 1,
              }}
            >
              {isLoading ? 'Génération…' : 'Télécharger PDF'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── IntegrationsPanel ──────────────────────────────────────────────────────────
function IntegrationsPanel({ apiKeyPrefix, initialWebhook }: { apiKeyPrefix: string | null; initialWebhook: string | null }) {
  const C = useContext(ThemeCtx)
  const [prefix, setPrefix]     = useState(apiKeyPrefix)
  const [newKey, setNewKey]     = useState<string|null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyConfirm, setKeyConfirm] = useState(false)
  const hasKey = !!prefix
  const [webhookUrl, setWebhookUrl] = useState(initialWebhook ?? '')

  const [webhookSave, setWebhookSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function genKey() {
    setKeyLoading(true); setNewKey(null); setKeyConfirm(false)
    const d = await fetch('/api/api-key', { method: 'POST' }).then(r => r.json())
    setNewKey(d.key); setPrefix(d.key_prefix); setKeyLoading(false)
  }
  async function revokeKey() {
    setKeyLoading(true)
    await fetch('/api/api-key', { method: 'DELETE' })
    setPrefix(null); setNewKey(null); setKeyLoading(false)
  }
  async function copyKey() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000)
  }

  function downloadBot() {
    const key = newKey ?? 'PASTE_YOUR_FULL_API_KEY_HERE'
    const cs = `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Globalization;
using cAlgo.API;

namespace CaldraBot
{
    [Robot(TimeZone = TimeZones.UTC, AccessRights = AccessRights.FullAccess)]
    public class CaldraBot : Robot
    {
        [Parameter("Caldra API Key", DefaultValue = "${key}")]
        public string CaldraApiKey { get; set; }

        private static readonly new HttpClient Http = new HttpClient();

        protected override void OnStart()
        {
            Http.DefaultRequestHeaders.Remove("x-caldra-key");
            Http.DefaultRequestHeaders.Add("x-caldra-key", CaldraApiKey);
            Positions.Closed += OnPositionClosed;
            Print("Caldra: bot démarré");
        }

        private void OnPositionClosed(PositionClosedEventArgs args)
        {
            var pos = args.Position;
            var direction = pos.TradeType == TradeType.Buy ? "long" : "short";
            var entryTime = pos.EntryTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");
            var exitTime  = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            // Prix de sortie calculé depuis le PnL brut et le volume
            var pips      = pos.GrossProfit / (pos.Quantity * pos.Symbol.PipValue);
            var exitPx    = pos.TradeType == TradeType.Buy
                ? pos.EntryPrice + pips * pos.Symbol.PipSize
                : pos.EntryPrice - pips * pos.Symbol.PipSize;
            var exitPrice = exitPx.ToString(CultureInfo.InvariantCulture);

            var json = string.Format(
                "{{\\"symbol\\":\\"{0}\\",\\"direction\\":\\"{1}\\",\\"size\\":{2},\\"entry_price\\":{3},\\"exit_price\\":{4},\\"entry_time\\":\\"{5}\\",\\"exit_time\\":\\"{6}\\",\\"pnl\\":{7}}}",
                pos.SymbolName, direction,
                pos.Quantity.ToString(CultureInfo.InvariantCulture),
                pos.EntryPrice.ToString(CultureInfo.InvariantCulture),
                exitPrice, entryTime, exitTime,
                pos.GrossProfit.ToString(CultureInfo.InvariantCulture)
            );

            Task.Run(async () => {
                try {
                    var res = await Http.PostAsync("https://getcaldra.com/api/ingest",
                        new StringContent(json, Encoding.UTF8, "application/json"));
                    Print(string.Format("Caldra: {0} {1} — PnL={2} ({3})",
                        pos.SymbolName, direction, pos.GrossProfit, (int)res.StatusCode));
                } catch (Exception e) { Print("Caldra erreur: " + e.Message); }
            });
        }

        protected override void OnStop() { }
    }
}`
    const blob = new Blob([cs], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'CaldraBot.cs'; a.click()
    URL.revokeObjectURL(url)
  }

  async function saveWebhook() {
    if (webhookSave === 'saving') return
    setWebhookSave('saving')
    try {
      const current = await fetch('/api/rules').then(r => r.json())
      const res = await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current, slack_webhook_url: webhookUrl || null }),
      })
      setWebhookSave(res.ok ? 'saved' : 'error')
      if (res.ok) setTimeout(() => setWebhookSave('idle'), 3000)
    } catch {
      setWebhookSave('error')
    }
  }

  const IntCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 22, position: 'relative', overflow: 'hidden', transition: 'border-color .2s', ...style }}>
      {children}
    </div>
  )

  const IntBtn = ({ primary, children, onClick, href }: { primary?: boolean; children: React.ReactNode; onClick?: () => void; href?: string }) => {
    const st: React.CSSProperties = {
      flex: 1, padding: 9, borderRadius: 7, fontSize: 11, fontFamily: SANS, cursor: 'pointer',
      textAlign: 'center' as const, textDecoration: 'none', display: 'block', transition: 'all .2s',
      background: primary ? C.rd : 'transparent',
      border: `.5px solid ${primary ? C.rb : C.b}`,
      color: primary ? C.red : C.td,
    }
    if (href) return <a href={href} style={st}>{children}</a>
    return <button onClick={onClick} style={st}>{children}</button>
  }

  return (
    <div style={{ padding: 26, overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: C.red, textTransform: 'uppercase' as const, marginBottom: 6 }}>Connecteurs</div>
        <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: -.3, marginBottom: 4 }}>Intégrations</div>
        <div style={{ fontSize: 12.5, color: C.td }}>Connectez vos plateformes de trading — les trades seront analysés automatiquement.</div>
      </div>

      {/* ── Clé API ── */}
      <IntCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.red, marginBottom: 4 }}>Authentification</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.tx }}>Clé API</div>
            <div style={{ fontSize: 11, color: C.td, marginTop: 2 }}>Requise pour envoyer des trades depuis ta plateforme.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasKey ? C.g : 'rgba(255,255,255,.18)' }} />
            <span style={{ fontSize: 10, color: hasKey ? C.g : C.td, letterSpacing: .5 }}>{hasKey ? 'ACTIVE' : 'INACTIVE'}</span>
          </div>
        </div>

        {prefix ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,.02)', border: `.5px solid ${C.b}`, borderRadius: 7, padding: '10px 14px', marginBottom: 12 }}>
            <code style={{ color: C.tm, fontSize: 12, fontFamily: MONO }}>
              {prefix}<span style={{ opacity: .3 }}>{'•'.repeat(18)}</span>
            </code>
            <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
              {keyConfirm ? (
                <>
                  <button onClick={() => setKeyConfirm(false)} style={{ fontSize: 9, padding: '5px 10px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 5, color: C.td, cursor: 'pointer', fontFamily: SANS, letterSpacing: 1 }}>Annuler</button>
                  <button onClick={genKey} disabled={keyLoading} style={{ fontSize: 9, padding: '5px 10px', background: 'rgba(244,63,94,.07)', border: '.5px solid rgba(244,63,94,.22)', borderRadius: 5, color: 'rgba(244,63,94,.75)', cursor: 'pointer', fontFamily: SANS, letterSpacing: 1 }}>Confirmer</button>
                </>
              ) : (
                <button onClick={() => setKeyConfirm(true)} style={{ fontSize: 9, padding: '5px 10px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 5, color: C.td, cursor: 'pointer', fontFamily: SANS, letterSpacing: 1 }}>Regénérer</button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12.5, color: C.te }}>Aucune clé active</span>
            <button onClick={genKey} disabled={keyLoading} style={{ padding: '7px 16px', background: C.red, border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: .5 }}>{keyLoading ? 'Génération…' : 'Générer une clé'}</button>
          </div>
        )}

        {newKey && (
          <div style={{ background: 'rgba(16,185,129,.05)', border: '.5px solid rgba(16,185,129,.18)', borderRadius: 7, padding: '10px 14px', marginBottom: 4 }}>
            <div style={{ color: 'rgba(16,185,129,.75)', fontSize: 11, marginBottom: 8, fontFamily: SANS }}>⚠ Copiez maintenant — ne sera plus visible.</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ flex: 1, color: 'rgba(134,239,172,.85)', fontSize: 11, fontFamily: MONO, wordBreak: 'break-all' as const, background: 'rgba(16,185,129,.04)', padding: '7px 10px', borderRadius: 5, border: '.5px solid rgba(16,185,129,.14)' }}>{newKey}</code>
              <button onClick={copyKey} style={{ padding: '7px 12px', background: 'rgba(16,185,129,.09)', border: '.5px solid rgba(16,185,129,.22)', borderRadius: 5, color: 'rgba(16,185,129,.8)', fontSize: 9, fontFamily: SANS, cursor: 'pointer', letterSpacing: 1, flexShrink: 0 }}>{keyCopied ? '✓ Copié' : 'Copier'}</button>
            </div>
          </div>
        )}

      </IntCard>

      {/* ── Plateformes ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.te, textTransform: 'uppercase' as const, marginBottom: 12 }}>Plateformes</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>

          {/* cTrader cBot */}
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: MONO, flexShrink: 0 }}>CT</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>cTrader</div>
                <div style={{ fontSize: 10.5, color: C.td }}>Pepperstone, IC Markets, FxPro, Eightcap…</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 14 }}>
              {([
                ['1', 'Génère ta clé API dans la section ci-dessus si ce n\'est pas encore fait.'],
                ['2', 'Télécharge le fichier CaldraBot.cs ci-dessous.'],
                ['3', 'Dans cTrader, clique sur "Algo" dans la barre du haut → "New cBot".'],
                ['4', 'Dans l\'assistant qui s\'ouvre, clique sur "Suivant" jusqu\'à la fin puis "Créer".'],
                ['5', 'Supprime tout le code existant dans l\'éditeur, puis colle le contenu du fichier CaldraBot.cs.'],
                ['6', 'Clique sur "Build" (Ctrl+B) et attends que "Build succeeded" apparaisse en bas.'],
                ['7', 'Le bot apparaît dans le panel Algo. Clique dessus → "Paramètres" → colle ta clé API → "Start".'],
              ] as [string, string][]).map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: C.red, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{n}</div>
                  <div style={{ fontSize: 11, color: C.td, lineHeight: 1.5 }}>{t}</div>
                </div>
              ))}
            </div>

            <button
              onClick={downloadBot}
              disabled={!hasKey}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 7, fontSize: 11, fontFamily: SANS, cursor: hasKey ? 'pointer' : 'not-allowed', background: C.rd, border: `.5px solid ${C.rb}`, color: hasKey ? C.red : C.te, transition: 'all .2s', opacity: hasKey ? 1 : .5 }}
            >
              {hasKey ? 'Télécharger CaldraBot.cs →' : 'Génère d\'abord ta clé API'}
            </button>
          </IntCard>

          {/* MetaTrader 5 EA */}
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: MONO, flexShrink: 0 }}>MT5</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>MetaTrader 5</div>
                <div style={{ fontSize: 10.5, color: C.td }}>Vantage, Admirals, XM, FTMO…</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 14 }}>
              {([
                ['1', 'Génère ta clé API dans la section ci-dessus si ce n\'est pas encore fait.'],
                ['2', 'Télécharge le fichier CaldraMT5.mq5 ci-dessous.'],
                ['3', 'Dans MT5, clique sur "Fichier" → "Ouvrir le dossier des données". Navigue dans MQL5/Experts et colle le fichier.'],
                ['4', 'Toujours dans MT5 → "Outils" → "Options" → onglet "Expert Consultants". Coche "Autoriser les requêtes WebRequest", clique "+" et entre https://getcaldra.com → OK.'],
                ['5', 'Appuie sur F4 pour ouvrir MetaEditor. Ouvre CaldraMT5.mq5 puis F7 pour compiler. Ferme MetaEditor quand c\'est bon.'],
                ['6', 'Affiche le Navigateur (Ctrl+N) → "Expert Consultants" → clic droit → "Actualiser". CaldraMT5 apparaît dans la liste.'],
                ['7', 'Double-clique sur CaldraMT5, va dans l\'onglet "Données d\'entrées" et colle ta clé API dans le champ prévu → OK.'],
                ['8', 'Vérifie que le bouton "Trading Algo" en haut de MT5 est vert. Chaque trade fermé est automatiquement envoyé à Caldra.'],
              ] as [string, string][]).map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: C.red, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{n}</div>
                  <div style={{ fontSize: 11, color: C.td, lineHeight: 1.5 }}>{t}</div>
                </div>
              ))}
            </div>

            <a
              href="/CaldraMT5.mq5"
              download
              style={{ display: 'block', width: '100%', padding: '9px 10px', borderRadius: 7, fontSize: 11, fontFamily: SANS, textAlign: 'center' as const, textDecoration: 'none', background: C.rd, border: `.5px solid ${C.rb}`, color: C.red, transition: 'all .2s', boxSizing: 'border-box' as const }}
            >
              Télécharger CaldraMT5.mq5 →
            </a>
          </IntCard>

          {/* TradingView */}
          <IntCard style={{ opacity: .5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: MONO, flexShrink: 0 }}>TV</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>TradingView</div>
                <div style={{ fontSize: 10.5, color: C.td }}>Alertes webhook — tous brokers</div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontFamily: MONO, whiteSpace: 'nowrap' as const, background: 'rgba(255,255,255,.04)', border: `.5px solid ${C.b}`, color: C.td }}>Prochainement</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
              {(['1. Crée une alerte sur ton graphique TradingView.', '2. Dans "Notifications webhook", colle l\'URL Caldra.', '3. Tes trades sont envoyés automatiquement à chaque exécution.'] as string[]).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: C.red, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 11, color: C.td, lineHeight: 1.5 }}>{t.slice(3)}</div>
                </div>
              ))}
            </div>
          </IntCard>

          {/* Tradovate */}
          <IntCard style={{ opacity: .5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: MONO, flexShrink: 0 }}>TRD</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>Tradovate</div>
                <div style={{ fontSize: 10.5, color: C.td }}>Futures US</div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontFamily: MONO, whiteSpace: 'nowrap' as const, background: 'rgba(255,255,255,.04)', border: `.5px solid ${C.b}`, color: C.td }}>Prochainement</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
              {(['Télécharge le script Caldra pour Tradovate.', 'Colle ta clé API dans les paramètres du script.', 'Lance le script — chaque trade est envoyé automatiquement.'] as string[]).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: C.red, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 11, color: C.td, lineHeight: 1.5 }}>{t}</div>
                </div>
              ))}
            </div>
          </IntCard>

        </div>
      </div>

    </div>
  )
}

// ── ReglesPanel ────────────────────────────────────────────────────────────────
function ReglesPanel({ initial }: { initial: TradingRules | null }) {
  const C = useContext(ThemeCtx)
  const defaults: TradingRules = {
    max_daily_drawdown_pct: 3, max_consecutive_losses: 3,
    min_time_between_entries_sec: 120, session_start: '09:30',
    session_end: '16:00', max_trades_per_session: 10, max_risk_per_trade_pct: 1,
    account_size: 10000, slack_webhook_url: null, tz_offset_hours: 0,
  }
  const [rules, setRules] = useState<TradingRules>(initial ?? defaults)
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  function set(k: keyof TradingRules, v: string) { setRules(p => ({ ...p, [k]: v })); setSave('idle') }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSave('saving')
    const res = await fetch('/api/rules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rules) })
    setSave(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setSave('idle'), 3000)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,.05)', border: `.5px solid ${C.b2}`, borderRadius: 6,
    padding: '7px 11px', fontSize: 13, fontFamily: MONO, color: C.tx, width: 80,
    textAlign: 'right', outline: 'none', transition: 'border-color .2s',
  }

  function RuleGroup({ title, desc, accent, children }: { title: string; desc: string; accent: string; children: React.ReactNode }) {
    return (
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: 22, position: 'relative', overflow: 'hidden' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.tx, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 18 }}>{desc}</div>
        {children}
      </div>
    )
  }

  function RuleField({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
        <span style={{ fontSize: 12.5, color: C.tm }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {children}
          {unit && <span style={{ fontSize: 11, color: C.te, fontFamily: MONO, width: 26 }}>{unit}</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '26px 28px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.3, color: C.tx, marginBottom: 5 }}>Règles de session</div>
        <div style={{ fontSize: 12.5, color: C.td }}>Ces seuils définissent quand Caldra déclenche une alerte. Modifiables à tout moment.</div>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <RuleGroup title="Risk management" desc="Niveau 2 si seuil dépassé" accent="rgba(124,58,237,.5)">
            <RuleField label="Taille du compte" unit="€">
              <input style={{ ...inputStyle, width: 100 }} type="number" min={100} max={10000000} step={100} value={rules.account_size ?? 10000} onChange={e => set('account_size', e.target.value)} />
            </RuleField>
            <RuleField label="Drawdown max journalier" unit="%">
              <input style={inputStyle} type="number" min={0.1} max={20} step={0.1} value={rules.max_daily_drawdown_pct} onChange={e => set('max_daily_drawdown_pct', e.target.value)} />
            </RuleField>
            <RuleField label="Risk max par trade" unit="%">
              <input style={inputStyle} type="number" min={0.1} max={10} step={0.1} value={rules.max_risk_per_trade_pct} onChange={e => set('max_risk_per_trade_pct', e.target.value)} />
            </RuleField>
          </RuleGroup>

          <RuleGroup title="Discipline comportementale" desc="Niveau 1 si 80% approché · Niveau 2 si dépassé" accent="rgba(255,171,0,.45)">
            <RuleField label="Max trades par session">
              <input style={inputStyle} type="number" min={1} max={100} step={1} value={rules.max_trades_per_session} onChange={e => set('max_trades_per_session', e.target.value)} />
            </RuleField>
            <RuleField label="Pertes consécutives max">
              <input style={inputStyle} type="number" min={1} max={20} step={1} value={rules.max_consecutive_losses} onChange={e => set('max_consecutive_losses', e.target.value)} />
            </RuleField>
            <RuleField label="Délai min entre trades" unit="sec">
              <input style={inputStyle} type="number" min={0} max={3600} step={10} value={rules.min_time_between_entries_sec} onChange={e => set('min_time_between_entries_sec', e.target.value)} />
            </RuleField>
          </RuleGroup>
        </div>

        <div style={{ maxWidth: 460 }}>
          <RuleGroup title="Fenêtre de session" desc="Niveau 1 si trade hors fenêtre" accent="rgba(0,209,122,.4)">
            <div style={{ display: 'flex', gap: 20 }}>
              <RuleField label="Début">
                <input style={{ ...inputStyle, width: 88, textAlign: 'center' }} type="time" value={rules.session_start} onChange={e => set('session_start', e.target.value)} />
              </RuleField>
              <RuleField label="Fin">
                <input style={{ ...inputStyle, width: 88, textAlign: 'center' }} type="time" value={rules.session_end} onChange={e => set('session_end', e.target.value)} />
              </RuleField>
            </div>
            <RuleField label="Fuseau horaire (UTC+)">
              <select
                style={{ ...inputStyle, width: 88, textAlign: 'center', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundColor: 'rgba(255,255,255,.05)', color: C.tx }}
                value={rules.tz_offset_hours ?? 0}
                onChange={e => set('tz_offset_hours', e.target.value)}
              >
                {[-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                  <option key={h} value={h} style={{ background: '#12121c', color: '#eae8f5' }}>{h >= 0 ? `+${h}` : h}</option>
                ))}
              </select>
            </RuleField>
          </RuleGroup>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="submit" disabled={save === 'saving'} style={{
            padding: '12px 28px', background: C.red, border: 'none', borderRadius: 7, color: '#fff',
            fontSize: 13, fontFamily: SANS, cursor: save === 'saving' ? 'not-allowed' : 'pointer',
            fontWeight: 500, transition: 'opacity .2s', opacity: save === 'saving' ? .6 : 1,
          }}>
            {save === 'saving' ? 'Enregistrement…' : 'Sauvegarder les règles'}
          </button>
          {save === 'saved' && <span style={{ color: C.g, fontSize: 11, fontFamily: MONO }}>✓ Mis à jour</span>}
          {save === 'error' && <span style={{ color: C.red, fontSize: 11, fontFamily: MONO }}>Erreur — réessayez</span>}
        </div>
      </form>
    </div>
  )
}

// ── SentinelPanel ──────────────────────────────────────────────────────────────
interface ChatMsg { role: 'user' | 'assistant'; content: string; time: string; isDebrief?: boolean }
interface CoachingCard { id: string; alertType: string; alertLevel: number; alertMessage: string; coaching: string; time: string }

function renderDebriefText(text: string, C: Palette) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 5 }} />
    const parts = line.split(/\*\*(.*?)\*\*/g)
    return (
      <div key={i} style={{ fontSize: 12, color: C.tm, lineHeight: 1.6, fontWeight: 300, marginBottom: 1 }}>
        {parts.map((part, j) => j % 2 === 1
          ? <span key={j} style={{ fontWeight: 600, color: C.tx }}>{part}</span>
          : part
        )}
      </div>
    )
  })
}

function SentinelPanel({ stats, alerts, score, rules, plan, coachingCards }: {
  stats: SessionStats; alerts: AlertRow[]; score: number; rules: TradingRules | null
  plan: string; coachingCards: CoachingCard[]
}) {
  const C = useContext(ThemeCtx)
  const isSentinel = plan === 'sentinel'

  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: `Bonjour. Session ouverte. Score comportemental actuel : ${score}/100. ${alerts.length === 0 ? 'Aucune alerte — continuez comme ça.' : `${alerts.length} alerte(s) active(s) — je surveille.`}`,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }])

  // Session end timer pour le debrief proactif
  const [sessionEnded, setSessionEnded] = useState(false)
  const [debriefLoading, setDebriefLoading] = useState(false)
  const [debriefDone, setDebriefDone] = useState(false)

  useEffect(() => {
    if (!rules?.session_end || !isSentinel || stats.total_trades === 0) return
    const [h, m] = rules.session_end.split(':').map(Number)
    function check() {
      const now = new Date()
      const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0)
      if (now >= endTime && !debriefDone) setSessionEnded(true)
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [rules, isSentinel, stats.total_trades, debriefDone])

  async function triggerDebrief() {
    setDebriefLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/debrief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      })
      const data = await res.json()
      if (data.debrief) {
        const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        setMsgs(prev => [...prev, { role: 'assistant', content: data.debrief, time, isDebrief: true }])
        setDebriefDone(true)
        setSessionEnded(false)
      } else {
        setMsgs(prev => [...prev, { role: 'assistant', content: data.error ?? 'Erreur lors du debrief.', time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }])
      }
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Erreur réseau lors du debrief.', time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }])
    } finally {
      setDebriefLoading(false)
    }
  }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)

  async function send() {
    const txt = input.trim(); if (!txt || loading) return
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMsg = { role: 'user', content: txt, time: now }
    setMsgs(prev => [...prev, userMsg]); setInput(''); setLoading(true)

    try {
      const res = await fetch('/api/sentinel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...msgs, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: { score, pnl: stats.total_pnl, totalTrades: stats.total_trades, alertCount: alerts.length, alertTypes: [...new Set(alerts.map(a => a.type ?? '').filter(Boolean))], rules },
        }),
      })
      const data = await res.json()
      const reply = data.content || data.error || 'Erreur de connexion.'
      setMsgs(prev => [...prev, { role: 'assistant', content: reply, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }])
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Erreur réseau — réessayez.', time: now }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs])

  const alertsByType = alerts.reduce<Record<string, number>>((acc, a) => {
    const t = a.type ?? ''; if (t) acc[t] = (acc[t] ?? 0) + 1; return acc
  }, {})
  const dominant = Object.entries(alertsByType).sort((a, b) => b[1] - a[1])[0]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', flex: 1, height: '100%', minHeight: 0 }}>
      <div style={{ padding: 26, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ flex: 1, background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 400 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: 'linear-gradient(90deg,transparent,rgba(124,58,237,.3),transparent)' }} />
          <div style={{ paddingBottom: 14, borderBottom: `.5px solid ${C.b}`, marginBottom: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: C.tx, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 9 }}>
              Sentinel
              <span style={{ fontSize: 9, padding: '3px 9px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 99, color: C.red, letterSpacing: .5 }}>IA Active</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.td }}>Analyse en temps réel · Répond à tes questions · Debriefing automatique</div>
          </div>

          <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 16, minHeight: 0 }}>
            {msgs.map((m, i) => m.role === 'assistant' ? (
              <div key={i} style={{
                background: m.isDebrief ? 'rgba(124,58,237,.07)' : C.sf2,
                border: `.5px solid ${m.isDebrief ? C.rb : C.b}`,
                borderLeft: m.isDebrief ? `3px solid ${C.red}` : undefined,
                borderRadius: '10px 10px 10px 2px', padding: '12px 14px', maxWidth: '90%',
              }}>
                {m.isDebrief && (
                  <div style={{ fontSize: 8.5, color: C.red, letterSpacing: 1.8, fontFamily: MONO, textTransform: 'uppercase' as const, marginBottom: 8 }}>Debrief Sentinel</div>
                )}
                {m.isDebrief
                  ? renderDebriefText(m.content, C)
                  : <div style={{ fontSize: 12.5, color: C.tm, lineHeight: 1.55, fontWeight: 300 }}>{m.content}</div>
                }
                <div style={{ fontSize: 10, color: C.te, fontFamily: MONO, marginTop: 5 }}>{m.time}</div>
              </div>
            ) : (
              <div key={i} style={{ background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: '10px 10px 2px 10px', padding: '12px 14px', maxWidth: '85%', alignSelf: 'flex-end' }}>
                <div style={{ fontSize: 12.5, color: 'rgba(230,227,240,.95)', lineHeight: 1.55 }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: '10px 10px 10px 2px', padding: '12px 14px', maxWidth: '85%' }}>
                <div style={{ fontSize: 12.5, color: C.te, fontStyle: 'italic' }}>Sentinel analyse…</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 9, paddingTop: 11, borderTop: `.5px solid ${C.b}` }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Pose une question à Sentinel..."
              style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: `.5px solid ${C.b2}`, borderRadius: 7, padding: '10px 14px', color: C.tm, fontSize: 13, fontFamily: SANS, outline: 'none', transition: 'border-color .2s' }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              padding: '10px 18px', background: C.red, border: 'none', borderRadius: 7, color: '#fff',
              fontSize: 12, fontFamily: SANS, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500,
              opacity: loading || !input.trim() ? .5 : 1, transition: 'opacity .2s', whiteSpace: 'nowrap' as const,
            }}>Envoyer</button>
          </div>
        </div>
      </div>

      {/* Sentinel sidebar */}
      <div style={{ borderLeft: `.5px solid ${C.b}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', background: C.sf }}>
        <div style={{ padding: '14px 0', borderBottom: `.5px solid ${C.b}` }}>
          <div style={{ fontSize: 10, letterSpacing: .3, color: C.te, marginBottom: 10 }}>Insights de session</div>
          {score >= 70 && (
            <div style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: 8, padding: 12, marginBottom: 9, borderLeft: `3px solid ${C.g}` }}>
              <div style={{ fontSize: 10, fontFamily: MONO, marginBottom: 5, letterSpacing: .3, color: C.g }}>✓ Point fort</div>
              <div style={{ fontSize: 11.5, color: C.tm, lineHeight: 1.5, fontWeight: 300 }}>Score solide — comportement discipliné depuis le début de session.</div>
            </div>
          )}
          {dominant ? (
            <div style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${C.o}` }}>
              <div style={{ fontSize: 10, fontFamily: MONO, marginBottom: 5, letterSpacing: .3, color: C.o }}>⚠ À surveiller</div>
              <div style={{ fontSize: 11.5, color: C.tm, lineHeight: 1.5, fontWeight: 300 }}>Pattern dominant : {dominant[0].replace(/_/g, ' ')} ({dominant[1]}×). Reste vigilant.</div>
            </div>
          ) : score >= 70 ? (
            <div style={{ fontSize: 12, color: C.te, fontStyle: 'italic', fontWeight: 300 }}>Aucun pattern problématique détecté.</div>
          ) : null}
        </div>

        {/* Coaching automatique — cartes générées sur L2+ */}
        {isSentinel && coachingCards.length > 0 && (
          <div style={{ padding: '14px 0', borderBottom: `.5px solid ${C.b}` }}>
            <div style={{ fontSize: 10, letterSpacing: .3, color: C.te, marginBottom: 10 }}>Coaching automatique</div>
            {coachingCards.slice(0, 3).map(card => {
              const lvlCol = card.alertLevel >= 3 ? '#dc3218' : C.o
              return (
                <div key={card.id} style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: 8, padding: 11, marginBottom: 8, borderLeft: `3px solid ${lvlCol}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 9, fontFamily: MONO, color: lvlCol, letterSpacing: .5 }}>
                      L{card.alertLevel} · {card.alertType.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span style={{ fontSize: 9, color: C.te, fontFamily: MONO }}>{card.time}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.tm, lineHeight: 1.55, fontWeight: 300 }}>{card.coaching}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Debrief proactif — fin de session */}
        {isSentinel && (sessionEnded || debriefDone) && (
          <div style={{ padding: '14px 0', borderBottom: `.5px solid ${C.b}` }}>
            <div style={{ fontSize: 10, letterSpacing: .3, color: C.te, marginBottom: 10 }}>Debrief de session</div>
            {debriefDone ? (
              <div style={{ fontSize: 11.5, color: C.g, fontWeight: 400 }}>✓ Debrief généré — voir le chat</div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: C.td, marginBottom: 9 }}>
                  Session terminée — analyse comportementale disponible.
                </div>
                <button
                  onClick={triggerDebrief}
                  disabled={debriefLoading}
                  style={{
                    width: '100%', padding: '9px 14px', background: C.rd, border: `.5px solid ${C.rb}`,
                    borderRadius: 8, color: C.red, fontSize: 12, fontFamily: SANS, cursor: debriefLoading ? 'default' : 'pointer',
                    fontWeight: 500, transition: 'all .2s', opacity: debriefLoading ? .6 : 1, textAlign: 'center' as const,
                  }}
                >
                  {debriefLoading ? 'Analyse en cours…' : 'Générer le debrief Sentinel'}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '16px 0', borderBottom: `.5px solid ${C.b}` }}>
          <div style={{ fontSize: 10, letterSpacing: .3, color: C.te, marginBottom: 10 }}>Session actuelle</div>
          {[
            { k: 'Score', v: `${score} / 100`, c: scoreColor(score, C) },
            { k: 'P&L', v: fmtEur(stats.total_pnl), c: '#e2e8f0' },
            { k: 'Trades', v: String(stats.total_trades), c: C.tm },
            { k: 'Alertes', v: String(alerts.length), c: alerts.length > 0 ? C.red : C.td },
          ].map(({ k, v, c }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
              <span style={{ fontSize: 12, color: C.td }}>{k}</span>
              <span style={{ fontSize: 12.5, fontFamily: MONO, color: c, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {rules && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 10, letterSpacing: .3, color: C.te, marginBottom: 10 }}>Règles actives</div>
            {[
              { k: 'Drawdown max', v: `${rules.max_daily_drawdown_pct}%` },
              { k: 'Max trades', v: String(rules.max_trades_per_session) },
              { k: 'Fenêtre', v: `${rules.session_start}–${rules.session_end}` },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                <span style={{ fontSize: 12, color: C.td }}>{k}</span>
                <span style={{ fontSize: 12.5, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toast notification system ──────────────────────────────────────────────────
interface ToastItem { id: string; alert: AlertRow; exiting: boolean }

const LVL_TOAST: Record<number, { label: string; color: string; bg: string; border: string; dot: string }> = {
  1: { label: 'L1', color: 'rgba(245,166,35,.85)', bg: 'rgba(245,166,35,.07)', border: 'rgba(245,166,35,.22)', dot: '#f5a623' },
  2: { label: 'L2', color: 'rgba(220,130,0,.9)',   bg: 'rgba(220,130,0,.08)',  border: 'rgba(220,130,0,.28)',  dot: '#dc8200' },
  3: { label: 'L3', color: 'rgba(220,50,24,.95)',  bg: 'rgba(220,50,24,.1)',   border: 'rgba(220,50,24,.4)',   dot: '#dc3218' },
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const level = toast.alert.level ?? toast.alert.severity ?? 1
  const cfg = LVL_TOAST[level] ?? LVL_TOAST[1]
  const type = (toast.alert.type ?? (toast.alert as any).pattern ?? '').replace(/_/g, ' ').toUpperCase()
  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{
        width: 310,
        background: '#0c0c18',
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 12px 40px rgba(0,0,0,.6), 0 0 0 .5px rgba(255,255,255,.03)`,
        padding: '13px 15px 13px 18px',
        cursor: 'pointer',
        pointerEvents: 'auto' as const,
        position: 'relative' as const,
        animation: toast.exiting
          ? 'toastOut .28s cubic-bezier(.4,0,1,1) forwards'
          : 'toastIn .38s cubic-bezier(.16,1,.3,1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: cfg.dot }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <div style={{ width: 5, height: 5, background: cfg.dot, flexShrink: 0 }} />
        <span style={{
          color: cfg.color, fontSize: 9, fontWeight: 600, letterSpacing: '.18em',
          fontFamily: MONO, background: cfg.bg, border: `1px solid ${cfg.border}`,
          padding: '1px 5px',
        }}>{cfg.label}</span>
        <span style={{
          color: 'rgba(216,213,232,.32)', fontSize: 8.5, fontFamily: MONO,
          letterSpacing: '.06em', flex: 1, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
        }}>{type}</span>
        <span style={{ color: 'rgba(216,213,232,.2)', fontSize: 11 }}>✕</span>
      </div>
      <p style={{ margin: 0, color: 'rgba(216,213,232,.72)', fontSize: 11.5, lineHeight: 1.55, fontFamily: MONO }}>{toast.alert.message}</p>
    </div>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  )
}

// ── BillingPanel ───────────────────────────────────────────────────────────────
function BillingPanel({ plan: initialPlan }: { plan: string }) {
  const C = useContext(ThemeCtx)
  const [plan]   = useState(initialPlan)
  const [loading, setLoading] = useState<string | null>(null)

  async function checkout(planKey: string) {
    setLoading(planKey)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const d = await res.json()
      if (d.url) window.location.href = d.url
    } finally { setLoading(null) }
  }

  async function portal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const d = await res.json()
      if (d.url) window.location.href = d.url
    } finally { setLoading(null) }
  }

  const isPaid = plan === 'pro' || plan === 'sentinel'

  const plans = [
    {
      id: 'pro', name: 'Pro', price: '19€',
      accent: C.g, accentAlpha: 'rgba(0,209,122,',
      features: ['Trades illimités', 'Analytics avancées', 'Calendrier des sessions', 'Rapports exportables'],
    },
    {
      id: 'sentinel', name: 'Sentinel', price: '39€',
      accent: C.red, accentAlpha: `rgba(124,58,237,`,
      features: ['Tout Pro inclus', 'Débrief IA après chaque session', 'Analyse comportementale profonde', 'Coaching Anthropic personnalisé', 'Accès prioritaire aux nouvelles features'],
    },
  ]

  return (
    <div style={{ padding: 26, overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: C.red, textTransform: 'uppercase' as const, marginBottom: 6 }}>Abonnement</div>
        <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: -.3, marginBottom: 4 }}>Billing</div>
        <div style={{ fontSize: 12.5, color: C.td }}>
          Plan actuel : <span style={{ color: C.tm, fontWeight: 500, textTransform: 'capitalize' }}>{plan}</span>
          {isPaid && (
            <button onClick={portal} disabled={loading === 'portal'} style={{ marginLeft: 14, padding: '4px 12px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 6, color: C.td, fontSize: 10, fontFamily: SANS, cursor: 'pointer', letterSpacing: .5 }}>
              {loading === 'portal' ? 'Chargement…' : 'Gérer l\'abonnement →'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 780 }}>
        {plans.map(p => {
          const isCurrent = plan === p.id
          return (
            <div key={p.id} style={{ background: C.sf, border: `.5px solid ${isCurrent ? p.accent : C.b}`, borderRadius: 12, padding: 24, position: 'relative', overflow: 'hidden' }}>
              {isCurrent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${p.accent},transparent)` }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: C.tx, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 200, letterSpacing: -1, color: isCurrent ? p.accent : C.tx, lineHeight: 1 }}>
                    {p.price}<span style={{ fontSize: 13, color: C.td, fontWeight: 300 }}>/mois</span>
                  </div>
                </div>
                {isCurrent && (
                  <span style={{ padding: '4px 10px', background: `${p.accentAlpha}.08)`, border: `.5px solid ${p.accentAlpha}.25)`, borderRadius: 99, fontSize: 9, color: p.accent, letterSpacing: 1.5 }}>ACTIF</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: C.td }}>
                    <span style={{ color: p.accent, flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              {!isCurrent && (
                <button
                  onClick={() => checkout(p.id)}
                  disabled={loading === p.id}
                  style={{ width: '100%', padding: 11, background: p.accent, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: loading === p.id ? 'not-allowed' : 'pointer', fontFamily: SANS, opacity: loading === p.id ? .7 : 1, letterSpacing: .3, transition: 'opacity .2s' }}
                >
                  {loading === p.id ? 'Redirection…' : `Passer à ${p.name} →`}
                </button>
              )}
              {isCurrent && isPaid && (
                <div style={{ fontSize: 11, color: C.te, textAlign: 'center' as const, marginTop: 4 }}>Abonnement actif · Gérez-le via le bouton ci-dessus</div>
              )}
            </div>
          )
        })}
      </div>

      {plan === 'free' && (
        <div style={{ marginTop: 14, padding: '11px 16px', background: 'rgba(255,255,255,.02)', border: `.5px solid ${C.b}`, borderRadius: 8, fontSize: 12, color: C.te, maxWidth: 780 }}>
          14 jours d'essai gratuit inclus sur Pro et Sentinel — aucune carte requise pour commencer.
        </div>
      )}
    </div>
  )
}

// ── ProfilPanel ─────────────────────────────────────────────────────────────────
function ProfilPanel({ userEmail, userMeta }: { userEmail: string; userMeta: { first_name?: string; last_name?: string; phone?: string } }) {
  const C = useContext(ThemeCtx)
  const [firstName, setFirstName] = useState(userMeta.first_name ?? '')
  const [lastName,  setLastName]  = useState(userMeta.last_name  ?? '')
  const [phone,     setPhone]     = useState(userMeta.phone      ?? '')
  const [save,      setSave]      = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [pwSave,    setPwSave]    = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [emailSave, setEmailSave] = useState<'idle'|'saving'|'sent'|'error'>('idle')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [email,     setEmail]     = useState(userEmail)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,  setDeleting]  = useState(false)

  async function saveProfile() {
    setSave('saving')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().auth.updateUser({
        data: { first_name: firstName, last_name: lastName, phone, full_name: `${firstName} ${lastName}`.trim() },
      })
      setSave(error ? 'error' : 'saved')
      if (!error) setTimeout(() => setSave('idle'), 2500)
    } catch { setSave('error') }
  }

  async function changePassword() {
    if (newPw.length < 8 || newPw !== confirmPw) return
    setPwSave('saving')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().auth.updateUser({ password: newPw })
      setPwSave(error ? 'error' : 'saved')
      if (!error) { setNewPw(''); setConfirmPw(''); setTimeout(() => setPwSave('idle'), 2500) }
    } catch { setPwSave('error') }
  }

  async function changeEmail() {
    if (!email || email === userEmail) return
    setEmailSave('saving')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().auth.updateUser({ email })
      setEmailSave(error ? 'error' : 'sent')
      if (!error) setTimeout(() => setEmailSave('idle'), 4000)
    } catch { setEmailSave('error') }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (res.ok) {
        const { createClient } = await import('@/lib/supabase/client')
        await createClient().auth.signOut()
        window.location.href = '/login'
      } else setDeleting(false)
    } catch { setDeleting(false) }
  }

  async function logout() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const inp: React.CSSProperties = {
    width: '100%', background: C.bg, border: `.5px solid ${C.b2}`,
    borderRadius: 8, padding: '11px 14px', color: C.tx, fontSize: 13,
    fontFamily: SANS, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color .2s',
  }

  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 22, marginBottom: 14 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.te, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div style={{ padding: 26, overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: 24, maxWidth: 520 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: C.red, textTransform: 'uppercase' as const, marginBottom: 6 }}>Compte</div>
        <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: -.3 }}>Profil</div>
      </div>

      <div style={{ maxWidth: 520 }}>
        <Sec title="Informations personnelles">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.te, marginBottom: 5 }}>PRÉNOM</div>
                <input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" />
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.te, marginBottom: 5 }}>NOM</div>
                <input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.te, marginBottom: 5 }}>EMAIL</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" type="email" />
                <button onClick={changeEmail} disabled={emailSave === 'saving' || email === userEmail} style={{ padding: '0 14px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 7, color: C.td, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' as const, opacity: email === userEmail ? .3 : 1 }}>
                  {emailSave === 'saving' ? '…' : 'Changer'}
                </button>
              </div>
              {emailSave === 'sent'  && <div style={{ fontSize: 11, color: C.g, marginTop: 5, fontFamily: MONO }}>✓ Lien de confirmation envoyé</div>}
              {emailSave === 'error' && <div style={{ fontSize: 11, color: C.red, marginTop: 5 }}>Erreur — réessaie</div>}
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.te, marginBottom: 5 }}>TÉLÉPHONE</div>
              <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 00 00 00 00" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={saveProfile} disabled={save === 'saving'} style={{ padding: '9px 20px', background: C.red, border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: .5, opacity: save === 'saving' ? .6 : 1 }}>
                {save === 'saving' ? 'Enregistrement…' : 'Sauvegarder'}
              </button>
              {save === 'saved' && <span style={{ fontSize: 11, color: C.g, fontFamily: MONO }}>✓ Sauvegardé</span>}
              {save === 'error'  && <span style={{ fontSize: 11, color: C.red, fontFamily: MONO }}>Erreur</span>}
            </div>
          </div>
        </Sec>

        <Sec title="Mot de passe">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="password" style={inp} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nouveau mot de passe (8 min)" autoComplete="new-password" />
            <input type="password" style={{ ...inp, borderColor: confirmPw && confirmPw !== newPw ? 'rgba(224,80,80,.4)' : undefined }} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirmer" autoComplete="new-password" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={changePassword} disabled={pwSave === 'saving' || newPw.length < 8 || newPw !== confirmPw} style={{ padding: '9px 20px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 7, color: C.td, fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: .5, opacity: (newPw.length < 8 || newPw !== confirmPw) ? .35 : 1 }}>
                {pwSave === 'saving' ? 'Mise à jour…' : 'Changer le mot de passe'}
              </button>
              {pwSave === 'saved' && <span style={{ fontSize: 11, color: C.g, fontFamily: MONO }}>✓ Mis à jour</span>}
              {pwSave === 'error'  && <span style={{ fontSize: 11, color: C.red, fontFamily: MONO }}>Erreur</span>}
            </div>
          </div>
        </Sec>

        <div style={{ background: C.sf, border: '.5px solid rgba(224,80,80,.18)', borderLeft: '3px solid rgba(224,80,80,.4)', borderRadius: 12, padding: 22, marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' as const, color: 'rgba(224,80,80,.5)', marginBottom: 14 }}>Zone dangereuse</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={{ ...inp, maxWidth: 200, borderColor: deleteConfirm === 'SUPPRIMER' ? 'rgba(224,80,80,.4)' : undefined }}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder='Tape "SUPPRIMER"'
            />
            <button
              onClick={deleteAccount}
              disabled={deleteConfirm !== 'SUPPRIMER' || deleting}
              style={{ padding: '9px 18px', background: deleteConfirm === 'SUPPRIMER' ? 'rgba(224,80,80,.12)' : 'transparent', border: '.5px solid rgba(224,80,80,.25)', borderRadius: 7, color: 'rgba(224,80,80,.7)', fontSize: 11, fontFamily: SANS, cursor: deleteConfirm === 'SUPPRIMER' ? 'pointer' : 'not-allowed', opacity: deleteConfirm !== 'SUPPRIMER' ? .35 : 1, whiteSpace: 'nowrap' as const }}
            >
              {deleting ? 'Suppression…' : 'Supprimer mon compte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
const TABS: Array<{ id: string; label: string; sentinel?: boolean }> = [
  { id: 'session',     label: 'Session live' },
  { id: 'calendrier', label: 'Calendrier' },
  { id: 'analytics',  label: 'Analytics' },
  { id: 'rapports',   label: 'Rapports' },
  { id: 'sentinel',   label: 'Sentinel IA', sentinel: true },
]

const SETTINGS_ITEMS = [
  { id: 'profil',        label: 'Profil' },
  { id: 'regles',        label: 'Règles' },
  { id: 'integrations',  label: 'Intégrations' },
  { id: 'billing',       label: 'Billing' },
]

type TabId = 'session' | 'calendrier' | 'analytics' | 'rapports' | 'integrations' | 'regles' | 'billing' | 'profil' | 'sentinel'

export default function DashboardClient({
  userId, userEmail, initialScore, initialAlerts, initialTrades, initialStats,
  yesterdayStats, tradingRules, apiKeyPrefix, historicalSessions, plan, userMeta,
}: DashboardClientProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('caldra-theme') as 'dark' | 'light') ?? 'dark' : 'dark'
  )
  const C = theme === 'dark' ? C_DARK : C_LIGHT
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('caldra-theme', next)
  }

  const [activeTab, setActiveTab] = useState<TabId>('session')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts)
  const [trades, setTrades] = useState<TradeRow[]>(initialTrades)
  const [stats, setStats] = useState<SessionStats>(initialStats)
  const [connected, setConnected] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [notifPerm, setNotifPerm] = useState<string>('default')
  const [paused, setPaused] = useState(false)
  const [sentinelPrompt, setSentinelPrompt] = useState<AlertRow | null>(null)
  const [coachingCards, setCoachingCards] = useState<CoachingCard[]>([])

  // Redirection automatique vers /mobile sur petit écran
  useEffect(() => {
    if (window.innerWidth < 768) window.location.replace('/mobile')
  }, [])
  const pausedRef = useRef(false)
  const notifDelay = useRef(0)
  const notifReset = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<any>(null)
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const statsRef = useRef(stats)
  const alertsRef = useRef(alerts)
  useEffect(() => { statsRef.current = stats }, [stats])
  useEffect(() => { alertsRef.current = alerts }, [alerts])

  const initials = userMeta.first_name
    ? `${userMeta.first_name[0]}${userMeta.last_name?.[0] ?? ''}`.toUpperCase()
    : userEmail.slice(0, 2).toUpperCase()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard shortcuts: Alt+1…5 for main tabs
  useEffect(() => {
    const map: Record<string, TabId> = {
      '1': 'session', '2': 'calendrier', '3': 'analytics', '4': 'rapports', '5': 'sentinel'
    }
    function onKey(e: KeyboardEvent) {
      if (e.altKey && map[e.key]) { e.preventDefault(); setActiveTab(map[e.key]); setSettingsOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const togglePause = useCallback(() => {
    setPaused(p => { pausedRef.current = !p; return !p })
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      const timer = toastTimers.current.get(id)
      if (timer) { clearTimeout(timer); toastTimers.current.delete(id) }
    }, 320)
  }, [])

  const addToast = useCallback((alert: AlertRow) => {
    if (pausedRef.current) return
    const id = `t-${Date.now()}`
    setToasts(prev => [{ id, alert, exiting: false }, ...prev].slice(0, 4))
    const timer = setTimeout(() => dismissToast(id), 5000)
    toastTimers.current.set(id, timer)
  }, [dismissToast])

  const fetchAlertCoaching = useCallback(async (alert: AlertRow) => {
    if (plan !== 'sentinel') return
    const currentAlerts = alertsRef.current
    const currentStats = statsRef.current
    const currentScore = computeScore(currentAlerts)
    const recentTypes = [...new Set(currentAlerts.slice(0, 10).map((a: AlertRow) => a.type ?? '').filter(Boolean))]
    const typeFmt = (alert.type ?? '').replace(/_/g, ' ')
    const prompt = `L${alert.level} ${typeFmt} : "${alert.message}". Que faire maintenant ?`
    try {
      const res = await fetch('/api/sentinel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          context: { score: currentScore, pnl: currentStats.total_pnl, totalTrades: currentStats.total_trades, alertCount: currentAlerts.length, alertTypes: recentTypes, rules: tradingRules },
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.content) {
        setCoachingCards(prev => [{
          id: `c-${Date.now()}`,
          alertType: alert.type ?? '',
          alertLevel: alert.level ?? 2,
          alertMessage: alert.message,
          coaching: data.content,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 5))
      }
    } catch {}
  }, [plan, tradingRules])

  const score = computeScore(alerts)

  const _yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const _dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
  const _ySess = historicalSessions.find(s => s.date === _yesterday)
  const _dbSess = historicalSessions.find(s => s.date === _dayBefore)
  const yesterdayTrend: number | null = (_ySess && _dbSess) ? _ySess.score - _dbSess.score : null

  useEffect(() => {
    const supabase = createClient()
    channelRef.current = supabase
      .channel('caldra-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${userId}` }, (payload) => {
        if (pausedRef.current) return
        const a = payload.new as AlertRow & { session_date?: string; user_id?: string }
        if (a.session_date && a.session_date !== today) return
        setAlerts(prev => [a, ...prev])
        addToast(a)
        if ((a.level ?? 1) >= 3) setSentinelPrompt(a)
        if ((a.level ?? 1) >= 2) fetchAlertCoaching(a)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades', filter: `user_id=eq.${userId}` }, (payload) => {
        if (pausedRef.current) return
        const t = payload.new as TradeRow & { user_id?: string }
        setTrades(prev => [t, ...prev])
        setStats(prev => ({
          total_trades: prev.total_trades + 1,
          total_pnl: prev.total_pnl + (t.pnl ?? 0),
          wins: prev.wins + ((t.pnl ?? 0) > 0 ? 1 : 0),
          losses: prev.losses + ((t.pnl ?? 0) < 0 ? 1 : 0),
        }))
      })
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))
    return () => { channelRef.current?.unsubscribe() }
  }, [userId, today, addToast, fetchAlertCoaching])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(async () => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (vapidKey) {
            try {
              const reg = await navigator.serviceWorker.ready
              let sub = await reg.pushManager.getSubscription()
              if (!sub) {
                const padding = '='.repeat((4 - vapidKey.length % 4) % 4)
                const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
                const raw = window.atob(b64)
                const bytes = new Uint8Array(raw.length)
                for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
                sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes.buffer })
              }
              if (sub) {
                const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
                await fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
                })
              }
            } catch {}
          }
        }
      }).catch(() => {})
    }
    if (typeof Notification !== 'undefined') {
      setNotifPerm(Notification.permission)
    }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
  }, [])

  const pollFreshData = useCallback(async () => {
    const supabase = createClient()
    const [aRes, tRes] = await Promise.all([
      supabase.from('alerts').select('*').eq('user_id', userId).eq('session_date', today).order('created_at', { ascending: false }),
      supabase.from('trades').select('*').eq('user_id', userId).gte('entry_time', `${today}T00:00:00`).order('entry_time', { ascending: false }),
    ])
    if (aRes.data) setAlerts(aRes.data)
    if (tRes.data) {
      const visible = tRes.data
      setTrades(visible)
      const pnl = visible.reduce((s: number, t: TradeRow) => s + (t.pnl ?? 0), 0)
      const wins = visible.filter((t: TradeRow) => (t.pnl ?? 0) > 0).length
      setStats({ total_trades: visible.length, total_pnl: pnl, wins, losses: visible.length - wins })
    }
  }, [userId, today])

  useEffect(() => {
    const id = setInterval(pollFreshData, 30000)
    const onVisible = () => { if (document.visibilityState === 'visible') pollFreshData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [pollFreshData])

  function showPushNotif(title: string, body: string, tag: string) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    notifDelay.current += 600
    const delay = notifDelay.current
    if (notifReset.current) clearTimeout(notifReset.current)
    notifReset.current = setTimeout(() => { notifDelay.current = 0 }, delay + 1500)
    setTimeout(() => {
      try { new Notification(title, { body, icon: '/icon-192.png', tag }) } catch {}
    }, delay)
  }

  async function requestNotifPermission() {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if (perm !== 'granted') return

    // Subscribe to web push so the server can deliver alerts to this device
    try {
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (vapidKey) {
          const padding = '='.repeat((4 - vapidKey.length % 4) % 4)
          const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
          const raw = window.atob(b64)
          const bytes = new Uint8Array(raw.length)
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes.buffer })
        }
      }
      if (sub) {
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
        })
      }
    } catch {}

    showPushNotif('Caldra — Notifications activées ✓', 'Vous recevrez les alertes comportementales en temps réel.', 'caldra-welcome')
  }

  async function triggerInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') setInstallPrompt(null)
  }

  const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']
  const _now = new Date()
  const displayDate = `${_now.toLocaleDateString('fr-FR', { weekday: 'short' })} ${_now.getDate()} ${MONTHS_FR[_now.getMonth()]} ${_now.getFullYear()}`

  return (
    <ThemeCtx.Provider value={C}>
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;text-decoration:none}
        a{text-decoration:none!important}
        html,body{height:100%;background:${C.bg}}
        ::-webkit-scrollbar{width:0;height:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.15}}
        @keyframes sli{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
        @keyframes toastIn{from{opacity:0;transform:translateX(28px) scale(.97)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes toastOut{from{opacity:1;transform:translateX(0) scale(1)}to{opacity:0;transform:translateX(28px) scale(.97)}}
        @keyframes shimmerLine{0%{opacity:.4}50%{opacity:.85}100%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .tab-btn{padding:11px 0;font-size:11px;letter-spacing:.5px;color:${C.td};cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;font-family:${SANS};background:none;border-top:none;border-left:none;border-right:none;white-space:nowrap;flex:1;text-align:center;font-weight:400}
        .tab-btn:hover{color:${C.tm};background:rgba(255,255,255,.02)}
        .tab-btn.active{color:${C.tx};border-bottom-color:${C.red};font-weight:500}
        .tab-sentinel{color:rgba(124,58,237,.45)!important}
        .tab-sentinel.active{color:${C.red}!important;border-bottom-color:${C.red}}
        textarea,input{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        input[type=time]::-webkit-calendar-picker-indicator{filter:invert(.3)}
        .c-card{transition:border-color .18s,box-shadow .18s}
        .c-card:hover{border-color:${C.b3}!important;box-shadow:0 2px 18px rgba(0,0,0,.18)}
        .c-row:hover{background:rgba(255,255,255,.025)!important}
      `}</style>


      {sentinelPrompt && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: '#12121c', border: '1px solid rgba(255,90,61,.45)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 40px rgba(255,90,61,.18)', maxWidth: 520, width: 'calc(100vw - 48px)', fontFamily: SANS, animation: 'fadeUp .3s ease' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5a3d', flexShrink: 0, animation: 'pulse 1s infinite' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#ff5a3d', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 3, fontFamily: MONO }}>Alerte critique</div>
            <div style={{ fontSize: 13, color: '#eae8f5', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{sentinelPrompt.message}</div>
          </div>
          <button onClick={() => { setActiveTab('sentinel'); setSentinelPrompt(null) }} style={{ background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
            Ouvrir Sentinel
          </button>
          <button onClick={() => setSentinelPrompt(null)} style={{ background: 'none', border: 'none', color: 'rgba(234,232,245,.35)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: SANS, color: C.tx }}>

        {/* ── Top accent ── */}
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${C.red}bb 28%, ${C.red}bb 72%, transparent 100%)`, flexShrink: 0, animation: 'shimmerLine 4s ease-in-out infinite' }} />

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 26px', borderBottom: `.5px solid ${C.b}`, background: C.sf, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 2, height: 30, background: `linear-gradient(180deg, ${C.red} 0%, ${C.red}30 100%)`, borderRadius: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 6, textTransform: 'uppercase' as const, color: C.tx }}>
                Cald<span style={{ color: C.red }}>ra</span>
              </div>
              <div style={{ fontSize: 7, letterSpacing: 8, textTransform: 'uppercase' as const, color: C.td, display: 'block', marginTop: 3 }}>Session</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.td, fontFamily: MONO, letterSpacing: .3 }}>{displayDate}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', background: connected ? 'rgba(0,209,122,.06)' : C.rg, border: `.5px solid ${connected ? 'rgba(0,209,122,.18)' : C.rb}`, borderRadius: 99 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? C.g : C.red, animation: 'pulse 1.8s infinite' }} />
              <span style={{ fontSize: 9, color: connected ? C.g : C.red, letterSpacing: 1.2, textTransform: 'uppercase' as const, fontFamily: MONO }}>{connected ? 'Live' : 'Sync'}</span>
            </div>
            <LiveClock />
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              style={{ fontSize: 13, color: C.td, background: 'none', border: 'none', cursor: 'pointer', transition: 'color .2s', lineHeight: 1 }}
              onMouseEnter={e => (e.currentTarget.style.color = C.tm)}
              onMouseLeave={e => (e.currentTarget.style.color = C.td)}
            >{theme === 'dark' ? '☀' : '◐'}</button>
            {installPrompt && (
              <button
                onClick={triggerInstall}
                title="Installer Caldra comme application"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.red, fontFamily: MONO, background: 'rgba(124,58,237,.06)', border: `.5px solid rgba(124,58,237,.2)`, padding: '4px 10px', cursor: 'pointer', transition: 'all .2s', letterSpacing: .3 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,.06)' }}
              >
                <span style={{ fontSize: 11 }}>⬇</span> installer
              </button>
            )}
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `.5px solid ${C.b}`, background: `linear-gradient(180deg, ${C.sf} 0%, ${C.sf2} 100%)`, padding: 0, flexShrink: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn${tab.sentinel ? ' tab-sentinel' : ''}${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => { setActiveTab(tab.id as TabId); setSettingsOpen(false) }}
            >
              {tab.label}
              {tab.sentinel && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: C.red, marginLeft: 5, verticalAlign: 'middle', animation: 'pulse 2s infinite' }} />}
            </button>
          ))}

          {/* ── Avatar / settings ── */}
          <div ref={settingsRef} style={{ position: 'relative', marginLeft: 'auto', padding: '0 14px', flexShrink: 0 }}>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: settingsOpen || SETTINGS_ITEMS.some(s => s.id === activeTab) ? C.rd : C.sf2,
                border: `.5px solid ${settingsOpen || SETTINGS_ITEMS.some(s => s.id === activeTab) ? C.rb : C.b}`,
                color: settingsOpen || SETTINGS_ITEMS.some(s => s.id === activeTab) ? C.red : C.tm,
                fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
                display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 0,
                transition: 'all .15s',
              }}
            >
              {initials}
            </button>
            {settingsOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
                background: C.sf, border: `.5px solid ${C.b2}`, borderRadius: 10,
                padding: 5, minWidth: 160,
                boxShadow: '0 8px 32px rgba(0,0,0,.35)',
              }}>
                <div style={{ padding: '6px 10px 5px', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.te }}>Paramètres</div>
                {SETTINGS_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id as TabId); setSettingsOpen(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left',
                      background: activeTab === item.id ? C.rd : 'transparent',
                      border: 'none', borderRadius: 7,
                      color: activeTab === item.id ? C.red : C.tm,
                      fontSize: 12.5, fontFamily: SANS, cursor: 'pointer',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.background = C.b }}
                    onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    {item.label}
                  </button>
                ))}
                <div style={{ margin: '5px 10px', borderTop: `.5px solid ${C.b}` }} />
                <button
                  onClick={async () => {
                    const { createClient } = await import('@/lib/supabase/client')
                    await createClient().auth.signOut()
                    window.location.href = '/login'
                  }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left',
                    background: 'transparent', border: 'none', borderRadius: 7,
                    color: 'rgba(244,63,94,.6)', fontSize: 12.5, fontFamily: SANS, cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Main layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '20% 1fr', flex: 1, overflow: 'hidden', minHeight: 0, height: 0 }}>
          <Sidebar score={score} alerts={alerts} stats={stats} rules={tradingRules} paused={paused} onTogglePause={togglePause} notifPerm={notifPerm} onRequestNotif={requestNotifPermission} />

          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {activeTab === 'session' && (
              <SessionPanel trades={trades} alerts={alerts} stats={stats} yesterdayStats={yesterdayStats} yesterdayTrend={yesterdayTrend} rules={tradingRules} />
            )}
            {activeTab === 'calendrier' && (
              <CalendrierPanel sessions={historicalSessions} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPanel sessions={historicalSessions} todayAlerts={alerts} />
            )}
            {activeTab === 'rapports' && <RapportsPanel />}
            {activeTab === 'integrations' && <IntegrationsPanel apiKeyPrefix={apiKeyPrefix} initialWebhook={tradingRules?.slack_webhook_url ?? null} />}
            {activeTab === 'regles' && <ReglesPanel initial={tradingRules} />}
            {activeTab === 'billing' && <BillingPanel plan={plan} />}
            {activeTab === 'profil' && <ProfilPanel userEmail={userEmail} userMeta={userMeta} />}
            {activeTab === 'sentinel' && (
              <SentinelPanel stats={stats} alerts={alerts} score={score} rules={tradingRules} plan={plan} coachingCards={coachingCards} />
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
    </ThemeCtx.Provider>
  )
}
