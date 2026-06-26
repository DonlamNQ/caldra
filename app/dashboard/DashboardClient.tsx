'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import type { AlertRow } from '@/components/dashboard/AlertFeed'
import type { TradeRow } from '@/components/dashboard/TradeLog'
import type { DaySession } from './page'
import { alertLabel } from '@/lib/alertLabels'
import { alertTechnical } from '@/lib/alertTechnical'
import { randomNote } from '@/lib/coachNotes'
import { isMaxPlan, isPaidPlan } from '@/lib/plans'
import { DETECTOR_DEFS } from '@/lib/detectors'
import { PROPFIRM_PRESETS } from '@/lib/propfirms'
// ── Palette ────────────────────────────────────────────────────────────────────
const C_DARK = {
  red: '#7c3aed', rd: 'rgba(124,58,237,.14)', rb: 'rgba(124,58,237,.32)', rg: 'rgba(124,58,237,.07)',
  bg: '#040406', sf: '#0e0e13', sf2: '#16161d',
  b: 'rgba(255,255,255,.09)', b2: 'rgba(255,255,255,.16)', b3: 'rgba(255,255,255,.25)',
  tx: '#f4f4f8', tm: 'rgba(244,244,248,.88)', td: 'rgba(244,244,248,.60)', te: 'rgba(244,244,248,.42)',
  g: '#2ee08f', o: '#f5a623',
  pnl: '#e4e6ee',
}
const C_LIGHT = {
  red: '#7c3aed', rd: 'rgba(124,58,237,.08)', rb: 'rgba(124,58,237,.20)', rg: 'rgba(124,58,237,.05)',
  bg: '#e7eaf1', sf: '#fbfcfe', sf2: '#f1f3f8',
  b: 'rgba(15,23,42,.14)', b2: 'rgba(15,23,42,.22)', b3: 'rgba(15,23,42,.34)',
  tx: '#141a28', tm: 'rgba(20,26,40,.90)', td: 'rgba(20,26,40,.66)', te: 'rgba(20,26,40,.52)',
  g: '#0a7d4f', o: '#b4530a',
  pnl: '#1f2536',
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
  telegram_bot_token?: string | null
  telegram_chat_id?: string | null
  max_leverage?: number
  require_stop_loss?: boolean
}

interface SessionStats { total_trades: number; total_pnl: number; wins: number; losses: number }

export interface JournalTrade {
  symbol: string
  direction: string
  size: number
  entry_price: number | null
  exit_price: number | null
  pnl: number | null
  entry_time: string
  exit_time: string | null
  stop_loss: number | null
}

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
  journalTrades: JournalTrade[]
  plan: string
  userMeta: { first_name?: string; last_name?: string; phone?: string }
  ctraderConnected: boolean
  ctraderConflict?: boolean
  ctraderPending?: boolean
  lastTradeAt: string | null
  platformConnected?: boolean
  allTimePatterns?: Record<string, number>
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

// Jours de trading CONSÉCUTIFS (du plus récent en remontant) avec session maîtrisée
// (score ≥ 70 ET 0 alerte critique). Jours sans trade = neutres. Sert à déclencher
// une notif de JALON ponctuelle (pas un badge permanent).
function computeDisciplineStreak(sessions: DaySession[]): number {
  const tradingDays = sessions
    .filter(s => s.tradeCount > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  for (const s of tradingDays) {
    if (s.score >= 70 && s.criticalAlerts === 0) streak++
    else break
  }
  return streak
}
const MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 100]

// Streaks de discipline (sobres) : jours de trading consécutifs, du plus récent, qui
// respectent une condition. Chacun déclenche bannière + notif aux paliers MILESTONES.
const STREAK_RISK_TYPES = new Set(['risk_exceeded', 'stop_not_respected', 'overleverage', 'no_stop', 'drawdown_alert', 'drawdown_override'])
const STREAK_TILT_TYPES = new Set(['revenge_sizing', 'immediate_reentry', 'averaging_down', 'euphoria_sizing', 'accelerating_frequency'])

function streakNoAlerts(sessions: DaySession[], badTypes: Set<string>): number {
  const days = sessions.filter(s => s.tradeCount > 0).sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  for (const s of days) {
    if (s.alerts.some(a => badTypes.has(a.type))) break
    streak++
  }
  return streak
}

type StreakDef = { id: string; label: string; compute: (s: DaySession[]) => number }
const STREAK_DEFS: StreakDef[] = [
  { id: 'discipline', label: "sessions maîtrisées d'affilée",        compute: computeDisciplineStreak },
  { id: 'risque',     label: 'sessions sans dépassement de risque',  compute: s => streakNoAlerts(s, STREAK_RISK_TYPES) },
  { id: 'sangfroid',  label: 'sessions sans réaction impulsive',     compute: s => streakNoAlerts(s, STREAK_TILT_TYPES) },
]

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
  return <span style={{ fontFamily: SANS, fontSize: 11, color: C.td }}>{time}</span>
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
        <span style={{ fontSize: 9, color: C.te, fontFamily: SANS, marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

// ── BehavioralRadar ────────────────────────────────────────────────────────────
function BehavioralRadar({ sizing, risk, reentry, drawdown, discipline }: {
  sizing: number; risk: number; reentry: number; drawdown: number; discipline: number
}) {
  const C = useContext(ThemeCtx)
  const labels = ['Sizing', 'Risk', 'Re-entrée', 'Drawdown', 'Horaires']
  const values = [sizing, risk, reentry, drawdown, discipline]
  const n = 5, W = 168, H = 168, cx = 84, cy = 78, r = 54

  function axisAngle(i: number) { return (i * 2 * Math.PI / n) - Math.PI / 2 }
  function pt(i: number, radius: number): [number, number] {
    return [cx + radius * Math.cos(axisAngle(i)), cy + radius * Math.sin(axisAngle(i))]
  }
  function polyPath(radius: number) {
    return Array.from({ length: n }, (_, i) => {
      const [x, y] = pt(i, radius)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ') + 'Z'
  }

  const dataPts = values.map((v, i) => pt(i, r * Math.max(v, 4) / 100))
  const dataPath = dataPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + 'Z'
  const avg = Math.round(values.reduce((a, b) => a + b) / n)
  const col = scoreColor(avg, C)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map((lv, k) => (
        <path key={k} d={polyPath(r * lv)} fill="none"
          stroke={lv === 1 ? C.b2 : C.b} strokeWidth={lv === 1 ? 0.8 : 0.5} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, r)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.b} strokeWidth={0.5} />
      })}
      <path d={dataPath} fill={col} fillOpacity={0.11}
        stroke={col} strokeWidth={1.2} strokeLinejoin="round" />
      {dataPts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={col} />
      ))}
      {values.map((v, i) => {
        const [x, y] = pt(i, r + 23)
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        const vc = v >= 70 ? C.g : v >= 40 ? C.o : C.tm
        return (
          <g key={i}>
            <text x={x} y={y - 3} textAnchor={anchor} fontSize={10} fill={C.td} fontFamily={SANS}>{labels[i]}</text>
            <text x={x} y={y + 10} textAnchor={anchor} fontSize={11} fill={vc} fontWeight="600" fontFamily={SANS}>{v}</text>
          </g>
        )
      })}
    </svg>
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
  { pts: [[0,22],[160,22],[320,22],[480,22],[640,22],[800,22]], idle: true },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3]] },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3],[590,12]] },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3],[590,12],[650,22]] },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3],[590,12],[650,22],[720,34]] },
  { pts: [[0,22],[130,22],[210,16],[320,9],[420,5],[500,3],[590,12],[650,22],[720,34],[790,41]] },
]

const MARKER_R = 3
const MARKER_MAX_X = 800 - 10  // garde le point dans le cadre (extrémité droite)

function ptsToPath(pts: number[][]): string {
  return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ')
}
function ptsToFill(pts: number[][]): string {
  const l = pts[pts.length - 1]
  return ptsToPath(pts) + ` L${l[0]} 44 L0 44Z`
}

function SessionLine({ alerts, score, pnl }: { alerts: AlertRow[]; score: number; pnl: number }) {
  const scoreRef = useRef(score)
  const llStateRef = useRef(0)

  const pathRef = useRef<SVGPathElement>(null)
  const fillRef = useRef<SVGPathElement>(null)
  const startRef = useRef<SVGStopElement>(null)
  const endRef = useRef<SVGStopElement>(null)
  const curRef = useRef<SVGCircleElement>(null)

  useEffect(() => { scoreRef.current = score }, [score])

  useEffect(() => {
    llStateRef.current = Math.min(alerts.length, LL_STATES.length - 1)
  }, [alerts.length])

  useEffect(() => {
    let llT = 0
    let rafId: number

    function animateLine() {
      llT += 0.016
      const s = LL_STATES[llStateRef.current]
      const base = s.pts.map(p => [...p])
      let livePts: number[][]
      if (s.idle) {
        const wave = Math.sin(llT * 0.55) * 3.8 + Math.sin(llT * 1.35) * 1.4
        livePts = base.map(p => [p[0], Math.max(6, Math.min(38, p[1] + wave))])
      } else {
        const noise = Math.sin(llT * 1.4) * 1.0 + Math.sin(llT * 3.1) * 0.4
        const last = base[base.length - 1]
        const liveY = Math.max(6, Math.min(38, last[1] + noise))
        livePts = [...base.slice(0, -1), [last[0], liveY]]
      }
      // La ligne s'arrête où se trouve le point lumineux (le point EST la fin de la ligne).
      const li = livePts.length - 1
      livePts[li] = [Math.min(livePts[li][0], MARKER_MAX_X), livePts[li][1]]
      const lp = livePts[li]
      const c = llColor(scoreRef.current)
      pathRef.current?.setAttribute('d', ptsToPath(livePts))
      fillRef.current?.setAttribute('d', ptsToFill(livePts))
      pathRef.current?.setAttribute('stroke', c)
      startRef.current?.setAttribute('stop-color', c)
      endRef.current?.setAttribute('stop-color', c)
      curRef.current?.setAttribute('cx', String(lp[0]))
      curRef.current?.setAttribute('cy', String(lp[1]))
      curRef.current?.setAttribute('fill', c)
      rafId = requestAnimationFrame(animateLine)
    }

    rafId = requestAnimationFrame(animateLine)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Tracé initial = ligne centrée (idle) pour rester visible même avant le 1er frame.
  const c0 = llColor(score)
  const rawPts = LL_STATES[Math.min(alerts.length, LL_STATES.length - 1)].pts
  const initPts = rawPts.map((p, i) =>
    i === rawPts.length - 1
      ? [Math.min(p[0], MARKER_MAX_X), Math.max(6, Math.min(38, p[1]))]
      : p
  )
  const initEnd = initPts[initPts.length - 1]

  return (
    <svg width="100%" viewBox="0 0 800 44" preserveAspectRatio="none" height="44" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="llg" x1="0" y1="0" x2="1" y2="0">
          <stop ref={startRef} offset="0%" stopColor={c0} stopOpacity="0.7" />
          <stop ref={endRef} offset="100%" stopColor={c0} stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path ref={fillRef} d={ptsToFill(initPts)} fill="url(#llg)" opacity=".08" />
      <path ref={pathRef} d={ptsToPath(initPts)} fill="none" stroke={c0} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle ref={curRef} cx={initEnd[0]} cy={initEnd[1]} r={MARKER_R} fill={c0} />
    </svg>
  )
}

// ── PnlChart — cumulative SVG chart with Y/X axes ────────────────────────────
function PnlChart({ trades, drawdownAmt, baseline }: { trades: TradeRow[]; drawdownAmt?: number; baseline?: number }) {
  const C = useContext(ThemeCtx)
  const [hover, setHover] = useState<number | null>(null)
  const sorted = [...trades]
    .filter(t => t.pnl != null && t.entry_time)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  // Mode prop firm : la courbe représente le SOLDE du compte (démarre au capital de
  // départ `baseline`) au lieu du P&L cumulé (qui démarre à 0). `base` = la référence.
  const base = baseline ?? 0
  const propMode = baseline != null

  const W = 600, H = 120
  // Les chiffres de l'axe Y sont dans une gouttière À GAUCHE (PXL), hors du tracé.
  // Gouttière volontairement fine pour limiter le décalage de la courbe.
  const PXL = propMode ? 42 : 30, PXR = 10, PYT = 6, PYB = 18
  const DW = W - PXL - PXR, DH = H - PYT - PYB
  const axisColor = C.te
  const gridColor = C.b
  const fmtY = (v: number) => propMode
    ? `€${Math.round(v).toLocaleString('fr-FR')}`
    : v === 0 ? '€0' : v > 0 ? `+€${Math.abs(v).toFixed(0)}` : `-€${Math.abs(v).toFixed(0)}`

  if (sorted.length === 0) {
    const yMid = PYT + DH / 2
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <line x1={PXL} y1={PYT} x2={PXL} y2={H - PYB} stroke={gridColor} strokeWidth={1} />
        <line x1={PXL} y1={H - PYB} x2={W - PXR} y2={H - PYB} stroke={gridColor} strokeWidth={1} />
        <text x={PXL - 3} y={yMid + 3} textAnchor="end" fill={axisColor} fontSize="8" style={{ fontFamily: SANS }}>{fmtY(base)}</text>
      </svg>
    )
  }

  // La courbe démarre directement au premier trade : pas de point d'origine
  // artificiel. En mode prop firm elle part du capital ; sinon de €0 (P&L cumulé).
  const pts: { t: string; v: number; pnl: number | null; sym: string | null; dir: string | null }[] = []
  let cum = 0
  for (const t of sorted) {
    cum += t.pnl ?? 0
    pts.push({ t: fmtTime(t.entry_time), v: base + cum, pnl: t.pnl ?? null, sym: t.symbol ?? null, dir: t.direction ?? null })
  }

  const vals = pts.map(p => p.v)
  const rawMin = Math.min(base, ...vals), rawMax = Math.max(base, ...vals)
  const rawRange = rawMax - rawMin || 1
  const grace = rawRange * 0.08
  const minV = rawMin - grace, maxV = rawMax + grace
  const range = maxV - minV
  const n = pts.length
  const GREEN = '#3cc87a', RED = '#dc503c'
  const colorForV = (v: number) => (v >= base ? GREEN : RED)

  const xOf = (i: number) => PXL + (i / Math.max(n - 1, 1)) * DW
  const yOf = (v: number) => PYT + DH - ((v - minV) / range) * DH
  const y0 = yOf(base)
  // Fraction verticale de la ligne du zéro dans la zone de tracé → point de
  // bascule des dégradés (vert au-dessus du zéro, rouge en-dessous).
  const zf = Math.max(0, Math.min(1, (y0 - PYT) / DH))

  const xyPts = pts.map((p, i) => [xOf(i), yOf(p.v)] as [number, number])
  const polyPoints = xyPts.map(([x, y]) => `${x},${y}`).join(' ')
  const fillPath = `M${xyPts[0][0]} ${xyPts[0][1]} ${xyPts.slice(1).map(([x, y]) => `L${x} ${y}`).join(' ')} L${xOf(n - 1)} ${y0} L${xOf(0)} ${y0} Z`

  // Ticks Y équidistants : valeurs « rondes » multiples d'un pas, bornées à la
  // zone visible [minV, maxV] → écart constant entre les nombres, jamais hors cadre.
  const yTicks = (() => {
    if (rawRange < 1) return [0]
    const roughStep = rawRange / 4
    const mag = Math.pow(10, Math.floor(Math.log10(roughStep)))
    const norm = roughStep / mag
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
    const start = Math.ceil(minV / step) * step
    const end = Math.floor(maxV / step) * step
    const ticks: number[] = []
    for (let v = start; v <= end + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000)
    return ticks.filter((v, i, a) => a.findIndex(x => Math.abs(x - v) < 0.01) === i)
  })()

  const step = Math.max(1, Math.floor((n - 1) / 4))
  const xIdxSet = new Set([0, n - 1])
  for (let i = step; i < n - 1; i += step) xIdxSet.add(i)
  const xIdxs = [...xIdxSet].sort((a, b) => a - b)

  // Survol/scrub : à la souris on n'affiche l'info QUE si le curseur est sur la
  // ligne ou dans la zone colorée à cette position X ; au doigt (mobile) on suit
  // simplement la position X pour que l'info déroule pendant le glissement.
  const locate = (clientX: number, clientY: number, rect: DOMRect, isTouch: boolean) => {
    if (rect.width === 0 || rect.height === 0) return
    const xVB = ((clientX - rect.left) / rect.width) * W
    const yVB = ((clientY - rect.top) / rect.height) * H

    // Hors de la zone de tracé (gouttières / bandeau des heures) → rien.
    if (xVB < PXL || xVB > W - PXR) { setHover(null); return }

    const fi = Math.max(0, Math.min(n - 1, ((xVB - PXL) / DW) * (n - 1)))
    if (!isTouch) {
      if (yVB < PYT || yVB > H - PYB) { setHover(null); return }
      // Hauteur de la courbe interpolée à cette position X.
      const i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1)
      const yCurve = yOf(pts[i0].v) + (yOf(pts[i1].v) - yOf(pts[i0].v)) * (fi - i0)
      // Bande colorée = entre la courbe et la ligne du zéro, + tolérance.
      const TOL = 5
      if (yVB < Math.min(yCurve, y0) - TOL || yVB > Math.max(yCurve, y0) + TOL) { setHover(null); return }
    }
    setHover(Math.round(fi))
  }
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => locate(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), false)
  const onTouch = (e: React.TouchEvent<HTMLDivElement>) => { const t = e.touches[0]; if (t) locate(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect(), true) }

  const hp = hover != null ? pts[hover] : null
  const hx = hover != null ? xOf(hover) : 0
  const hyV = hover != null ? yOf(pts[hover].v) : 0

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'pan-y' }}
      onMouseMove={onMove} onMouseLeave={() => setHover(null)}
      onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="none">
        <defs>
          {/* Ligne : vert au-dessus du zéro, rouge en-dessous (bascule à zf). */}
          <linearGradient id="pnl-line" x1="0" y1={PYT} x2="0" y2={H - PYB} gradientUnits="userSpaceOnUse">
            <stop offset={0} stopColor={GREEN}/>
            <stop offset={zf} stopColor={GREEN}/>
            <stop offset={zf} stopColor={RED}/>
            <stop offset={1} stopColor={RED}/>
          </linearGradient>
          {/* Aplat : même bascule, faible opacité, estompé vers la ligne du zéro. */}
          <linearGradient id="pnl-fill" x1="0" y1={PYT} x2="0" y2={H - PYB} gradientUnits="userSpaceOnUse">
            <stop offset={0} stopColor={GREEN} stopOpacity="0.22"/>
            <stop offset={zf} stopColor={GREEN} stopOpacity="0.04"/>
            <stop offset={zf} stopColor={RED} stopOpacity="0.04"/>
            <stop offset={1} stopColor={RED} stopOpacity="0.22"/>
          </linearGradient>
        </defs>
        {yTicks.map(v => (
          <line key={`g${v}`} x1={PXL} y1={yOf(v)} x2={W - PXR} y2={yOf(v)} stroke={gridColor} strokeWidth={0.5} />
        ))}
        <line x1={PXL} y1={PYT} x2={PXL} y2={H - PYB} stroke={gridColor} strokeWidth={1} />
        <line x1={PXL} y1={H - PYB} x2={W - PXR} y2={H - PYB} stroke={gridColor} strokeWidth={1} />
        {/* Mode prop firm : ligne de référence au capital de départ */}
        {propMode && <line x1={PXL} y1={y0} x2={W - PXR} y2={y0} stroke={C.b3} strokeWidth={0.6} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        {yTicks.map(v => (
          <text key={`t${v}`} x={PXL - 3} y={Math.max(PYT + 5, Math.min(H - PYB, yOf(v) + 2))}
            textAnchor="end" fill={axisColor} fontSize="6.5" style={{ fontFamily: SANS }}>{fmtY(v)}</text>
        ))}
        {xIdxs.map(i => (
          <text key={i} x={Math.max(PXL + 14, Math.min(W - PXR - 14, xOf(i)))}
            y={H - PYB + 12} textAnchor="middle" fill={axisColor} fontSize="5" style={{ fontFamily: SANS }}>
            {pts[i].t}
          </text>
        ))}
        {n >= 2 && <path d={fillPath} fill="url(#pnl-fill)" />}
        {n >= 2
          ? <polyline points={polyPoints} fill="none" stroke="url(#pnl-line)" strokeWidth={0.9} strokeLinejoin="round" strokeLinecap="round" />
          : <circle cx={xOf(0)} cy={yOf(pts[0].v)} r={3} fill={colorForV(pts[0].v)} />
        }
        {hover != null && (
          <g pointerEvents="none">
            <line x1={hx} y1={PYT} x2={hx} y2={H - PYB} stroke={C.b3} strokeWidth={0.6} strokeDasharray="2 2" />
            <circle cx={hx} cy={hyV} r={2.6} fill={colorForV(pts[hover].v)} stroke={C.sf} strokeWidth={1} />
          </g>
        )}
      </svg>
      {hp && (
        <div style={{
          position: 'absolute', left: `${Math.max(16, Math.min(84, (hx / W) * 100))}%`, top: `${(hyV / H) * 100}%`,
          transform: 'translate(-50%, calc(-100% - 9px))', pointerEvents: 'none', zIndex: 5,
          background: C.sf2, border: `.5px solid ${C.b2}`, borderRadius: 6, padding: '5px 8px',
          whiteSpace: 'nowrap', fontFamily: SANS, fontSize: 9.5, lineHeight: 1.45,
          boxShadow: '0 4px 14px rgba(0,0,0,.4)',
        }}>
          <div style={{ color: C.te, marginBottom: 1 }}>
            {hp.pnl == null ? 'Début de session' : `${hp.t} · ${hp.sym} ${hp.dir}`}
          </div>
          <div><span style={{ color: C.te }}>{propMode ? 'Solde ' : 'Cumul '}</span><span style={{ color: C.tm }}>{fmtY(hp.v)}</span></div>
        </div>
      )}
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ score, alerts, stats, rules }: {
  score: number; alerts: AlertRow[]; stats: SessionStats; rules: TradingRules | null
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
  const propFirmOn = !!(rules as any)?.prop_firm
  const propFirmStart = (rules as any)?.prop_firm_started_at as string | null

  return (
    <div style={{ borderRight: `.5px solid ${C.b}`, display: 'flex', flexDirection: 'column', background: C.sf, overflowY: 'auto', overflowX: 'hidden', textDecoration: 'none', borderRadius: 16, margin: '10px 0 10px 10px', overflow: 'hidden' }}>

      {/* Score */}
      <div style={{ padding: '20px 20px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${scoreCol}12 0%, transparent 60%)`, pointerEvents: 'none', transition: 'background .5s' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${propFirmOn ? 'rgba(124,58,237,.9)' : C.b3} 40%, transparent)`, transition: 'background .5s' }} />
        {propFirmOn && <div style={{ marginBottom: 8 }}><PropFirmChip start={propFirmStart} /></div>}
        <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.td, display: 'block', marginBottom: 12, textTransform: 'uppercase' as const, fontFamily: SANS }}>Profil comportemental</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRingSvg score={score} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8,
              padding: '5px 12px', borderRadius: 99, fontSize: 10, letterSpacing: .7,
              fontFamily: SANS,
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

      {/* Radar */}
      <div style={{ padding: '10px 20px 8px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <BehavioralRadar sizing={mSizing} risk={mRisk} reentry={mReentry} drawdown={mDrawdown} discipline={mDiscipline} />
      </div>

      {/* Fenêtre de session */}
      {rules && (
        <div style={{ padding: '8px 20px 8px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.td }}>Fenêtre</span>
          <span style={{ fontSize: 11, color: C.tm, fontFamily: SANS }}>{rules.session_start.slice(0,5)}–{rules.session_end.slice(0,5)}</span>
        </div>
      )}

      {/* Séparateur fin (pas pleine largeur) avant les Alertes */}
      <div style={{ height: '.5px', background: C.b, width: '72%', margin: '2px auto 0', flexShrink: 0 }} />

      {/* Alertes — heatmap + feed (flex:1 pour remplir l'espace) */}
      <div style={{ padding: '14px 20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: C.td, textTransform: 'uppercase' as const, fontFamily: SANS }}>Alertes</span>
          {alerts.length > 0 && (
            <span style={{ fontSize: 9, fontFamily: SANS, padding: '2px 9px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 99, color: C.red, animation: 'pulse 2s infinite' }}>
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length > 0 && (() => {
          // Plus de tuiles : un feed unique. Les alertes sont regroupées par type —
          // une alerte déjà présente qui se re-déclenche ne crée pas une nouvelle
          // ligne : l'existante remonte en haut (heure mise à jour) avec un badge
          // ×N indiquant le nombre de répétitions.
          const grouped = (() => {
            const map = new Map<string, { type: string; level: number; message: string; created_at: any; count: number; detail: any }>()
            for (const a of alerts) {
              const type = a.type ?? ''
              const at = (a as any).created_at ?? null
              const existing = map.get(type)
              if (!existing) {
                map.set(type, { type, level: a.level ?? 1, message: a.message, created_at: at, count: 1, detail: (a as any).detail ?? null })
              } else {
                existing.count += 1
                existing.level = Math.max(existing.level, a.level ?? 1)
                if (at && (!existing.created_at || new Date(at).getTime() > new Date(existing.created_at).getTime())) {
                  existing.created_at = at
                  existing.message = a.message
                  existing.detail = (a as any).detail ?? null
                }
              }
            }
            return [...map.values()].sort((x, y) => {
              const tx = x.created_at ? new Date(x.created_at).getTime() : 0
              const ty = y.created_at ? new Date(y.created_at).getTime() : 0
              return ty - tx
            })
          })()

          return (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {grouped.map(a => {
                const lvl = a.level ?? 1
                const aCol = lvl >= 3 ? '#dc3218' : lvl >= 2 ? C.red : C.o
                return (
                  <div key={a.type} style={{ padding: '8px 10px', borderRadius: 6, background: `${aCol}1a`, borderLeft: `3px solid ${aCol}`, flexShrink: 0, transition: 'all .3s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 10, color: aCol, fontFamily: SANS, fontWeight: 600, letterSpacing: .3 }}>L{lvl} · {alertLabel(a.type)}</span>
                        {a.count > 1 && (
                          <span style={{ fontSize: 9, fontFamily: SANS, fontWeight: 600, color: aCol, background: `${aCol}1e`, border: `.5px solid ${aCol}55`, borderRadius: 99, padding: '1px 6px', lineHeight: 1.3, flexShrink: 0 }}>×{a.count}</span>
                        )}
                      </span>
                      {a.created_at && <span style={{ fontSize: 9.5, color: C.te, fontFamily: SANS, flexShrink: 0 }}>{fmtTime(a.created_at)}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.tm, fontWeight: 300, lineHeight: 1.35 }}>{a.message}</div>
                    {alertTechnical(a.type, a.detail) && (
                      <div style={{ fontSize: 11.5, color: C.td, fontWeight: 300, lineHeight: 1.4, marginTop: 5, paddingTop: 5, borderTop: `.5px solid ${aCol}22` }}>
                        {alertTechnical(a.type, a.detail)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}

      </div>
    </div>
  )
}

// ── SessionPanel ───────────────────────────────────────────────────────────────
function SessionPanel({ trades, alerts, stats, yesterdayStats, yesterdayTrend, rules, connected }: {
  trades: TradeRow[]; alerts: AlertRow[]; stats: SessionStats
  yesterdayStats: { score: number; pnl: number; alerts: number } | null
  yesterdayTrend: number | null; rules: TradingRules | null; connected?: boolean
}) {
  const C = useContext(ThemeCtx)
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null)
  const [dailyNote] = useState(() => randomNote())
  // Message du jour = petit pop-up fermable, une fois par jour (mémorisé localement).
  const [showNote, setShowNote] = useState(false)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (localStorage.getItem('caldra_note_dismissed') !== today) setShowNote(true)
  }, [])
  const dismissNote = () => {
    localStorage.setItem('caldra_note_dismissed', new Date().toISOString().slice(0, 10))
    setShowNote(false)
  }
  const score = computeScore(alerts)
  const streak = consecutiveLosses(trades)
  const sortedTrades = [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
  const drawdownPct = rules
    ? Math.min(100, Math.round(Math.abs(Math.min(0, stats.total_pnl)) / ((rules.max_daily_drawdown_pct / 100) * (rules.account_size || 10000)) * 100))
    : 0
  const propFirmId = (rules as any)?.prop_firm as string | null
  const propFirm = propFirmId ? PROPFIRM_PRESETS.find(p => p.id === propFirmId) : null
  const accountSize = rules?.account_size || 10000
  // Ambiance prop firm : pas de contour coloré, seulement le filet lumineux du haut.
  const ambBd = C.b
  const ambLn = propFirm ? 'rgba(124,58,237,.9)' : C.b3

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>

      {/* Row 1: terminal stats + chart */}
      <div className="session-main-grid" style={{ display: 'grid', gridTemplateColumns: '158px 1fr', gap: 12 }}>

        {/* Stats terminal */}
        <div style={{ background: C.sf, border: `.5px solid ${ambBd}`, borderRadius: 12, padding: '18px 18px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${ambLn} 40%, transparent)` }} />
          <div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.te, fontFamily: SANS, textTransform: 'uppercase' as const, marginBottom: 5 }}>P&L</div>
            <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: -1.5, lineHeight: 1, color: C.tx }}>
              {fmtEur(stats.total_pnl)}
            </div>
          </div>
          <div style={{ height: .5, background: C.b }} />
          {([
            { k: 'Win rate', v: stats.total_trades > 0 ? `${Math.round(stats.wins / stats.total_trades * 100)}%` : '—', sub: stats.total_trades > 0 ? `${stats.wins}W ${stats.losses}L` : '' },
            { k: 'Trades', v: String(stats.total_trades), sub: `/ ${rules?.max_trades_per_session ?? '?'}` },
            { k: 'Drawdown', v: `${drawdownPct}%`, warn: drawdownPct > 80 },
            { k: 'Consécutives', v: String(streak), warn: streak >= 2 },
          ] as { k: string; v: string; sub?: string; warn?: boolean }[]).map(({ k, v, sub, warn }) => (
            <div key={k}>
              <div style={{ fontSize: 8.5, color: C.te, fontFamily: SANS, letterSpacing: .8, marginBottom: 2 }}>{k}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 18, fontFamily: SANS, color: C.td }}>{v}</span>
                {sub && <span style={{ fontSize: 10.5, color: C.te, fontFamily: SANS }}>{sub}</span>}
              </div>
            </div>
          ))}
          {yesterdayStats && (
            <div style={{ borderTop: `.5px solid ${C.b}`, paddingTop: 8 }}>
              <div style={{ fontSize: 8.5, color: C.te, fontFamily: SANS, letterSpacing: .8, marginBottom: 4 }}>J−1</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ fontSize: 14, color: C.pnl }}>{fmtEur(yesterdayStats.pnl)}</span>
                <span style={{ fontSize: 11, fontFamily: SANS, color: scoreColor(yesterdayStats.score, C) }}>{yesterdayStats.score} pts</span>
              </div>
              {yesterdayStats.alerts > 0 && (
                <div style={{ fontSize: 9, color: C.te, fontFamily: SANS, marginTop: 2 }}>{yesterdayStats.alerts} alerte{yesterdayStats.alerts > 1 ? 's' : ''}</div>
              )}
            </div>
          )}
        </div>

        {/* Chart card */}
        <div style={{ background: C.sf, borderTop: `.5px solid ${ambBd}`, borderLeft: `.5px solid ${ambBd}`, borderRight: `.5px solid ${ambBd}`, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${ambLn} 40%, transparent)` }} />
          <div style={{ fontSize: 9, color: C.te, letterSpacing: 1.5, marginBottom: 5, textTransform: 'uppercase' as const, fontFamily: SANS }}>Ligne de session</div>
          <div style={{ border: `.5px solid ${C.b}`, borderRadius: 2, height: 44, overflow: 'hidden', flexShrink: 0 }}>
            <SessionLine alerts={alerts} score={score} pnl={stats.total_pnl} />
          </div>
          <div style={{ borderTop: `.5px solid ${C.b}`, margin: '10px 0' }} />
          <div style={{ fontSize: 9, color: C.te, letterSpacing: 1.5, marginBottom: 5, textTransform: 'uppercase' as const, fontFamily: SANS }}>{propFirm ? 'Solde du compte' : 'Courbe P&L'}</div>
          <div style={{ flex: 1, minHeight: 120 }}>
            <PnlChart trades={trades} drawdownAmt={rules ? (rules.max_daily_drawdown_pct / 100) * (rules.account_size || 10000) : undefined} baseline={propFirm ? accountSize : undefined} />
          </div>
        </div>
      </div>

      {/* Session tape — timeline */}
      <div style={{ background: C.sf, border: `.5px solid ${ambBd}`, borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${ambLn} 40%, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginBottom: 12 }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: C.td, textTransform: 'uppercase' as const, fontFamily: SANS }}>Session tape</span>
          {trades.length > 0 && <span style={{ fontSize: 9, fontFamily: SANS, color: C.te }}>{trades.length} trade{trades.length > 1 ? 's' : ''}</span>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {sortedTrades.length === 0 ? (
            <div style={{ fontSize: 12, color: C.te, fontStyle: 'italic', fontWeight: 300, padding: '10px 0' }}>
              {connected
                ? "Aucun trade aujourd'hui pour l'instant."
                : "Aucun trade aujourd'hui — connectez votre plateforme via l'onglet Intégrations."}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {sortedTrades.map((t, i) => {
                const tradeAlerts = alerts.filter(a =>
                  a.trade_id ? a.trade_id === t.id
                  : a.created_at && t.entry_time && Math.abs(new Date(a.created_at).getTime() - new Date(t.entry_time).getTime()) < 90000
                )
                const topAlert = tradeAlerts.sort((a, b) => (b.level ?? b.severity ?? 1) - (a.level ?? a.severity ?? 1))[0]
                const lvl = topAlert ? (topAlert.level ?? topAlert.severity ?? 1) : 0
                const LVL_STYLE: Record<number, { bg: string; border: string; dot: string }> = {
                  1: { bg: 'rgba(245,166,35,.05)', border: 'rgba(245,166,35,.3)', dot: '#f5a623' },
                  2: { bg: C.rd, border: `${C.red}70`, dot: C.red },
                  3: { bg: 'rgba(220,50,24,.08)', border: 'rgba(220,50,24,.45)', dot: '#dc3218' },
                }
                const ls = lvl > 0 ? LVL_STYLE[lvl] : null
                const dotColor = ls ? ls.dot : 'rgba(255,255,255,.16)'
                const isOpen = t.status === 'open' || t.exit_price == null
                const tradeKey = String(t.id ?? i)
                const isExpanded = expandedTrade === tradeKey

                return (
                  <div key={tradeKey}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      {/* Time + connector line */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, width: 44 }}>
                        <span style={{ fontSize: 11, color: C.te, fontFamily: SANS, paddingTop: 8, lineHeight: 1 }}>
                          {fmtTime(t.entry_time)}
                        </span>
                        {i < sortedTrades.length - 1 && (
                          <div style={{ width: 1, height: 18, background: `linear-gradient(to bottom, ${C.b2}, transparent)`, margin: '3px auto 0' }} />
                        )}
                      </div>
                      {/* Timeline dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 8, flexShrink: 0,
                        background: dotColor,
                        boxShadow: 'none',
                        border: ls ? `1px solid ${ls.border}` : '1px solid rgba(255,255,255,.1)',
                      }} />
                      {/* Trade content */}
                      <div
                        onClick={() => setExpandedTrade(isExpanded ? null : tradeKey)}
                        style={{
                          flex: 1, padding: '4px 8px 4px 0', cursor: 'pointer',
                          display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
                          borderRadius: 6, background: isExpanded ? 'rgba(255,255,255,.03)' : 'transparent',
                          transition: 'background .12s',
                        }}
                      >
                        {/* Left: empty spacer */}
                        <div />
                        {/* Center: symbol + direction + badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', flexWrap: 'nowrap' as const }}>
                          <span style={{ fontSize: 13, color: C.tm, fontWeight: 500 }}>{t.symbol}</span>
                          <span style={{ fontSize: 10.5, color: C.td, flexShrink: 0 }}>
                            {t.direction === 'long' ? '▲' : '▼'} ×{t.size}
                          </span>
                          {isOpen && (
                            <span style={{ fontSize: 8, padding: '1px 5px', background: 'rgba(255,171,0,.08)', border: '.5px solid rgba(255,171,0,.22)', color: C.o, borderRadius: 99, fontFamily: SANS, flexShrink: 0 }}>
                              live
                            </span>
                          )}
                          {ls && (
                            <span style={{ fontSize: 8, padding: '1px 5px', fontFamily: SANS, background: ls.bg, border: `.5px solid ${ls.border}`, color: ls.dot, borderRadius: 99, flexShrink: 0 }}>
                              L{lvl}
                            </span>
                          )}
                        </div>
                        {/* Right: PnL */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 12.5, color: C.tx, whiteSpace: 'nowrap' as const }}>
                            {isOpen ? '—' : fmtEur(t.pnl ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{
                        marginLeft: 60, marginBottom: 6,
                        background: 'rgba(255,255,255,.04)', border: '.5px solid rgba(255,255,255,.07)',
                        borderRadius: 7, padding: '8px 12px',
                        display: 'flex', gap: 18, flexWrap: 'wrap' as const, animation: 'fadeIn .15s',
                      }}>
                        {(() => {
                          const pts = t.entry_price && t.exit_price
                            ? (t.direction === 'long' ? t.exit_price - t.entry_price : t.entry_price - t.exit_price)
                            : null
                          const fields: { label: string; val: string }[] = [
                            { label: 'Entrée', val: t.entry_price != null ? String(t.entry_price) : '—' },
                            { label: 'Sortie', val: t.exit_price != null ? String(t.exit_price) : '—' },
                            { label: 'Durée', val: fmtDuration(t.entry_time, t.exit_time) },
                            { label: 'Taille', val: `${t.size} lot` },
                          ]
                          if (pts !== null) fields.push({ label: 'Pts / pips', val: `${pts >= 0 ? '+' : ''}${pts.toFixed(2)}` })
                          return fields
                        })().map(({ label, val }) => (
                          <div key={label}>
                            <div style={{ fontSize: 9.5, color: C.te, fontFamily: SANS, marginBottom: 1 }}>{label}</div>
                            <div style={{ fontSize: 11, color: C.tm, fontFamily: SANS }}>{val}</div>
                          </div>
                        ))}
                        {tradeAlerts.slice(0, 2).map((a, ai) => (
                          <div key={ai}>
                            <div style={{ fontSize: 9.5, color: C.te, fontFamily: SANS, marginBottom: 1 }}>Alerte</div>
                            <div style={{ fontSize: 10.5, fontFamily: SANS, color: (a.level ?? 1) >= 3 ? '#dc3218' : (a.level ?? 1) >= 2 ? C.red : C.o }}>
                              L{a.level ?? 1} — {alertLabel(a.type)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Message du jour — pop-up discret, fermable (× ou clic ailleurs disparaît au prochain jour) */}
      {showNote && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 300, maxWidth: 320,
          background: C.sf2, border: `.5px solid ${C.b2}`, borderRadius: 12,
          padding: '14px 16px', boxShadow: '0 12px 40px rgba(0,0,0,.45)',
          animation: 'fadeUp .35s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 9, letterSpacing: 1.5, color: C.td, textTransform: 'uppercase' as const, fontFamily: SANS }}>Message du jour</span>
            <button onClick={dismissNote} aria-label="Fermer" style={{
              background: 'transparent', border: 'none', color: C.te, cursor: 'pointer',
              fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 12, fontFamily: SANS,
            }}
              onMouseEnter={e => { e.currentTarget.style.color = C.tm }}
              onMouseLeave={e => { e.currentTarget.style.color = C.te }}
            >×</button>
          </div>
          <div style={{ fontSize: 13, color: C.tm, fontWeight: 300, fontStyle: 'italic', lineHeight: 1.5 }}>{dailyNote}</div>
        </div>
      )}

    </div>
  )
}

// ── PropFirmChip — pastille « Compte prop firm · depuis <date> » (mode actif) ────
// `start` (prop_firm_started_at) n'est renseigné QUE quand le mode est actif → sa
// présence suffit à savoir qu'on est en mode prop firm.
function PropFirmChip({ start }: { start?: string | null }) {
  if (!start) return null
  return (
    <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1.1, color: '#a78bfa', background: 'rgba(124,58,237,.12)', border: '.5px solid rgba(124,58,237,.4)', borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase' as const, fontFamily: SANS, whiteSpace: 'nowrap' as const }}>
      Prop firm
    </span>
  )
}

// ── CalendrierPanel ────────────────────────────────────────────────────────────
function CalendrierPanel({ sessions, propFirmStart }: { sessions: DaySession[]; propFirmStart?: string | null }) {
  const C = useContext(ThemeCtx)
  const inProp = !!propFirmStart
  // Filet lumineux des cartes : violet en mode prop firm, argenté (C.b3) sinon.
  const fluxLn = inProp ? 'rgba(124,58,237,.9)' : C.b3
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

      {/* Header */}
      <div style={{ padding: '18px 26px 16px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {inProp && <div style={{ marginBottom: 6 }}><PropFirmChip start={propFirmStart} /></div>}
          <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.4, color: C.tx }}>Calendrier des sessions</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['rgba(0,209,122,.7)', '≥ 70'], ['rgba(255,171,0,.7)', '40–69'], ['rgba(255,90,61,.7)', '< 40']].map(([bg, lbl]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.td }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: bg }} />{lbl}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ padding: '20px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.3, textTransform: 'capitalize' as const }}>{monthName}</div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setCalOffset(o => o - 1)} style={{ background: 'rgba(255,255,255,.03)', border: `.5px solid ${C.b}`, borderRadius: 7, color: C.td, cursor: 'pointer', width: 30, height: 30, fontSize: 16, transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}>‹</button>
            <button onClick={() => setCalOffset(o => o + 1)} style={{ background: 'rgba(255,255,255,.03)', border: `.5px solid ${C.b}`, borderRadius: 7, color: C.td, cursor: 'pointer', width: 30, height: 30, fontSize: 16, transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}>›</button>
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
                  <div style={{ fontSize: 11, color: C.td, fontFamily: SANS }}>{d}</div>
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
                {inProp && dateStr >= propFirmStart! && (
                  <span style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 7, fontWeight: 700, letterSpacing: .5, color: '#a78bfa', background: 'rgba(124,58,237,.16)', border: '.5px solid rgba(124,58,237,.45)', borderRadius: 4, padding: '1px 3px', fontFamily: SANS, lineHeight: 1.2 }}>PF</span>
                )}
                <div style={{ fontSize: 11, color: C.te, fontFamily: SANS, marginBottom: 4 }}>{d}</div>
                <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -1, lineHeight: 1, marginBottom: 2, color: col }}>{s.score}</div>
                <div style={{ fontSize: 10, color: C.td }}>{fmtEur(s.pnl)}</div>
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
                  <span style={{ fontSize: 12.5, fontFamily: SANS, color: C.tm, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              {selectedSession.alerts.slice(0, 2).map((a, i) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: 7, marginTop: 8, border: `.5px solid ${a.level >= 3 ? 'rgba(220,50,24,.25)' : a.level >= 2 ? C.rb : 'rgba(255,171,0,.18)'}`, background: a.level >= 3 ? 'rgba(220,50,24,.08)' : a.level >= 2 ? C.rd : 'rgba(255,171,0,.06)' }}>
                  <div style={{ fontSize: 10, fontFamily: SANS, marginBottom: 3, color: a.level >= 3 ? '#dc3218' : a.level >= 2 ? C.red : C.o }}>L{a.level} · {a.type}</div>
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
              const wPnl = w.days.reduce((a, d) => a + (sessionByDate[cellDate(d)]?.pnl ?? 0), 0)
              return (
                <div key={w.lbl} style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 9, padding: '12px 14px', marginBottom: 8, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${fluxLn} 40%,transparent)` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: C.td }}>{w.lbl} <span style={{ fontFamily: SANS, color: C.pnl }}>· {fmtEur(wPnl)}</span></span>
                    <span style={{ fontSize: 13, fontFamily: SANS, fontWeight: 500, color: col }}>{avg}</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${avg}%`, background: col, borderRadius: 2, transition: 'width .5s' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {w.days.map(d => {
                      const ds = sessionByDate[cellDate(d)]
                      if (!ds) return <div key={d} style={{ width: 40, height: 40, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b2}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, opacity: .4 }}><span style={{ fontSize: 8.5, color: C.td, fontFamily: SANS }}>{d}</span></div>
                      const dc = scoreColor(ds.score, C)
                      const dbg = ds.score >= 70 ? 'rgba(0,209,122,' : ds.score >= 40 ? 'rgba(255,171,0,' : 'rgba(255,90,61,'
                      return (
                        <div key={d} onClick={() => setSelectedDate(cellDate(d))} style={{ width: 40, height: 40, borderRadius: 8, background: `${dbg}.14)`, border: `.5px solid ${dbg}.35)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', transition: 'filter .15s' }}>
                          <span style={{ fontSize: 13, fontFamily: SANS, fontWeight: 500, color: dc }}>{ds.score}</span>
                          <span style={{ fontSize: 8.5, color: C.td, fontFamily: SANS }}>{d}</span>
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
                { val: String(avgScore), lbl: 'Score moy.', col: C.tm },
                { val: String(sessions.length), lbl: 'Sessions', col: C.tm },
                { val: String(critical), lbl: 'Critiques', col: C.tm },
                { val: fmtEur(totalPnl), lbl: 'P&L total', col: C.pnl },
              ].map((item, i) => (
                <div key={i} style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 9, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${fluxLn} 40%,transparent)` }} />
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

// ── EquityCurve — courbe d'évolution du capital (style PnlChart) ────────────────
// Couleur unique pilotée par le résultat de la SESSION la plus récente (vert si
// le jour du dernier trade finit positif, rouge sinon), rendue en dégradé + info
// par trade au survol. Pas de ligne du haut/bas ni de ligne zéro pointillée ;
// seuls les montants restent dans la gouttière de gauche.
function EquityCurve({ trades }: { trades: JournalTrade[] }) {
  const C = useContext(ThemeCtx)
  const [hover, setHover] = useState<number | null>(null)
  const GREEN = '#3cc87a', RED = '#dc503c'

  const sorted = [...trades]
    .filter(t => t.pnl != null)
    .sort((a, b) => new Date(a.exit_time ?? a.entry_time).getTime() - new Date(b.exit_time ?? b.entry_time).getTime())

  if (sorted.length < 2) {
    return <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic', padding: '24px 0' }}>Pas encore assez de trades fermés pour tracer la courbe.</div>
  }

  const fmtDT = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const fmtD = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

  // Points cumulés, ancrés à €0 au départ (pas de marqueur sur l'origine).
  const pts: { v: number; pnl: number | null; sym: string | null; dir: string | null; t: string }[] =
    [{ v: 0, pnl: null, sym: null, dir: null, t: '—' }]
  let cum = 0
  for (const tr of sorted) {
    cum += tr.pnl ?? 0
    pts.push({ v: cum, pnl: tr.pnl ?? null, sym: tr.symbol, dir: tr.direction, t: fmtDT(tr.exit_time ?? tr.entry_time) })
  }

  // Couleur = tendance des 3 dernières sessions : on additionne le résultat net
  // des 3 derniers jours de trading ; vert si la moyenne penche positif, rouge
  // si elle penche négatif. (Bucket de jour en epoch → tri numérique fiable.)
  const dayResults = new Map<number, number>()
  for (const t of sorted) {
    const d = new Date(t.exit_time ?? t.entry_time)
    const key = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
    dayResults.set(key, (dayResults.get(key) ?? 0) + (t.pnl ?? 0))
  }
  const last3 = [...dayResults.keys()].sort((a, b) => a - b).slice(-3)
  const trend = last3.reduce((a, k) => a + (dayResults.get(k) ?? 0), 0)
  const eqCol = trend > 0 ? GREEN : trend < 0 ? RED : C.tm

  const W = 600, H = 150, PXL = 46, PXR = 10, PYT = 12, PYB = 22
  const DW = W - PXL - PXR, DH = H - PYT - PYB
  const vals = pts.map(p => p.v)
  const rawMin = Math.min(0, ...vals), rawMax = Math.max(0, ...vals)
  const rawRange = rawMax - rawMin || 1
  const grace = rawRange * 0.08
  const minV = rawMin - grace, maxV = rawMax + grace
  const range = maxV - minV
  const n = pts.length
  const xOf = (i: number) => PXL + (i / (n - 1)) * DW
  const yOf = (v: number) => PYT + DH - ((v - minV) / range) * DH
  const y0 = yOf(0)
  const zf = Math.max(0, Math.min(1, (y0 - PYT) / DH))   // fraction du zéro → bascule du dégradé

  const xyPts = pts.map((p, i) => [xOf(i), yOf(p.v)] as [number, number])
  const polyPoints = xyPts.map(([x, y]) => `${x},${y}`).join(' ')
  const fillPath = `M${xyPts[0][0]} ${xyPts[0][1]} ${xyPts.slice(1).map(([x, y]) => `L${x} ${y}`).join(' ')} L${xOf(n - 1)} ${y0} L${xOf(0)} ${y0} Z`

  // Ticks Y « ronds », équidistants, dans la zone visible.
  const yTicks = (() => {
    if (rawRange < 1) return [0]
    const roughStep = rawRange / 3
    const mag = Math.pow(10, Math.floor(Math.log10(roughStep)))
    const norm = roughStep / mag
    const stp = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag
    const start = Math.ceil(minV / stp) * stp, end = Math.floor(maxV / stp) * stp
    const ticks: number[] = []
    for (let v = start; v <= end + stp * 0.001; v += stp) ticks.push(Math.round(v))
    return ticks.filter((v, i, a) => a.indexOf(v) === i)
  })()
  const fmtY = (v: number) => v === 0 ? '€0' : `${v > 0 ? '+' : '-'}€${Math.abs(v).toFixed(0)}`

  // Survol/scrub : à la souris, on n'affiche l'info que si le curseur est sur la
  // ligne ou dans l'aplat ; au doigt (mobile), on suit simplement la position X
  // (la bande verticale est ignorée → le tooltip déroule pendant le glissement).
  const locate = (clientX: number, clientY: number, rect: DOMRect, isTouch: boolean) => {
    if (rect.width === 0 || rect.height === 0) return
    const xVB = ((clientX - rect.left) / rect.width) * W
    const yVB = ((clientY - rect.top) / rect.height) * H
    if (xVB < PXL || xVB > W - PXR) { setHover(null); return }
    const fi = Math.max(0, Math.min(n - 1, ((xVB - PXL) / DW) * (n - 1)))
    if (!isTouch) {
      if (yVB < PYT || yVB > H - PYB) { setHover(null); return }
      const i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1)
      const yCurve = yOf(pts[i0].v) + (yOf(pts[i1].v) - yOf(pts[i0].v)) * (fi - i0)
      const TOL = 6
      if (yVB < Math.min(yCurve, y0) - TOL || yVB > Math.max(yCurve, y0) + TOL) { setHover(null); return }
    }
    setHover(Math.round(fi))
  }
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => locate(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), false)
  const onTouch = (e: React.TouchEvent<HTMLDivElement>) => { const t = e.touches[0]; if (t) locate(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect(), true) }

  const hp = hover != null ? pts[hover] : null
  const hx = hover != null ? xOf(hover) : 0
  const hyV = hover != null ? yOf(pts[hover].v) : 0

  return (
    <div style={{ height: H, marginTop: 6, position: 'relative', touchAction: 'pan-y' }}
      onMouseMove={onMove} onMouseLeave={() => setHover(null)}
      onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="none">
        <defs>
          {/* Aplat : dégradé d'une seule teinte, fort loin du zéro, estompé à la ligne du zéro. */}
          <linearGradient id="eq-fill" x1="0" y1={PYT} x2="0" y2={H - PYB} gradientUnits="userSpaceOnUse">
            <stop offset={0} stopColor={eqCol} stopOpacity="0.26" />
            <stop offset={zf} stopColor={eqCol} stopOpacity="0.02" />
            <stop offset={1} stopColor={eqCol} stopOpacity="0.26" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#eq-fill)" />
        <polyline points={polyPoints} fill="none" stroke={eqCol} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover != null && (
          <g pointerEvents="none">
            <line x1={hx} y1={PYT} x2={hx} y2={H - PYB} stroke={C.b3} strokeWidth={0.6} strokeDasharray="2 2" />
            <circle cx={hx} cy={hyV} r={2.8} fill={eqCol} stroke={C.sf} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      {/* Montants — gouttière de gauche, en HTML pour ne pas s'étirer */}
      {yTicks.map(v => (
        <div key={v} style={{ position: 'absolute', left: 0, width: PXL - 8, top: `${(Math.max(PYT, Math.min(H - PYB, yOf(v))) / H) * 100}%`, transform: 'translateY(-50%)', textAlign: 'right', fontSize: 9, fontFamily: SANS, color: C.te, lineHeight: 1 }}>{fmtY(v)}</div>
      ))}
      {/* Dates début / fin */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', paddingLeft: `${(PXL / W) * 100}%`, paddingRight: `${(PXR / W) * 100}%`, fontSize: 9, fontFamily: SANS, color: C.te }}>
        <span>{fmtD(sorted[0].exit_time ?? sorted[0].entry_time)}</span>
        <span>{fmtD(sorted[sorted.length - 1].exit_time ?? sorted[sorted.length - 1].entry_time)}</span>
      </div>
      {hp && (
        <div style={{
          position: 'absolute', left: `${Math.max(16, Math.min(84, (hx / W) * 100))}%`, top: `${(hyV / H) * 100}%`,
          transform: 'translate(-50%, calc(-100% - 9px))', pointerEvents: 'none', zIndex: 5,
          background: C.sf2, border: `.5px solid ${C.b2}`, borderRadius: 6, padding: '5px 8px',
          whiteSpace: 'nowrap', fontFamily: SANS, fontSize: 9.5, lineHeight: 1.5,
          boxShadow: '0 4px 14px rgba(0,0,0,.4)',
        }}>
          <div style={{ color: C.te, marginBottom: 1 }}>
            {hp.pnl == null ? 'Début de session' : `${hp.t} · ${hp.sym} ${hp.dir}`}
          </div>
          {hp.pnl != null && (
            <div><span style={{ color: C.te }}>Trade </span><span style={{ color: hp.pnl > 0 ? GREEN : hp.pnl < 0 ? RED : C.tm }}>{fmtY(hp.pnl)}</span></div>
          )}
          <div><span style={{ color: C.te }}>Cumul </span><span style={{ color: C.tm }}>{fmtY(hp.v)}</span></div>
        </div>
      )}
    </div>
  )
}

// ── AnalyticsPanel ─────────────────────────────────────────────────────────────
function AnalyticsPanel({ sessions: sessionsAll, todayAlerts, journalTrades: journalTradesAll, accountSize, allTimePatterns, plan, propFirm, propFirmStart }: { sessions: DaySession[]; todayAlerts: AlertRow[]; journalTrades: JournalTrade[]; accountSize: number; allTimePatterns?: Record<string, number>; plan?: string; propFirm?: string | null; propFirmStart?: string | null }) {
  const C = useContext(ThemeCtx)
  // On affiche TOUJOURS la page — même sans aucune donnée. Chaque sous-bloc a son
  // propre état vide (placeholders), donc la structure reste lisible à zéro trade.

  // Mode prop firm : on scope toutes les métriques aux données depuis le démarrage du
  // compte prop firm (les données « repartent à 0 » à l'activation). Hors mode = tout.
  const inProp = !!(propFirm && propFirmStart)
  const sessions = inProp ? sessionsAll.filter(s => (s.date || '') >= propFirmStart!) : sessionsAll
  const journalTrades = inProp ? journalTradesAll.filter(t => (t.entry_time || '').slice(0, 10) >= propFirmStart!) : journalTradesAll
  // Ambiance prop firm : pas de contour coloré, seulement le filet lumineux du haut
  // (appliqué à TOUTES les cartes via la classe .ana-prop + .cflux, cf. <style> global).
  const ambBd = C.b
  const ambLn = inProp ? 'rgba(124,58,237,.9)' : C.b3

  const totalPnl = sessions.reduce((s, d) => s + d.pnl, 0)
  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((s, d) => s + d.score, 0) / sessions.length) : 0
  const sessionsAbove80 = sessions.filter(d => d.score >= 80).length
  const sessionsCritical = sessions.filter(d => d.score < 40).length
  const allAlerts = [...sessions.flatMap(d => d.alerts), ...todayAlerts.map(a => ({ type: a.type ?? '', level: a.level ?? 1 }))]

  // Patterns déclenchés sur TOUTE la durée (compteurs all-time fournis par le serveur),
  // sinon repli sur la fenêtre chargée (30 j).
  const winCounts: Record<string, number> = {}
  for (const a of allAlerts) {
    const t = a.type ?? ''
    if (t) winCounts[t] = (winCounts[t] ?? 0) + 1
  }
  // En mode prop firm, on ignore les compteurs all-time (non scopés) au profit des
  // alertes de la fenêtre déjà filtrée depuis le démarrage du compte.
  const patternCounts = (!inProp && allTimePatterns && Object.keys(allTimePatterns).length) ? allTimePatterns : winCounts
  const allPatternEntries = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])
  // Pro : 5 schémas max · Max : tous.
  const patIsMax = isMaxPlan(plan)
  const patterns = allPatternEntries.slice(0, patIsMax ? 12 : 3)
  const hiddenPatterns = patIsMax ? 0 : Math.max(0, allPatternEntries.length - 3)
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

  // ── Journal de trading (métriques trade-level, 30j + aujourd'hui) ──────────────
  const jt = journalTrades.filter(t => t.pnl != null)
  const nJ = jt.length
  const jWins = jt.filter(t => (t.pnl ?? 0) > 0)
  const jLosses = jt.filter(t => (t.pnl ?? 0) < 0)
  const grossProfit = jWins.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const grossLoss = Math.abs(jLosses.reduce((s, t) => s + (t.pnl ?? 0), 0))
  const jWinRate = nJ > 0 ? Math.round((jWins.length / nJ) * 100) : 0
  const avgWin = jWins.length > 0 ? grossProfit / jWins.length : 0
  const avgLoss = jLosses.length > 0 ? grossLoss / jLosses.length : 0
  const payoff = avgLoss > 0 ? avgWin / avgLoss : 0
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0)
  const expectancy = nJ > 0 ? (grossProfit - grossLoss) / nJ : 0  // €/trade attendu
  const best = jt.reduce<JournalTrade | null>((m, t) => (m == null || (t.pnl ?? 0) > (m.pnl ?? 0)) ? t : m, null)
  const worst = jt.reduce<JournalTrade | null>((m, t) => (m == null || (t.pnl ?? 0) < (m.pnl ?? 0)) ? t : m, null)
  const longs = jt.filter(t => t.direction === 'long')
  const shorts = jt.filter(t => t.direction === 'short')
  const wr = (arr: JournalTrade[]) => arr.length > 0 ? Math.round(arr.filter(t => (t.pnl ?? 0) > 0).length / arr.length * 100) : 0
  // Par symbole : PnL et nb de trades
  const bySymbol = Object.entries(jt.reduce<Record<string, { pnl: number; n: number }>>((acc, t) => {
    const k = (t.symbol || '—').toUpperCase()
    acc[k] = acc[k] || { pnl: 0, n: 0 }
    acc[k].pnl += (t.pnl ?? 0); acc[k].n += 1
    return acc
  }, {})).sort((a, b) => b[1].pnl - a[1].pnl)
  const fmtPF = (v: number) => v === Infinity ? '∞' : v.toFixed(2)
  // Courbe d'equity trade-par-trade + max drawdown (sur l'equity réalisée)
  const jSorted = [...jt].sort((a, b) => new Date(a.exit_time ?? a.entry_time).getTime() - new Date(b.exit_time ?? b.entry_time).getTime())
  let cum = 0, peak = 0, maxDD = 0
  const equity = jSorted.map(t => { cum += t.pnl ?? 0; if (cum > peak) peak = cum; if (peak - cum > maxDD) maxDD = peak - cum; return cum })
  // Vert/rouge CIBLÉ : réservé aux valeurs P&L chiffrées et à la courbe d'equity.
  // Tout le reste (barres, donut, jauges) reste neutre/accent — anti-saturation.
  // La direction/magnitude d'une barre porte déjà le signe, pas besoin de la colorer.
  const GREEN = C.g, RED = '#e0503c'
  const pnlCol = (v: number) => v > 0 ? GREEN : v < 0 ? RED : C.tm
  const BAR = C.b3            // barres neutres
  const symMaxAbs = Math.max(1, ...bySymbol.map(([, d]) => Math.abs(d.pnl)))
  // Données des diagrammes additionnels
  const dowPnl = [0, 1, 2, 3, 4].map(i => (byDow[i] ?? []).reduce((a, d) => a + d.pnl, 0))
  const longPnl = longs.reduce((a, t) => a + (t.pnl ?? 0), 0)
  const shortPnl = shorts.reduce((a, t) => a + (t.pnl ?? 0), 0)

  // ── Statistiques de journal supplémentaires ──────────────────────────────────
  const maxDDpct = accountSize > 0 ? (maxDD / accountSize) * 100 : 0

  return (
    <div className={inProp ? 'ana-prop' : undefined} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>

      {/* Header */}
      <div style={{ padding: '18px 24px 16px', borderBottom: `.5px solid ${ambBd}`, flexShrink: 0 }}>
        {inProp && <div style={{ marginBottom: 6 }}><PropFirmChip start={propFirmStart} /></div>}
        <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.4, color: C.tx }}>Analytics</div>
        <div style={{ fontSize: 12, color: C.te, marginTop: 3 }}>{sessions.length > 0 ? `${inProp ? 'Compte prop firm — ' : ''}Données sur les ${sessions.length} dernières sessions` : inProp ? 'Compte prop firm tout juste démarré — les métriques repartent de zéro' : 'Aucune session encore — tes métriques se rempliront au fil de tes trades'}</div>
      </div>

    <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>

      {/* Bandeau unique : chiffres clés du journal. R:R placé juste après Drawdown max
          → sur mobile (2 par rangée) plus de case vide ; desktop en 4 par rangée. */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flexShrink: 0 }}>
        {([
          { type: 'val', val: fmtEur(grossProfit - grossLoss), lbl: 'P&L net', hint: `${nJ} trades`, col: pnlCol(grossProfit - grossLoss) },
          { type: 'donut', lbl: 'Win rate', frac: jWinRate, sub: `${jWins.length}G / ${jLosses.length}P` },
          { type: 'val', val: fmtPF(profitFactor), lbl: 'Profit factor', hint: 'gains ÷ pertes', col: C.tx },
          { type: 'val', val: fmtEur(expectancy), lbl: 'Gain attendu', hint: 'par trade', col: C.tx },
          { type: 'val', val: fmtEur(-maxDD), lbl: 'Drawdown max', hint: maxDD > 0 ? `−${maxDDpct.toFixed(1)}% du capital` : 'pire creux', col: C.tm },
          { type: 'val', val: avgLoss > 0 ? fmtPF(payoff) : '—', lbl: 'R:R réalisé', hint: 'gain ÷ perte', col: C.tx },
          { type: 'val', val: jWins.length > 0 ? fmtEur(avgWin) : '—', lbl: 'Gain moyen', hint: `${jWins.length} gagnants`, col: C.tx, arrow: jWins.length > 0 ? 'up' : null },
          { type: 'val', val: jLosses.length > 0 ? fmtEur(-avgLoss) : '—', lbl: 'Perte moyenne', hint: `${jLosses.length} perdants`, col: C.tx, arrow: jLosses.length > 0 ? 'down' : null },
        ] as any[]).map((it, i) => (
          <div key={i} style={{ background: C.sf, border: `.5px solid ${ambBd}`, borderRadius: 12, padding: '15px 17px', position: 'relative', overflow: 'hidden', display: it.type === 'donut' ? 'flex' : 'block', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${ambLn} 40%,transparent)` }} />
            {it.type === 'donut' ? (
              <>
                {(() => {
                  const r = 17, circ = 2 * Math.PI * r
                  return (
                    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
                      <circle cx="22" cy="22" r={r} fill="none" stroke={C.b2} strokeWidth="5" />
                      <circle cx="22" cy="22" r={r} fill="none" stroke={C.red} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={`${circ * (it.frac / 100)} ${circ}`} transform="rotate(-90 22 22)" />
                    </svg>
                  )
                })()}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: C.te, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: SANS, marginBottom: 4 }}>{it.lbl}</div>
                  <div style={{ fontSize: 21, fontWeight: 300, letterSpacing: -1, lineHeight: 1, color: C.tm }}>{it.frac}%</div>
                  <div style={{ fontSize: 10, color: C.td, marginTop: 4 }}>{it.sub}</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 9, color: C.te, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: SANS, marginBottom: 8 }}>{it.lbl}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 25, fontWeight: 300, letterSpacing: -1, lineHeight: 1, color: it.col }}>{it.val}</span>
                  {it.arrow === 'up' && <span style={{ fontSize: 14, lineHeight: 1, color: GREEN }}>↑</span>}
                  {it.arrow === 'down' && <span style={{ fontSize: 14, lineHeight: 1, color: RED }}>↓</span>}
                </div>
                <div style={{ fontSize: 10, color: C.td, marginTop: 5 }}>{it.hint}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Grande courbe d'evolution du capital (trade par trade) */}
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3 }}>Évolution du capital</div>
        </div>
        <EquityCurve trades={jt} />
      </div>

      {/* Détails : Par instrument | Comportement */}
      <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>

        {/* Par instrument */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.td, letterSpacing: .3 }}>Par instrument</div>
            <div style={{ fontSize: 9.5, color: C.te, fontFamily: SANS }}>barre = ampleur du P&L</div>
          </div>
          {bySymbol.length === 0 ? (
            <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic' }}>Aucun trade fermé.</div>
          ) : bySymbol.slice(0, 6).map(([sym, d]) => (
            <div key={sym} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.td, fontFamily: SANS }}>{sym} <span style={{ color: C.te }}>· {d.n} tr.</span></span>
                <span style={{ fontSize: 12, fontFamily: SANS, color: C.tx, fontWeight: 600 }}>{fmtEur(d.pnl)}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.abs(d.pnl) / symMaxAbs * 100}%`, background: BAR, borderRadius: 3 }} />
              </div>
            </div>
          ))}
          <div style={{ height: 6 }} />
          {([
            { k: 'Meilleur trade', v: best ? `${fmtEur(best.pnl ?? 0)} · ${best.symbol}` : '—', col: C.tx },
            { k: 'Pire trade', v: worst ? `${fmtEur(worst.pnl ?? 0)} · ${worst.symbol}` : '—', col: C.tx },
          ] as any[]).map(({ k, v, col }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
              <span style={{ fontSize: 12.5, color: C.td }}>{k}</span>
              <span style={{ fontSize: 12.5, fontFamily: SANS, color: col, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Comportement */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.td, letterSpacing: .3 }}>Comportement</div>
            <div style={{ fontSize: 10.5, color: C.te, fontFamily: SANS }}>score moy. <span style={{ color: scoreColor(avgScore, C), fontWeight: 600 }}>{avgScore}</span></div>
          </div>
          <div style={{ fontSize: 9.5, color: C.te, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: SANS, marginBottom: 10 }}>Score moyen par jour</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, marginBottom: 16 }}>
            {dayNames.map((name, i) => {
              const ds = byDow[i] ?? []
              const avg = ds.length > 0 ? Math.round(ds.reduce((s, d) => s + d.score, 0) / ds.length) : null
              const col = avg !== null ? scoreColor(avg, C) : C.te
              const dbg = avg !== null ? (avg >= 70 ? 'rgba(0,209,122,' : avg >= 40 ? 'rgba(255,171,0,' : 'rgba(255,90,61,') : 'rgba(255,255,255,'
              return (
                <div key={name} style={{ borderRadius: 7, height: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: `${dbg}.09)`, border: `.5px solid ${dbg}.22)` }}>
                  <span style={{ fontSize: 13, fontFamily: SANS, fontWeight: 500, color: col }}>{avg ?? '—'}</span>
                  <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.3)', fontFamily: SANS }}>{name}</span>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 9.5, color: C.te, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: SANS, marginBottom: 10 }}>Patterns déclenchés</div>
          {patterns.length === 0 ? (
            <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic' }}>Aucun pattern — excellent travail.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {patterns.map(([type, count]) => {
                const pct = Math.round((count / maxCount) * 100)
                const col = pct >= 60 ? C.red : pct >= 30 ? C.o : C.b3
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span title={alertLabel(type)} style={{ fontSize: 12, color: C.td, width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{alertLabel(type)}</span>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, color: C.tm, fontFamily: SANS, width: 28, textAlign: 'right' as const, fontWeight: 500 }}>{count}×</span>
                  </div>
                )
              })}
            </div>
          )}
          {hiddenPatterns > 0 && (
            <div style={{ fontSize: 11, color: C.te, marginTop: 10, fontStyle: 'italic' }}>
              + {hiddenPatterns} autre{hiddenPatterns > 1 ? 's' : ''} schéma{hiddenPatterns > 1 ? 's' : ''} · visibles avec le plan <span style={{ color: C.tm }}>Max</span>
            </div>
          )}
        </div>
      </div>

      {/* Long vs Short | PnL par jour de semaine */}
      <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flexShrink: 0 }}>
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 16 }}>Long vs Short</div>
          {(() => {
            const m = Math.max(1, Math.abs(longPnl), Math.abs(shortPnl))
            const rows = [
              { k: 'Long', pnl: longPnl, w: wr(longs), n: longs.length },
              { k: 'Short', pnl: shortPnl, w: wr(shorts), n: shorts.length },
            ]
            return rows.map(r => (
              <div key={r.k} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, color: C.td }}>{r.k} <span style={{ color: C.te, fontFamily: SANS }}>· {r.w}% · {r.n} tr.</span></span>
                  <span style={{ fontSize: 12.5, fontFamily: SANS, color: pnlCol(r.pnl), fontWeight: 600 }}>{fmtEur(r.pnl)}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.abs(r.pnl) / m * 100}%`, background: BAR, borderRadius: 4 }} />
                </div>
              </div>
            ))
          })()}
        </div>
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
          <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 16 }}>PnL par jour de semaine</div>
          {(() => {
            const m = Math.max(1, ...dowPnl.map(v => Math.abs(v)))
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, alignItems: 'end', height: 100 }}>
                {dayNames.map((name, i) => {
                  const v = dowPnl[i], h = Math.abs(v) / m * 60, up = v >= 0
                  return (
                    <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <span style={{ fontSize: 9, fontFamily: SANS, color: pnlCol(v), marginBottom: 3 }}>{v >= 0 ? '+' : ''}{Math.round(v)}</span>
                      <div style={{ width: '66%', height: Math.max(2, h), background: up ? GREEN : RED, borderRadius: 2, opacity: 0.9 }} />
                      <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.3)', fontFamily: SANS, marginTop: 5 }}>{name}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

    </div>
    </div>
  )
}

// ── RapportsPanel ──────────────────────────────────────────────────────────────
function RapportsPanel({ plan, onUpgrade }: { plan: string; onUpgrade: () => void }) {
  const C = useContext(ThemeCtx)
  const [loading, setLoading] = useState<string | null>(null)
  const isMax = isMaxPlan(plan)

  const toISODate = (d: Date) => d.toISOString().split('T')[0]

  function getWeekMonday(offsetWeeks = 0): Date {
    const now = new Date()
    const dow = now.getDay()
    const diff = dow === 0 ? -6 : 1 - dow
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff + offsetWeeks * 7)
    monday.setHours(0, 0, 0, 0)
    return monday
  }
  function frWeekLabel(monday: Date): string {
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
    const fmtStart = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const fmtEnd = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${fmtStart} – ${fmtEnd}`
  }
  const getMonthStart = (offsetMonths = 0) => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1)
  }
  const toISOMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const frMonthLabel = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  async function download(key: string, query: string, filename: string) {
    setLoading(key)
    try {
      const res = await fetch(`/api/report/weekly?${query}`)
      if (!res.ok) throw new Error('Erreur génération PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent — user can retry
    } finally {
      setLoading(null)
    }
  }

  const months = [getMonthStart(-1), getMonthStart(-2), getMonthStart(-3)]
  const weeks = [getWeekMonday(-1), getWeekMonday(-2), getWeekMonday(-3), getWeekMonday(-4)]

  const sectionTitle: React.CSSProperties = { fontSize: 10, letterSpacing: 1, color: C.td, textTransform: 'uppercase', fontFamily: SANS, marginBottom: 2 }

  function ReportRow({ icon, title, sub, k, query, filename }: { icon: string; title: string; sub: string; k: string; query: string; filename: string }) {
    const isLoading = loading === k
    return (
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
        <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
        <div style={{ width: 42, height: 42, borderRadius: 10, background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 400, color: C.tx, marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 11, color: C.td }}>{sub}</div>
        </div>
        <button onClick={() => download(k, query, filename)} disabled={isLoading} style={{
          fontSize: 11, padding: '7px 16px', borderRadius: 8, fontFamily: SANS, whiteSpace: 'nowrap',
          cursor: isLoading ? 'default' : 'pointer', background: isLoading ? 'rgba(124,58,237,.05)' : C.rd,
          border: `.5px solid ${C.rb}`, color: isLoading ? C.td : C.red, transition: 'all .18s', opacity: isLoading ? .6 : 1,
        }}>
          {isLoading ? 'Génération…' : 'Télécharger PDF'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 26px 16px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.4, color: C.tx }}>Rapports PDF</div>
        <div style={{ fontSize: 12, color: C.te, marginTop: 3 }}>Score, PnL, alertes comportementales, journal des trades — généré à la demande.</div>
      </div>
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1 }}>

      {/* Rapports mensuels — inclus dès le plan Pro */}
      <div style={sectionTitle}>Mensuels</div>
      {months.map((d, i) => (
        <ReportRow key={`m${i}`} icon="📅"
          title={frMonthLabel(d)}
          sub={i === 0 ? 'Mois précédent' : `Il y a ${i + 1} mois`}
          k={`month-${toISOMonth(d)}`}
          query={`period=month&month=${toISOMonth(d)}`}
          filename={`caldra-rapport-mensuel-${toISOMonth(d)}.pdf`}
        />
      ))}

      {/* Rapports hebdomadaires — plan Max */}
      <div style={{ ...sectionTitle, marginTop: 10 }}>Hebdomadaires</div>
      {isMax ? (
        weeks.map((monday, i) => (
          <ReportRow key={`w${i}`} icon="📋"
            title={frWeekLabel(monday)}
            sub={i === 0 ? 'Semaine précédente' : `Il y a ${i + 1} semaines`}
            k={`week-${toISODate(monday)}`}
            query={`period=week&week_start=${toISODate(monday)}`}
            filename={`caldra-rapport-hebdo-${toISODate(monday)}.pdf`}
          />
        ))
      ) : (
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 12.5, color: C.td, flex: 1 }}>
            Les rapports <span style={{ color: C.tx }}>hebdomadaires</span> sont inclus dans le plan <span style={{ color: C.tx }}>Max</span> — un suivi plus rapproché, semaine après semaine.
          </div>
          <button onClick={onUpgrade} style={{ fontSize: 12, padding: '8px 16px', borderRadius: 8, fontFamily: SANS, fontWeight: 500, cursor: 'pointer', background: C.red, border: 'none', color: '#fff', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
            Passer à Max
          </button>
        </div>
      )}
    </div>
    </div>
  )
}

// ── IntegrationsPanel ──────────────────────────────────────────────────────────
function IntegrationsPanel({ apiKeyPrefix, initialWebhook, ctraderConn, setCtraderConn, ctraderConflict, ctraderPending, userId, lastTradeAt, plan, initialTgToken, initialTgChat, propFirmStart }: { apiKeyPrefix: string | null; initialWebhook: string | null; ctraderConn: boolean; setCtraderConn: (v: boolean) => void; ctraderConflict?: boolean; ctraderPending?: boolean; userId: string; lastTradeAt: string | null; plan?: string; initialTgToken?: string | null; initialTgChat?: string | null; propFirmStart?: string | null }) {
  const C = useContext(ThemeCtx)

  // Indicateur de santé : « est-ce que Caldra reçoit bien tes trades ? »
  const health = (() => {
    if (!lastTradeAt) return { dot: 'rgba(255,255,255,.18)', color: C.te, text: "Aucun trade reçu pour l'instant. Connecte une plateforme ci-dessous, puis fais (ou attends) un trade." }
    const diffMs = Date.now() - new Date(lastTradeAt).getTime()
    const mins = Math.floor(diffMs / 60000)
    const rel = mins < 1 ? "à l'instant" : mins < 60 ? `il y a ${mins} min` : mins < 1440 ? `il y a ${Math.floor(mins / 60)} h` : `il y a ${Math.floor(mins / 1440)} j`
    return diffMs < 86_400_000
      ? { dot: C.g, color: C.g, text: `Données actives · dernier trade reçu ${rel}.` }
      : { dot: '#f59e0b', color: '#f59e0b', text: `Dernier trade reçu ${rel}. Si tu trades en ce moment, vérifie que ta plateforme (ou ton EA) tourne bien.` }
  })()
  const [prefix, setPrefix]     = useState(apiKeyPrefix)
  const [newKey, setNewKey]     = useState<string|null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyConfirm, setKeyConfirm] = useState(false)
  const hasKey = !!prefix
  const [webhookUrl, setWebhookUrl] = useState(initialWebhook ?? '')
  const [tgToken, setTgToken] = useState(initialTgToken ?? '')
  const [tgChat, setTgChat] = useState(initialTgChat ?? '')
  const intIsMax = isMaxPlan(plan)
  const notifInp: React.CSSProperties = { width: '100%', background: C.bg, border: `.5px solid ${C.b2}`, borderRadius: 8, padding: '10px 13px', color: C.tx, fontSize: 12.5, fontFamily: SANS, outline: 'none', boxSizing: 'border-box' }

  const [webhookSave, setWebhookSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [ctDisconnecting, setCtDisconnecting] = useState(false)

  // Statut cTrader live : l'état serveur est figé au chargement de la page. Tant
  // que ce n'est pas résolu (ni connecté ni conflit), on poll pour faire basculer
  // "connexion en cours" → "connecté" ou "conflit" sans rafraîchir la page.
  const [ctLive, setCtLive] = useState<{ connected: boolean; pending: boolean; conflict: boolean }>(
    { connected: ctraderConn, pending: !!ctraderPending, conflict: !!ctraderConflict }
  )
  useEffect(() => {
    setCtLive({ connected: ctraderConn, pending: !!ctraderPending, conflict: !!ctraderConflict })
  }, [ctraderConn, ctraderPending, ctraderConflict])
  useEffect(() => {
    // On arrête de poller UNIQUEMENT une fois connecté. En conflit OU en attente,
    // on continue : si le conflit se libère côté worker (l'autre compte se
    // déconnecte), le dashboard bascule en "connecté" en live, sans refresh.
    if (ctLive.connected) return
    const supabase = createClient()
    let alive = true
    const poll = async () => {
      const { data } = await supabase.from('ctrader_accounts').select('ctid_trader_account_id,status').eq('user_id', userId)
      if (!alive || !data) return
      const conflict = data.some((r: any) => r.status === 'conflict')
      const resolved = data.some((r: any) => r.ctid_trader_account_id != null)
      const connected = resolved && !conflict
      setCtLive({ connected, pending: data.length > 0 && !resolved && !conflict, conflict })
      if (connected) setCtraderConn(true)
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [ctLive.connected, setCtraderConn])

  async function disconnectCtrader() {
    setCtDisconnecting(true)
    await fetch('/api/ctrader/disconnect', { method: 'POST' })
    setCtraderConn(false)
    setCtLive({ connected: false, pending: false, conflict: false })
    setCtDisconnecting(false)
  }

  // ── Tradovate (futures) — statut live auto-contenu (même logique que cTrader) ──
  const [tvLive, setTvLive] = useState<{ connected: boolean; pending: boolean }>({ connected: false, pending: false })
  const [tvDisconnecting, setTvDisconnecting] = useState(false)
  useEffect(() => {
    if (tvLive.connected) return
    const supabase = createClient()
    let alive = true
    const poll = async () => {
      const { data } = await supabase.from('tradovate_accounts').select('tradovate_account_id').eq('user_id', userId)
      if (!alive || !data) return
      const resolved = data.some((r: any) => r.tradovate_account_id != null)
      setTvLive({ connected: resolved, pending: data.length > 0 && !resolved })
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [tvLive.connected, userId])

  async function disconnectTradovate() {
    setTvDisconnecting(true)
    await fetch('/api/tradovate/disconnect', { method: 'POST' })
    setTvLive({ connected: false, pending: false })
    setTvDisconnecting(false)
  }

  // ── MT5 par identifiants (worker Python) ──────────────────────────────────
  const [mt5Status, setMt5Status] = useState<string | null>(null)   // null | pending | connected | auth_failed | error | broker_unavailable
  const [mt5Has, setMt5Has] = useState(false)                        // une connexion existe en base
  const [mt5Info, setMt5Info] = useState<{ login: string; server: string } | null>(null)
  const [mt5Saving, setMt5Saving] = useState(false)
  useEffect(() => {
    const supabase = createClient()
    let alive = true
    const poll = async () => {
      const { data } = await supabase.from('mt5_accounts').select('status, mt5_login, mt5_server').eq('user_id', userId)
      if (!alive || !data) return
      setMt5Has(data.length > 0)
      setMt5Status(data.length > 0 ? (data[0] as any).status ?? 'pending' : null)
      setMt5Info(data.length > 0 ? { login: (data[0] as any).mt5_login, server: (data[0] as any).mt5_server } : null)
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [userId])

  async function disconnectMt5() {
    setMt5Saving(true)
    await fetch('/api/mt5/disconnect', { method: 'POST' })
    setMt5Has(false); setMt5Status(null); setMt5Info(null)
    setMt5Saving(false)
  }

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
        body: JSON.stringify({ ...current, slack_webhook_url: webhookUrl || null, telegram_bot_token: (intIsMax && tgToken) || null, telegram_chat_id: (intIsMax && tgChat) || null }),
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 26px 16px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        {propFirmStart && <div style={{ marginBottom: 6 }}><PropFirmChip start={propFirmStart} /></div>}
        <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.4, color: C.tx }}>Intégrations</div>
        <div style={{ fontSize: 12, color: C.te, marginTop: 3 }}>Connectez vos plateformes de trading — les trades seront analysés automatiquement.</div>
      </div>
    <div style={{ padding: 26, overflowY: 'auto', flex: 1 }}>

      {/* ── Indicateur de santé de connexion ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 10, padding: '11px 15px', marginBottom: 16 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: health.dot, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: health.color, lineHeight: 1.5 }}>{health.text}</div>
      </div>

      {/* ── Clé API ── */}
      <IntCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
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
            <code style={{ color: C.tm, fontSize: 12, fontFamily: SANS }}>
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
              <code style={{ flex: 1, color: 'rgba(134,239,172,.85)', fontSize: 11, fontFamily: SANS, wordBreak: 'break-all' as const, background: 'rgba(16,185,129,.04)', padding: '7px 10px', borderRadius: 5, border: '.5px solid rgba(16,185,129,.14)' }}>{newKey}</code>
              <button onClick={copyKey} style={{ padding: '7px 12px', background: 'rgba(16,185,129,.09)', border: '.5px solid rgba(16,185,129,.22)', borderRadius: 5, color: 'rgba(16,185,129,.8)', fontSize: 9, fontFamily: SANS, cursor: 'pointer', letterSpacing: 1, flexShrink: 0 }}>{keyCopied ? '✓ Copié' : 'Copier'}</button>
            </div>
          </div>
        )}

      </IntCard>

      {/* ── Plateformes ── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.te, textTransform: 'uppercase' as const, marginBottom: 12 }}>Plateformes</div>
        <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>

          {/* MetaTrader 5 — connexion par identifiants (page dédiée) */}
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: C.tm, fontFamily: SANS, flexShrink: 0 }}>MT5</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>MetaTrader 5</div>
                <div style={{ fontSize: 10.5, color: C.td }}>Vantage, IC Markets, XM, FTMO…</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: mt5Status === 'connected' ? C.g : mt5Status === 'auth_failed' || mt5Status === 'error' ? C.red : mt5Has ? C.o : C.b3, ...(mt5Has && mt5Status !== 'connected' && mt5Status !== 'auth_failed' && mt5Status !== 'error' && mt5Status !== 'broker_unavailable' ? { animation: 'pulse 1.5s infinite' } : {}) }} />
                <span style={{ fontSize: 10, color: mt5Status === 'connected' ? C.g : mt5Status === 'auth_failed' || mt5Status === 'error' ? C.red : mt5Has ? C.o : C.td, letterSpacing: .5 }}>
                  {mt5Status === 'connected' ? 'CONNECTÉ' : mt5Status === 'auth_failed' ? 'IDENTIFIANTS REFUSÉS' : mt5Status === 'error' ? 'ERREUR' : mt5Status === 'broker_unavailable' ? 'BROKER BIENTÔT DISPONIBLE' : mt5Has ? 'EN ATTENTE…' : 'NON CONNECTÉ'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: C.td, lineHeight: 1.65, marginBottom: 16 }}>
              {mt5Has
                ? (mt5Status === 'auth_failed'
                    ? 'Identifiants refusés par le broker. Reconnecte-toi avec les bons identifiants.'
                    : mt5Status === 'broker_unavailable'
                    ? 'Identifiants enregistrés. Ton broker n’est pas encore pris en charge — on l’active, tes trades remonteront automatiquement dès que c’est prêt.'
                    : 'Tes trades MT5 remontent automatiquement.')
                : 'Connecte ton compte avec tes identifiants — tes trades remontent automatiquement, sans rien à installer.'}
            </div>

            {mt5Has && mt5Info && (
              <div style={{ fontSize: 11, fontFamily: SANS, color: C.te, marginBottom: 12 }}>
                {mt5Info.login} · {mt5Info.server}
              </div>
            )}

            {mt5Has ? (
              <button
                onClick={disconnectMt5}
                disabled={mt5Saving}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 7, fontSize: 11, fontFamily: SANS, cursor: mt5Saving ? 'not-allowed' : 'pointer', background: 'transparent', border: `.5px solid ${C.b}`, color: C.td, transition: 'all .2s', opacity: mt5Saving ? .5 : 1 }}
              >
                {mt5Saving ? '…' : 'Déconnecter →'}
              </button>
            ) : (
              <a
                href="/connect/mt5"
                style={{ display: 'block', width: '100%', padding: '9px 10px', borderRadius: 7, fontSize: 11, fontFamily: SANS, textAlign: 'center' as const, textDecoration: 'none', background: C.rd, border: `.5px solid ${C.rb}`, color: C.red, transition: 'all .2s', boxSizing: 'border-box' as const }}
              >
                Se connecter →
              </a>
            )}
          </IntCard>

          {/* cTrader OAuth */}
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: SANS, flexShrink: 0 }}>CT</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>cTrader</div>
                <div style={{ fontSize: 10.5, color: C.td }}>Pepperstone, IC Markets, FxPro, Eightcap…</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: ctLive.conflict ? C.red : ctLive.connected ? C.g : ctLive.pending ? C.o : C.b3, ...(ctLive.pending ? { animation: 'pulse 1.5s infinite' } : {}) }} />
                <span style={{ fontSize: 10, color: ctLive.conflict ? C.red : ctLive.connected ? C.g : ctLive.pending ? C.o : C.td, letterSpacing: .5 }}>
                  {ctLive.conflict ? 'CONFLIT' : ctLive.connected ? 'CONNECTÉ' : ctLive.pending ? 'CONNEXION EN COURS…' : 'NON CONNECTÉ'}
                </span>
              </div>
            </div>

            {ctLive.conflict && (
              <div style={{ background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 7, padding: '9px 12px', marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, color: C.red, lineHeight: 1.5, fontWeight: 500 }}>
                  ⚠ Ce compte cTrader est déjà relié à un autre compte Caldra.
                </div>
                <div style={{ fontSize: 11, color: C.td, lineHeight: 1.5, marginTop: 4 }}>
                  Un compte de trading ne peut être connecté qu'à un seul compte Caldra. Déconnecte-le de l'autre compte, ou connecte un autre compte cTrader.
                </div>
              </div>
            )}

            <div style={{ fontSize: 11.5, color: C.td, lineHeight: 1.65, marginBottom: 16 }}>
              {ctLive.connected
                ? 'Tes trades cTrader remontent automatiquement via OAuth. Aucun bot à maintenir.'
                : 'Connexion OAuth one-click — les trades remontent automatiquement, sans bot à installer.'}
            </div>

            {ctLive.connected ? (
              <button
                onClick={disconnectCtrader}
                disabled={ctDisconnecting}
                style={{ width: '100%', padding: '9px 10px', borderRadius: 7, fontSize: 11, fontFamily: SANS, cursor: ctDisconnecting ? 'not-allowed' : 'pointer', background: 'transparent', border: `.5px solid ${C.b}`, color: C.td, transition: 'all .2s', opacity: ctDisconnecting ? .5 : 1 }}
              >
                {ctDisconnecting ? 'Déconnexion…' : 'Déconnecter →'}
              </button>
            ) : (
              <a
                href="/api/ctrader/connect"
                style={{ display: 'block', width: '100%', padding: '9px 10px', borderRadius: 7, fontSize: 11, fontFamily: SANS, textAlign: 'center' as const, textDecoration: 'none', background: C.rd, border: `.5px solid ${C.rb}`, color: C.red, transition: 'all .2s', boxSizing: 'border-box' as const }}
              >
                Se connecter →
              </a>
            )}
          </IntCard>

          {/* Tradovate */}
          <IntCard style={{ opacity: .5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: SANS, flexShrink: 0 }}>TRD</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>Tradovate</div>
                <div style={{ fontSize: 10.5, color: C.td }}>Futures US</div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontFamily: SANS, whiteSpace: 'nowrap' as const, background: 'rgba(255,255,255,.04)', border: `.5px solid ${C.b}`, color: C.td }}>Prochainement</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 7 }}>
              {(['Télécharge le script Caldra pour Tradovate.', 'Colle ta clé API dans les paramètres du script.', 'Lance le script — chaque trade est envoyé automatiquement.'] as string[]).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: C.red, fontFamily: SANS, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 11, color: C.td, lineHeight: 1.5 }}>{t}</div>
                </div>
              ))}
            </div>
          </IntCard>

        </div>
      </div>

      {/* ── Canaux d'alerte ── (section distincte des plateformes) */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.te, textTransform: 'uppercase' as const, marginBottom: 6 }}>Canaux</div>
        <div style={{ fontSize: 12, color: C.te, marginBottom: 12, lineHeight: 1.5 }}>Reçois tes alertes niveau 2 et 3 hors de l&apos;app.</div>
        <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>

          {/* Discord */}
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: SANS, flexShrink: 0 }}>DC</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>Discord</div>
                <div style={{ fontSize: 10.5, color: C.td }}>Webhook · tous les plans</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: webhookUrl ? C.g : C.b3 }} />
                <span style={{ fontSize: 10, color: webhookUrl ? C.g : C.td, letterSpacing: .5 }}>{webhookUrl ? 'CONFIGURÉ' : 'NON CONFIGURÉ'}</span>
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: C.td, lineHeight: 1.65, marginBottom: 12 }}>Colle l&apos;URL du webhook de ton salon Discord (Paramètres du salon → Intégrations → Webhooks).</div>
            <input style={notifInp} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/…" />
          </IntCard>

          {/* Telegram (Max) */}
          <IntCard style={{ opacity: intIsMax ? 1 : .55 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.tm, fontFamily: SANS, flexShrink: 0 }}>TG</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx, display: 'flex', alignItems: 'center', gap: 7 }}>
                  Telegram
                  {!intIsMax && <span style={{ fontSize: 8, letterSpacing: 1, color: C.red, border: `.5px solid ${C.red}55`, borderRadius: 4, padding: '1px 4px' }}>MAX</span>}
                </div>
                <div style={{ fontSize: 10.5, color: C.td }}>Bot · plan Max</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: (tgToken && tgChat) ? C.g : C.b3 }} />
                <span style={{ fontSize: 10, color: (tgToken && tgChat) ? C.g : C.td, letterSpacing: .5 }}>{(tgToken && tgChat) ? 'CONFIGURÉ' : 'NON CONFIGURÉ'}</span>
              </div>
            </div>
            <input style={notifInp} disabled={!intIsMax} value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="Bot token (créé via @BotFather)" />
            <input style={{ ...notifInp, marginTop: 8 }} disabled={!intIsMax} value={tgChat} onChange={e => setTgChat(e.target.value)} placeholder="Chat ID (obtenu via @userinfobot)" />
            {!intIsMax && <div style={{ fontSize: 11, color: C.te, marginTop: 8 }}>Le canal Telegram est inclus dans le plan Max.</div>}
          </IntCard>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button onClick={saveWebhook} disabled={webhookSave === 'saving'} style={{ padding: '9px 20px', background: C.red, border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontFamily: SANS, cursor: webhookSave === 'saving' ? 'not-allowed' : 'pointer', opacity: webhookSave === 'saving' ? .6 : 1 }}>
            {webhookSave === 'saving' ? 'Enregistrement…' : 'Enregistrer les canaux'}
          </button>
          {webhookSave === 'saved' && <span style={{ fontSize: 11, color: C.g }}>✓ Enregistré</span>}
          {webhookSave === 'error' && <span style={{ fontSize: 11, color: C.red }}>Erreur — réessaie</span>}
        </div>
      </div>

    </div>
    </div>
  )
}

// ── ReglesPanel ────────────────────────────────────────────────────────────────
// IMPORTANT : RuleGroup/RuleField sont au niveau MODULE (pas dans ReglesPanel). Définis
// à l'intérieur, ils étaient recréés à chaque frappe → React remontait l'input → perte
// du focus à chaque caractère.
function RuleGroup({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  const C = useContext(ThemeCtx)
  return (
    <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: C.tx, marginBottom: desc ? 3 : 18 }}>{title}</div>
      {desc && <div style={{ fontSize: 11, color: C.td, marginBottom: 18 }}>{desc}</div>}
      {children}
    </div>
  )
}

function RuleField({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  const C = useContext(ThemeCtx)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
      <span style={{ fontSize: 12.5, color: C.tm }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
        {unit && <span style={{ fontSize: 11, color: C.te, fontFamily: SANS, width: 26 }}>{unit}</span>}
      </div>
    </div>
  )
}

function ReglesPanel({ initial, plan, onSaved }: { initial: TradingRules | null; plan?: string; onSaved?: (r: TradingRules) => void }) {
  const C = useContext(ThemeCtx)
  const isMaxRules = isMaxPlan(plan)
  const [detCfg, setDetCfg] = useState<Record<string, any>>((initial as any)?.detector_config || {})
  const detEnabled = (type: string) => detCfg[type]?.enabled !== false
  const setDetEnabled = (type: string, v: boolean) => { setDetCfg(p => ({ ...p, [type]: { ...p[type], enabled: v } })); setSave('idle') }
  const detThresh = (type: string, key: string, def: number) => { const x = Number(detCfg[type]?.[key]); return isFinite(x) && x > 0 ? x : def }
  const setDetThresh = (type: string, key: string, v: string) => { setDetCfg(p => ({ ...p, [type]: { ...p[type], [key]: v === '' ? undefined : Number(v) } })); setSave('idle') }
  const defaults: TradingRules = {
    max_daily_drawdown_pct: 3, max_consecutive_losses: 3,
    min_time_between_entries_sec: 120, session_start: '09:30',
    session_end: '16:00', max_trades_per_session: 10, max_risk_per_trade_pct: 1,
    account_size: 10000, slack_webhook_url: null, tz_offset_hours: 0,
    max_leverage: 30, require_stop_loss: false,
  }
  const [rules, setRules] = useState<TradingRules>(initial ?? defaults)
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [propFirm, setPropFirm] = useState<string>((initial as any)?.prop_firm || '')
  // Date de démarrage du compte prop firm : aujourd'hui à l'activation/changement de firme,
  // conservée si on garde la même → l'Analytique se scope à partir de cette date.
  const todayISO = new Date().toISOString().slice(0, 10)
  const initialPropFirm = (initial as any)?.prop_firm || ''
  const initialPropStart = (initial as any)?.prop_firm_started_at || null
  const [propFirmStart, setPropFirmStart] = useState<string | null>(initialPropStart)

  // Éditer à la main le drawdown journalier désélectionne le preset (la valeur diverge).
  const PROPFIRM_FIELDS: (keyof TradingRules)[] = ['max_daily_drawdown_pct']
  function set(k: keyof TradingRules, v: string) { setRules(p => ({ ...p, [k]: v })); if (PROPFIRM_FIELDS.includes(k)) setPropFirm(''); setSave('idle') }
  function setBool(k: keyof TradingRules, v: boolean) { setRules(p => ({ ...p, [k]: v })); setSave('idle') }

  // Mode prop firm : cale le drawdown journalier max sur la règle de perte journalière
  // de la firme (seule vraie règle de prop firm reprise ; le reste = garde-fous Caldra).
  function applyPropFirm(id: string) {
    const preset = PROPFIRM_PRESETS.find(p => p.id === id)
    if (!preset) { setPropFirm(''); setPropFirmStart(null); setSave('idle'); return }
    setPropFirm(id)
    // Même firme qu'avant → on garde sa date de démarrage ; sinon, le compte démarre aujourd'hui.
    setPropFirmStart(id === initialPropFirm ? (initialPropStart || todayISO) : todayISO)
    setRules(p => ({ ...p, max_daily_drawdown_pct: preset.daily }))
    setSave('idle')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSave('saving')
    const payload = { ...rules, detector_config: detCfg, prop_firm: propFirm || null, prop_firm_started_at: propFirm ? (propFirmStart || todayISO) : null }
    const res = await fetch('/api/rules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSave(res.ok ? 'saved' : 'error')
    if (res.ok) {
      // Remonte les règles fraîches au parent → la Session live se met à jour aussitôt.
      let saved: TradingRules = payload as TradingRules
      try { const d = await res.json(); if (d && typeof d === 'object') saved = { ...payload, ...d } } catch {}
      onSaved?.(saved)
      setTimeout(() => setSave('idle'), 3000)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,.05)', border: `.5px solid ${C.b2}`, borderRadius: 6,
    padding: '7px 11px', fontSize: 13, fontFamily: SANS, color: C.tx, width: 80,
    textAlign: 'right', outline: 'none', transition: 'border-color .2s',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 28px 16px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.4, color: C.tx }}>Règles de session</div>
        <div style={{ fontSize: 12, color: C.te, marginTop: 3 }}>Ces seuils définissent quand Caldra déclenche une alerte. Modifiables à tout moment.</div>
      </div>
    <div style={{ padding: '22px 28px', overflowY: 'auto', flex: 1 }}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Mode prop firm — presets de garde-fous (plan Max) */}
        <RuleGroup title="Mode prop firm" desc="Aligne tes garde-fous de risque sur les règles d’un challenge prop firm.">
          {!isMaxRules ? (
            <div style={{ fontSize: 12.5, color: C.td, lineHeight: 1.5 }}>Le mode prop firm (presets FTMO, FundedNext, The5ers…) est inclus dans le plan <span style={{ color: C.tx }}>Max</span>.</div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => applyPropFirm('')} style={{
                  padding: '7px 13px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontFamily: SANS, transition: 'all .15s',
                  background: propFirm === '' ? C.red : 'rgba(255,255,255,.05)', color: propFirm === '' ? '#fff' : C.tm,
                  border: `.5px solid ${propFirm === '' ? C.red : C.b2}`,
                }}>Aucune</button>
                {PROPFIRM_PRESETS.map(pf => {
                  const on = propFirm === pf.id
                  return (
                    <button key={pf.id} type="button" onClick={() => applyPropFirm(pf.id)} style={{
                      padding: '7px 13px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontFamily: SANS, transition: 'all .15s',
                      background: on ? C.red : 'rgba(255,255,255,.05)', color: on ? '#fff' : C.tm,
                      border: `.5px solid ${on ? C.red : C.b2}`,
                    }}>{pf.name}</button>
                  )
                })}
              </div>
              {propFirm && (() => {
                const pf = PROPFIRM_PRESETS.find(p => p.id === propFirm)
                if (!pf) return null
                return (
                  <div style={{ fontSize: 11.5, color: C.te, marginTop: 12, lineHeight: 1.6 }}>
                    Règles <span style={{ color: C.tm }}>{pf.name}</span> : perte journalière max <span style={{ color: C.tm }}>{pf.daily}%</span> · perte totale max <span style={{ color: C.tm }}>{pf.total}%</span> (informatif). Caldra cale ton <span style={{ color: C.tm }}>drawdown journalier sur {pf.daily}%</span> ; le risk/trade et les autres garde-fous restent à ton choix.
                    <br />Valeurs du challenge 2-step phare — vérifie selon ta variante exacte, puis sauvegarde.
                  </div>
                )
              })()}
            </div>
          )}
        </RuleGroup>

        <div className="rules-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <RuleGroup title="Risk management" desc="Niveau 2 si seuil dépassé">
            <RuleField label="Taille du compte" unit="€">
              <input style={{ ...inputStyle, width: 100 }} type="number" min={100} max={10000000} step={100} value={rules.account_size ?? 10000} onChange={e => set('account_size', e.target.value)} />
            </RuleField>
            <RuleField label="Drawdown max journalier" unit="%">
              <input style={inputStyle} type="number" min={0.1} max={20} step={0.1} value={rules.max_daily_drawdown_pct} onChange={e => set('max_daily_drawdown_pct', e.target.value)} />
            </RuleField>
            <RuleField label="Risk max par trade" unit="%">
              <input style={inputStyle} type="number" min={0.1} max={10} step={0.1} value={rules.max_risk_per_trade_pct} onChange={e => set('max_risk_per_trade_pct', e.target.value)} />
            </RuleField>
            <RuleField label="Levier max" unit="×">
              <input style={inputStyle} type="number" min={1} max={500} step={1} value={rules.max_leverage ?? 30} onChange={e => set('max_leverage', e.target.value)} />
            </RuleField>
            <RuleField label="Alerter si trade sans stop-loss">
              <button
                type="button" role="switch" aria-checked={!!rules.require_stop_loss}
                onClick={() => setBool('require_stop_loss', !rules.require_stop_loss)}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', padding: 2,
                  background: rules.require_stop_loss ? C.red : 'rgba(255,255,255,.12)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: rules.require_stop_loss ? 'flex-end' : 'flex-start',
                  transition: 'background .2s',
                }}
              >
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'block' }} />
              </button>
            </RuleField>
          </RuleGroup>

          <RuleGroup title="Discipline comportementale" desc="Niveau 1 si 80% approché · Niveau 2 si dépassé">
            <RuleField label="Max trades par session">
              <input style={inputStyle} type="number" min={1} max={100} step={1} value={rules.max_trades_per_session} onChange={e => set('max_trades_per_session', e.target.value)} />
            </RuleField>
            <RuleField label="Pertes consécutives max">
              <input style={inputStyle} type="number" min={1} max={20} step={1} value={rules.max_consecutive_losses} onChange={e => set('max_consecutive_losses', e.target.value)} />
            </RuleField>
            <RuleField label="Délai min entre trades" unit="sec">
              <input style={inputStyle} type="number" min={0} max={3600} step={10} value={rules.min_time_between_entries_sec} onChange={e => set('min_time_between_entries_sec', e.target.value)} />
            </RuleField>
            <RuleField label="Début de session">
              <input style={{ ...inputStyle, width: 100, textAlign: 'center' }} type="time" value={(rules.session_start || '').slice(0, 5)} onChange={e => set('session_start', e.target.value)} />
            </RuleField>
            <RuleField label="Fin de session">
              <input style={{ ...inputStyle, width: 100, textAlign: 'center' }} type="time" value={(rules.session_end || '').slice(0, 5)} onChange={e => set('session_end', e.target.value)} />
            </RuleField>
            <RuleField label="Fuseau horaire (UTC+)">
              <select
                style={{ ...inputStyle, width: 100, textAlign: 'center', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundColor: 'rgba(255,255,255,.05)', color: C.tx }}
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

        {/* Détecteurs — on/off + seuils (plan Max) */}
        <RuleGroup title="Détecteurs" desc="Active ou coupe chaque détecteur, et ajuste ses seuils.">
          {!isMaxRules ? (
            <div style={{ fontSize: 12.5, color: C.td, lineHeight: 1.5 }}>Le réglage individuel des 18 détecteurs (marche/arrêt + seuils) est inclus dans le plan <span style={{ color: C.tx }}>Max</span>.</div>
          ) : (
            <div>
              {DETECTOR_DEFS.map(d => {
                const on = detEnabled(d.type)
                return (
                  <div key={d.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
                    <span style={{ fontSize: 12.5, color: on ? C.tm : C.te, display: 'flex', alignItems: 'center', gap: 7 }}>
                      {d.label}
                      {d.max && <span style={{ fontSize: 8, letterSpacing: 1, color: C.te, border: `.5px solid ${C.b2}`, borderRadius: 4, padding: '1px 4px' }}>MAX</span>}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {on && d.thresholds?.map(th => (
                        <span key={th.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={th.label}>
                          <input type="number" min={th.min} max={th.max} step={th.step} value={detThresh(d.type, th.key, th.def)} onChange={e => setDetThresh(d.type, th.key, e.target.value)} style={{ ...inputStyle, width: 58 }} />
                          {th.unit && <span style={{ fontSize: 10, color: C.te }}>{th.unit}</span>}
                        </span>
                      ))}
                      <button type="button" onClick={() => setDetEnabled(d.type, !on)} style={{
                        width: 34, height: 19, borderRadius: 10, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0,
                        background: on ? C.red : 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center',
                        justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background .2s',
                      }}><span style={{ width: 15, height: 15, borderRadius: '50%', background: '#fff', display: 'block' }} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </RuleGroup>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="submit" disabled={save === 'saving'} style={{
            padding: '12px 28px', background: C.red, border: 'none', borderRadius: 7, color: '#fff',
            fontSize: 13, fontFamily: SANS, cursor: save === 'saving' ? 'not-allowed' : 'pointer',
            fontWeight: 500, transition: 'opacity .2s', opacity: save === 'saving' ? .6 : 1,
          }}>
            {save === 'saving' ? 'Enregistrement…' : 'Sauvegarder les règles'}
          </button>
          {save === 'saved' && <span style={{ color: C.g, fontSize: 11, fontFamily: SANS }}>✓ Mis à jour</span>}
          {save === 'error' && <span style={{ color: C.red, fontSize: 11, fontFamily: SANS }}>Erreur — réessayez</span>}
        </div>
      </form>
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
  const type = alertLabel(toast.alert.type ?? (toast.alert as any).pattern).toUpperCase()
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
          fontFamily: SANS, background: cfg.bg, border: `1px solid ${cfg.border}`,
          padding: '1px 5px',
        }}>{cfg.label}</span>
        <span style={{
          color: 'rgba(216,213,232,.32)', fontSize: 8.5, fontFamily: SANS,
          letterSpacing: '.06em', flex: 1, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
        }}>{type}</span>
        <span style={{ color: 'rgba(216,213,232,.2)', fontSize: 11 }}>✕</span>
      </div>
      <p style={{ margin: 0, color: 'rgba(216,213,232,.72)', fontSize: 11.5, lineHeight: 1.55, fontFamily: SANS }}>{toast.alert.message}</p>
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

// ── DebriefMenu — icône dans la barre du haut + panneau (plan Max) ───────────────
// Hub des débriefs IA : Aujourd'hui (auto à la clôture, caché en cache) + 7 jours +
// 60 jours (à la demande). Pastille pulsante quand le débrief du jour est prêt,
// jusqu'au 1er clic. Toujours accessible (les 7/60 j ne dépendent pas de la session).
function DebriefMenu({ tradesToday, sessionEnd }: { tradesToday: number; sessionEnd: string | null }) {
  const C = useContext(ThemeCtx)
  const today = new Date().toISOString().slice(0, 10)
  const seenKey = `caldra_debrief_seen_${today}`
  const dayCacheKey = `caldra_debrief_${today}`

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'day' | '7' | '30'>('day')
  const [store, setStore] = useState<Record<string, { text?: string; loading?: boolean; error?: string }>>({})
  const [seen, setSeen] = useState(true)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    if (!sessionEnd) { setEnded(false); return }
    const check = () => {
      const [h, m] = String(sessionEnd).split(':').map(Number)
      if (isNaN(h)) { setEnded(false); return }
      const now = new Date(); const end = new Date(); end.setHours(h, m || 0, 0, 0)
      setEnded(now >= end)
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [sessionEnd])

  const dailyReady = tradesToday > 0 && ended

  const load = async (v: 'day' | '7' | '30') => {
    if (store[v]?.text || store[v]?.loading) return
    setStore(s => ({ ...s, [v]: { loading: true } }))
    // Jour → on cible explicitement AUJOURD'HUI (pas ?latest=1, qui retomberait sur
    // la dernière journée tradée = hier sur une séance neuve sans trade).
    const query = v === 'day' ? '' : `?period=${v}`
    try {
      const res = await fetch(`/api/debrief${query}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.debrief) {
        setStore(s => ({ ...s, [v]: { text: data.debrief } }))
        if (v === 'day') { try { localStorage.setItem(dayCacheKey, data.debrief) } catch {} }
      } else setStore(s => ({ ...s, [v]: { error: data.error ?? 'Indisponible pour le moment.' } }))
    } catch { setStore(s => ({ ...s, [v]: { error: 'Erreur réseau — réessaie.' } })) }
  }

  // Débrief du jour pré-généré à la clôture (cache localStorage) + pastille d'attention.
  useEffect(() => {
    if (!dailyReady) return
    let cached: string | null = null
    try { cached = localStorage.getItem(dayCacheKey) } catch {}
    if (cached) { setStore(s => ({ ...s, day: { text: cached! } })); try { setSeen(localStorage.getItem(seenKey) === '1') } catch {} ; return }
    setSeen(false)
    load('day')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyReady])

  const toggle = () => {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen) {
      if (avail(view) && !store[view]?.text && !store[view]?.loading) load(view)
      if (!seen) { setSeen(true); try { localStorage.setItem(seenKey, '1') } catch {} }
    }
  }
  const select = (v: 'day' | '7' | '30') => { setView(v); if (avail(v)) load(v) }

  // Le débrief Semaine n'est dispo qu'en fin de semaine : vendredi APRÈS la clôture de
  // la séance, puis samedi/dimanche. Le débrief Mois qu'au dernier jour du mois.
  const now0 = new Date()
  const dow0 = now0.getDay()
  const weekAvail = dow0 === 6 || dow0 === 0 || (dow0 === 5 && ended)
  const lastDom = new Date(now0.getFullYear(), now0.getMonth() + 1, 0).getDate()
  const monthAvail = now0.getDate() >= lastDom - 1   // avant-dernier jour ou après
  // Le débrief du jour n'est dispo qu'à la clôture de la séance ET s'il y a eu des trades.
  function avail(v: 'day' | '7' | '30') { return v === '7' ? weekAvail : v === '30' ? monthAvail : dailyReady }

  const cur = store[view] || {}
  const tabs: Array<{ k: 'day' | '7' | '30'; label: string }> = [
    { k: 'day', label: 'Aujourd’hui' }, { k: '7', label: 'Semaine' }, { k: '30', label: 'Mois' },
  ]

  return (
    <div style={{ position: 'relative', marginLeft: 6, fontFamily: SANS }}>
      <button onClick={toggle} title="Débriefs IA" style={{
        position: 'relative', width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
        background: open ? C.b2 : 'transparent', color: open ? C.tx : C.td, fontSize: 15,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
        outline: 'none', WebkitTapHighlightColor: 'transparent',
      }}>
        🧭
        {!seen && dailyReady && (
          <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: C.red, boxShadow: `0 0 0 2px ${C.sf}`, animation: 'pulse 1.6s infinite' }} />
        )}
      </button>
      {open && createPortal(
        <div style={{
          position: 'fixed', top: 54, right: 16, width: 'min(380px, calc(100vw - 24px))',
          maxHeight: '72vh', display: 'flex', flexDirection: 'column', background: C.sf,
          border: `.5px solid ${C.b2}`, borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 16px 44px rgba(0,0,0,.55)', zIndex: 100000, animation: 'fadeUp .18s ease', fontFamily: SANS,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>🧭</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: C.tx }}>Débriefs IA</span>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: C.te, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 2 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px 0', flexShrink: 0 }}>
            {tabs.map(tb => (
              <button key={tb.k} onClick={() => select(tb.k)} style={{
                flex: 1, fontSize: 11.5, padding: '6px 0', borderRadius: 7, cursor: 'pointer', fontFamily: SANS,
                background: view === tb.k ? C.b2 : 'transparent', border: `.5px solid ${view === tb.k ? C.b2 : C.b}`,
                color: view === tb.k ? C.tx : C.td, transition: 'all .15s', outline: 'none',
              }}>{tb.label}</button>
            ))}
          </div>
          <div style={{ padding: 14, overflowY: 'auto' }}>
            {!avail(view) && (
              <div style={{ fontSize: 12.5, color: C.td, fontStyle: 'italic', lineHeight: 1.5 }}>
                {view === '7'
                  ? 'Le débrief hebdomadaire sera disponible en fin de semaine.'
                  : view === '30'
                  ? "Le débrief mensuel sera disponible à l'avant-dernier jour du mois."
                  : ended
                  ? "Aucun trade sur cette séance — pas de débrief aujourd'hui."
                  : "Le débrief du jour s'affichera à la clôture de ta séance."}
              </div>
            )}
            {avail(view) && cur.loading && <div style={{ fontSize: 12.5, color: C.td, fontStyle: 'italic' }}>Analyse en cours…</div>}
            {avail(view) && !cur.loading && cur.error && <div style={{ fontSize: 12.5, color: C.td, fontStyle: 'italic' }}>{cur.error}</div>}
            {avail(view) && !cur.loading && cur.text && cur.text.split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} style={{ height: 6 }} />
              const parts = line.split(/\*\*(.*?)\*\*/g)
              return (
                <div key={i} style={{ fontSize: 13, color: C.tm, lineHeight: 1.7, fontWeight: 300, marginBottom: 3 }}>
                  {parts.map((p, j) => j % 2 === 1 ? <span key={j} style={{ fontWeight: 600, color: C.tx }}>{p}</span> : p)}
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}
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

  const isPaid = isPaidPlan(plan)

  const plans = [
    {
      id: 'pro', name: 'Pro', price: '19€',
      accent: C.g, accentAlpha: 'rgba(0,209,122,',
      features: ['11 détecteurs comportementaux', 'Dashboard temps réel', 'Personnalisation des règles', 'Rapport mensuel', 'Historique illimité'],
    },
    {
      id: 'max', name: 'Max', price: '34€',
      accent: C.red, accentAlpha: `rgba(124,58,237,`,
      features: ['Tout le plan Pro inclus', '18 détecteurs comportementaux', 'Règles configurables (on/off + seuils)', 'Mode prop firm (FTMO, FundedNext…)', 'Débriefs IA (jour/semaine/mois)', 'Patterns récurrents complets', 'Alertes Discord et Telegram', 'Rapport hebdomadaire'],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 26px 16px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
            <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.4, color: C.tx }}>Billing</div>
          <div style={{ fontSize: 12, color: C.te, marginTop: 3 }}>Plan actuel : <span style={{ color: C.tm, fontWeight: 500, textTransform: 'capitalize' }}>{plan}</span></div>
        </div>
        {isPaid && (
          <button onClick={portal} disabled={loading === 'portal'} style={{ padding: '8px 16px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 8, color: C.td, fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: .3, transition: 'all .18s' }}>
            {loading === 'portal' ? 'Chargement…' : 'Gérer l\'abonnement →'}
          </button>
        )}
      </div>
    <div style={{ padding: 26, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>

      {/* Comparer / changer de plan */}
      <div style={{ fontSize: 10, letterSpacing: 1, color: C.td, textTransform: 'uppercase' as const, fontFamily: SANS }}>{isPaid ? 'Changer de plan' : 'Choisir un plan'}</div>
      <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {plans.map(p => {
          const isCurrent = plan === p.id
          return (
            <div key={p.id} style={{ background: C.sf, border: `.5px solid ${isCurrent ? p.accent : C.b}`, borderRadius: 12, padding: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${isCurrent ? p.accent : C.b3},transparent)` }} />
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

      <div style={{ padding: '11px 16px', background: 'rgba(255,255,255,.02)', border: `.5px solid ${C.b}`, borderRadius: 8, fontSize: 12, color: C.te }}>
        {isPaid
          ? "Gère ou résilie ton abonnement à tout moment via « Gérer l'abonnement » (portail Stripe sécurisé)."
          : '7 jours d\'essai gratuit inclus sur Pro et Max — carte requise, débit automatique à J+7 sauf résiliation.'}
      </div>
    </div>
    </div>
  )
}

// ── ProfilPanel ─────────────────────────────────────────────────────────────────
function ProfilPanel({ userEmail, userMeta, plan }: { userEmail: string; userMeta: { first_name?: string; last_name?: string; phone?: string }; plan: string }) {
  const C = useContext(ThemeCtx)
  const [firstName, setFirstName] = useState(userMeta.first_name ?? '')
  const [lastName,  setLastName]  = useState(userMeta.last_name  ?? '')
  const [phone,     setPhone]     = useState(userMeta.phone      ?? '')
  const [save,      setSave]      = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [pwSave,    setPwSave]    = useState<'idle'|'saving'|'sent'|'error'>('idle')
  const [emailSave, setEmailSave] = useState<'idle'|'saving'|'sent'|'error'>('idle')
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

  async function sendPasswordReset() {
    setPwSave('saving')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().auth.resetPasswordForEmail(userEmail, { redirectTo: `${window.location.origin}/reset-password` })
      setPwSave(error ? 'error' : 'sent')
      if (!error) setTimeout(() => setPwSave('idle'), 5000)
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

  const fieldLbl: React.CSSProperties = { fontSize: 9, letterSpacing: 1.5, color: C.te, marginBottom: 5 }
  const Card = ({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) => (
    <div style={{ background: C.sf, border: `.5px solid ${accent ?? C.b}`, ...(accent ? { borderLeft: `3px solid ${accent}` } : {}), borderRadius: 12, padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' as const, color: accent ?? C.te, marginBottom: 16, fontFamily: SANS }}>{title}</div>
      {children}
    </div>
  )

  const initials = (firstName || lastName) ? `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() : userEmail.slice(0, 2).toUpperCase()
  const fullName = `${firstName} ${lastName}`.trim()
  const isMax = isMaxPlan(plan)
  const planLabel = isMax ? 'Max' : plan === 'pro' ? 'Pro' : 'Free'
  const planColor = isMax ? C.red : plan === 'pro' ? C.g : C.te

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 26px 16px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.4, color: C.tx }}>Profil</div>
        <div style={{ fontSize: 12, color: C.te, marginTop: 3 }}>Gère tes informations, ta sécurité et ton compte.</div>
      </div>
    <div style={{ padding: 26, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>

      {/* Résumé du compte */}
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
        <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
        <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: C.sf2, border: `.5px solid ${C.b2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 500, color: C.tx, letterSpacing: .5 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.tx, marginBottom: 2 }}>{fullName || 'Ton profil'}</div>
          <div style={{ fontSize: 12, color: C.te, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{userEmail}</div>
        </div>
        <span style={{ padding: '4px 11px', borderRadius: 99, fontSize: 10, letterSpacing: 1, fontFamily: SANS, color: planColor, background: `${planColor}14`, border: `.5px solid ${planColor}33`, flexShrink: 0 }}>Plan {planLabel}</span>
        <button onClick={logout} style={{ padding: '8px 14px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 8, color: C.td, fontSize: 11, fontFamily: SANS, cursor: 'pointer', flexShrink: 0 }}>Se déconnecter</button>
      </div>

      {/* Informations personnelles */}
      <Card title="Informations personnelles">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={fieldLbl}>PRÉNOM</div><input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" /></div>
              <div><div style={fieldLbl}>NOM</div><input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" /></div>
            </div>
            <div>
              <div style={fieldLbl}>EMAIL</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" type="email" />
                <button onClick={changeEmail} disabled={emailSave === 'saving' || email === userEmail} style={{ padding: '0 14px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 7, color: C.td, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' as const, opacity: email === userEmail ? .3 : 1 }}>
                  {emailSave === 'saving' ? '…' : 'Changer'}
                </button>
              </div>
              {emailSave === 'sent'  && <div style={{ fontSize: 11, color: C.g, marginTop: 5, fontFamily: SANS }}>✓ Lien de confirmation envoyé</div>}
              {emailSave === 'error' && <div style={{ fontSize: 11, color: C.red, marginTop: 5 }}>Erreur — réessaie</div>}
            </div>
            <div>
              <div style={fieldLbl}>TÉLÉPHONE</div>
              <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 00 00 00 00" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <button onClick={saveProfile} disabled={save === 'saving'} style={{ padding: '9px 20px', background: C.red, border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: .5, opacity: save === 'saving' ? .6 : 1 }}>
                {save === 'saving' ? 'Enregistrement…' : 'Sauvegarder'}
              </button>
              {save === 'saved' && <span style={{ fontSize: 11, color: C.g, fontFamily: SANS }}>✓ Sauvegardé</span>}
              {save === 'error'  && <span style={{ fontSize: 11, color: C.red, fontFamily: SANS }}>Erreur</span>}
            </div>
          </div>
        </Card>

      <Card title="Sécurité">
        <div style={{ fontSize: 12.5, color: C.td, lineHeight: 1.55, marginBottom: 14 }}>
          Le mot de passe se modifie via un lien sécurisé envoyé à <span style={{ color: C.tm }}>{userEmail}</span>.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <button onClick={sendPasswordReset} disabled={pwSave === 'saving'} style={{ padding: '9px 18px', background: 'transparent', border: `.5px solid ${C.b2}`, borderRadius: 7, color: C.td, fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: .3, opacity: pwSave === 'saving' ? .6 : 1 }}>
            {pwSave === 'saving' ? 'Envoi…' : 'Recevoir un lien de réinitialisation'}
          </button>
          {pwSave === 'sent'  && <span style={{ fontSize: 11, color: C.g, fontFamily: SANS }}>✓ Lien envoyé — vérifie ta boîte mail</span>}
          {pwSave === 'error' && <span style={{ fontSize: 11, color: C.red, fontFamily: SANS }}>Erreur — réessaie</span>}
        </div>
      </Card>

      {/* Zone dangereuse */}
      <Card title="Zone dangereuse" accent="rgba(224,80,80,.4)">
        <div style={{ fontSize: 12, color: C.td, lineHeight: 1.5, marginBottom: 14 }}>Action définitive : tes trades, alertes et règles seront effacés. Ton abonnement, lui, doit être résilié séparément depuis Billing.</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
          <input
            style={{ ...inp, maxWidth: 220, borderColor: deleteConfirm === 'SUPPRIMER' ? 'rgba(224,80,80,.4)' : undefined }}
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder='Tape "SUPPRIMER"'
          />
          <button
            onClick={deleteAccount}
            disabled={deleteConfirm !== 'SUPPRIMER' || deleting}
            style={{ padding: '11px 18px', background: deleteConfirm === 'SUPPRIMER' ? 'rgba(224,80,80,.12)' : 'transparent', border: '.5px solid rgba(224,80,80,.25)', borderRadius: 7, color: 'rgba(224,80,80,.75)', fontSize: 11, fontFamily: SANS, cursor: deleteConfirm === 'SUPPRIMER' ? 'pointer' : 'not-allowed', opacity: deleteConfirm !== 'SUPPRIMER' ? .35 : 1, whiteSpace: 'nowrap' as const }}
          >
            {deleting ? 'Suppression…' : 'Supprimer mon compte'}
          </button>
        </div>
      </Card>
    </div>
    </div>
  )
}

function SupportPanel({ userEmail }: { userEmail: string }) {
  const C = useContext(ThemeCtx)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function send() {
    if (!message.trim()) return
    setStatus('sending'); setErrMsg('')
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      })
      if (res.ok) {
        setStatus('sent'); setSubject(''); setMessage('')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrMsg(data.error || "Une erreur s'est produite. Écris-nous à contact@getcaldra.com.")
        setStatus('error')
      }
    } catch {
      setErrMsg("Connexion impossible. Écris-nous à contact@getcaldra.com.")
      setStatus('error')
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: C.bg, border: `.5px solid ${C.b2}`,
    borderRadius: 8, padding: '11px 14px', color: C.tx, fontSize: 13,
    fontFamily: SANS, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color .2s',
  }

  const fieldLbl: React.CSSProperties = { fontSize: 9, letterSpacing: 1.5, color: C.te, marginBottom: 5 }
  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div className="cflux" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: `linear-gradient(90deg,transparent,${C.b3} 40%,transparent)` }} />
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.te, marginBottom: 16, fontFamily: SANS }}>{title}</div>
      {children}
    </div>
  )

  const faq: Array<{ q: string; a: string }> = [
    { q: 'Comment connecter mon broker ?', a: "Onglet Intégrations : récupère ta clé API pour /api/ingest, branche un webhook Discord, ou connecte un compte cTrader. Le dashboard se met à jour en temps réel dès qu'un trade arrive." },
    { q: 'Comment le score de session est-il calculé ?', a: 'Tu pars de 100 et chaque alerte retire des points selon sa gravité (niveau 3 : −18, niveau 2 : −8, niveau 1 : −3). Le score reflète la discipline comportementale de ta session, pas ton P&L.' },
    { q: 'À quoi servent les alertes ?', a: "Caldra surveille 18 schémas (revenge sizing, re-entrées impulsives, overtrading, drawdown…) et te prévient en direct. Ajuste les seuils dans l'onglet Règles." },
    { q: 'Mes données sont-elles privées ?', a: 'Oui. Chaque trade est rattaché à ton compte uniquement, isolé par les règles de sécurité Supabase. Tu peux supprimer ton compte et toutes tes données depuis le Profil.' },
  ]

  const detectors: Array<{ label: string; desc: string; max?: boolean }> = [
    { label: 'Hors horaires', desc: 'Trade ouvert en dehors de ta fenêtre de session.' },
    { label: 'Re-entrée immédiate', desc: 'Tu te repositionnes trop vite après une sortie.' },
    { label: 'Overtrading', desc: 'Tu approches ou dépasses ton nombre max de trades.' },
    { label: 'Désespoir de fin de session', desc: 'Trade dans les dernières minutes, déjà en perte.' },
    { label: 'Actif inhabituel', desc: 'Symbole hors de tes instruments habituels.' },
    { label: 'Pertes consécutives', desc: 'Série de pertes d’affilée sur la session.' },
    { label: 'Drawdown', desc: 'Tu approches ou atteins ta limite de perte du jour.' },
    { label: 'Stop non respecté', desc: 'Perte réalisée au-delà de ton risque par trade.' },
    { label: 'Risk dépassé', desc: 'Position trop grande pour ton risque par trade.' },
    { label: 'Sur-exposition', desc: 'Levier au-delà de ton seuil maximum.' },
    { label: 'Aucun stop', desc: 'Trade fermé sans stop-loss (option à activer).' },
    { label: 'Revenge sizing', desc: 'Tu augmentes ta taille après une perte.', max: true },
    { label: 'Sizing d’euphorie', desc: 'Tu augmentes ta taille après un gain.', max: true },
    { label: 'Acharnement directionnel', desc: 'Tu réattaques le même sens après 2 pertes.', max: true },
    { label: 'Cadence qui s’emballe', desc: 'Tes entrées s’accélèrent alors que tu perds.', max: true },
    { label: 'Tu coupes tes gains', desc: 'Gagnants tenus bien moins longtemps que les perdants.', max: true },
    { label: 'Drawdown franchi', desc: 'Tu continues à trader après avoir dépassé ta limite.', max: true },
    { label: 'Trade pendant news', desc: 'Entrée à ±10 min d’une news à fort impact.', max: true },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 26px 16px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -.4, color: C.tx }}>Aide &amp; support</div>
        <div style={{ fontSize: 12, color: C.te, marginTop: 3 }}>Une question, un bug, une suggestion — on répond sous 24h.</div>
      </div>
      <div style={{ padding: 26, overflowY: 'auto', flex: 1 }}>
       <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Contact + FAQ côte à côte */}
        <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
          <Card title="Nous contacter">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={fieldLbl}>RÉPONSE ENVOYÉE À</div>
                <input style={{ ...inp, opacity: .6, cursor: 'not-allowed' }} value={userEmail} readOnly />
              </div>
              <div>
                <div style={fieldLbl}>SUJET</div>
                <input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex. Connexion cTrader, facturation…" />
              </div>
              <div>
                <div style={fieldLbl}>MESSAGE</div>
                <textarea
                  style={{ ...inp, minHeight: 160, resize: 'vertical' as const, fontFamily: SANS }}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Décris ta question ou ton problème…"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={send}
                  disabled={status === 'sending' || !message.trim()}
                  style={{ padding: '9px 22px', background: C.red, border: 'none', borderRadius: 7, color: '#fff', fontSize: 11, fontFamily: SANS, cursor: status === 'sending' || !message.trim() ? 'not-allowed' : 'pointer', letterSpacing: .5, opacity: status === 'sending' || !message.trim() ? .5 : 1 }}
                >
                  {status === 'sending' ? 'Envoi…' : 'Envoyer'}
                </button>
                {status === 'sent'  && <span style={{ fontSize: 11, color: C.g, fontFamily: SANS }}>✓ Envoyé — réponse sous 24h</span>}
                {status === 'error' && <span style={{ fontSize: 11, color: C.red }}>{errMsg}</span>}
              </div>
            </div>
          </Card>

          <Card title="Questions fréquentes">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {faq.map((f, i) => (
                <div key={i} style={{ paddingBottom: i < faq.length - 1 ? 14 : 0, borderBottom: i < faq.length - 1 ? `.5px solid rgba(255,255,255,.04)` : 'none' }}>
                  <div style={{ fontSize: 13, color: C.tx, fontWeight: 500, marginBottom: 5 }}>{f.q}</div>
                  <div style={{ fontSize: 12.5, color: C.te, lineHeight: 1.6 }}>{f.a}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Les 18 détecteurs — pleine largeur */}
        <Card title="Les 18 détecteurs surveillés">
          <div style={{ fontSize: 12, color: C.te, lineHeight: 1.5, marginBottom: 16 }}>
            Caldra repère ces schémas en direct. Les seuils chiffrés se règlent dans l&apos;onglet Règles ; les autres tournent sur une logique fixe. <span style={{ color: C.red, fontFamily: SANS, fontSize: 10 }}>MAX</span> = inclus dans le plan Max.
          </div>
          <div className="detectors-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {detectors.map((d, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12.5, color: C.tx, fontWeight: 500 }}>{d.label}</span>
                  {d.max && <span style={{ fontSize: 8, letterSpacing: 1, color: C.red, border: `.5px solid ${C.red}55`, borderRadius: 4, padding: '1px 4px', fontFamily: SANS }}>MAX</span>}
                </div>
                <div style={{ fontSize: 11.5, color: C.te, lineHeight: 1.45 }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Contact direct */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 18 }}>✉️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: C.tm }}>Tu préfères l'email direct ?</div>
            <a href="mailto:contact@getcaldra.com" style={{ fontSize: 12.5, color: C.red, textDecoration: 'none', fontFamily: SANS }}>contact@getcaldra.com</a>
          </div>
          <span style={{ fontSize: 11, color: C.te, fontFamily: SANS }}>Réponse sous 24 h ouvrées</span>
        </div>
       </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
const TABS: Array<{ id: string; label: string }> = [
  { id: 'session',     label: 'Session live' },
  { id: 'calendrier', label: 'Calendrier' },
  { id: 'analytics',  label: 'Analytics' },
  { id: 'integrations',  label: 'Intégrations' },
]

const SETTINGS_ITEMS = [
  { id: 'profil',        label: 'Profil' },
  { id: 'regles',        label: 'Règles' },
  { id: 'rapports',   label: 'Rapports' },
  { id: 'billing',       label: 'Billing' },
]

type TabId = 'session' | 'calendrier' | 'analytics' | 'rapports' | 'integrations' | 'regles' | 'billing' | 'profil' | 'aide'

export default function DashboardClient({
  userId, userEmail, initialScore, initialAlerts, initialTrades, initialStats,
  yesterdayStats, tradingRules, apiKeyPrefix, historicalSessions, journalTrades, plan, userMeta,
  ctraderConnected, ctraderConflict, ctraderPending, lastTradeAt, platformConnected, allTimePatterns,
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
  // Règles vivantes : initialisées depuis le prop serveur, mises à jour quand l'utilisateur
  // sauvegarde dans l'onglet Règles → la Session live reflète tout de suite le nouveau
  // capital / preset prop firm sans recharger la page.
  const [liveRules, setLiveRules] = useState<TradingRules | null>(tradingRules)

  // Auto-switch to integrations tab after cTrader / Tradovate OAuth callback
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const ct = p.get('ctrader')
    const tv = p.get('tradovate')
    if (ct === 'connected' || ct === 'error') {
      setActiveTab('integrations')
      if (ct === 'error') {
        const reason = p.get('reason')
        alert(`Connexion cTrader échouée${reason ? ` : ${decodeURIComponent(reason)}` : ''}`)
      }
      window.history.replaceState({}, '', '/dashboard')
    } else if (tv === 'connected' || tv === 'error') {
      setActiveTab('integrations')
      if (tv === 'error') {
        const reason = p.get('reason')
        alert(`Connexion Tradovate échouée${reason ? ` : ${decodeURIComponent(reason)}` : ''}`)
      }
      window.history.replaceState({}, '', '/dashboard')
    } else if (p.get('mt5') === 'connected') {
      setActiveTab('integrations')
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])
  const settingsRef = useRef<HTMLDivElement>(null)
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts)
  const [trades, setTrades] = useState<TradeRow[]>(initialTrades)
  const [stats, setStats] = useState<SessionStats>(initialStats)
  const [connected, setConnected] = useState(false)
  // État cTrader remonté ici pour survivre au démontage/remontage de l'onglet Intégrations
  const [ctraderConn, setCtraderConn] = useState(ctraderConnected)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [notifPerm, setNotifPerm] = useState<string>('default')
  const [notifHint, setNotifHint] = useState<string | null>(null)   // message d'aide si l'activation échoue (iOS / permission bloquée)
  const [milestone, setMilestone] = useState<{ id: string; label: string; value: number } | null>(null)   // jalon de streak à fêter
  const [connectHint, setConnectHint] = useState(false)   // invite à connecter une plateforme (aucun trade encore)

  // Affiche l'invite de connexion si aucune plateforme connectée et aucun trade reçu.
  useEffect(() => {
    if (ctraderConn || lastTradeAt) return
    if (typeof window !== 'undefined' && localStorage.getItem('caldra-connect-hint') === 'dismissed') return
    const t = setTimeout(() => setConnectHint(true), 1200)
    return () => clearTimeout(t)
  }, [ctraderConn, lastTradeAt])
  function dismissConnectHint() {
    setConnectHint(false)
    try { localStorage.setItem('caldra-connect-hint', 'dismissed') } catch {}
  }

  const [topbarH, setTopbarH] = useState(0)   // hauteur de la topbar fixe sur mobile → décalage du contenu
  const topbarRef = useRef<HTMLDivElement>(null)

  const notifDelay = useRef(0)
  const notifReset = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<any>(null)
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

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
      '1': 'session', '2': 'calendrier', '3': 'analytics', '4': 'integrations'
    }
    function onKey(e: KeyboardEvent) {
      if (e.altKey && map[e.key]) { e.preventDefault(); setActiveTab(map[e.key]); setSettingsOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    const id = `t-${Date.now()}`
    setToasts(prev => [{ id, alert, exiting: false }, ...prev].slice(0, 4))
    const timer = setTimeout(() => dismissToast(id), 5000)
    toastTimers.current.set(id, timer)
  }, [dismissToast])

  const score = computeScore(alerts)

  // Jalons de streak : on fête le palier le plus haut atteint pour chaque streak, une
  // seule fois (mémorisé en localStorage). En plus de la bannière brève, on envoie une
  // notif système (si autorisée). Un seul palier à la fois pour ne pas spammer.
  useEffect(() => {
    for (const def of STREAK_DEFS) {
      const val = def.compute(historicalSessions)
      const reached = MILESTONES.filter(m => m <= val).pop()
      if (!reached) continue
      const key = `caldra_milestone_${def.id}_${userId}`
      if (reached > Number(localStorage.getItem(key) || 0)) {
        localStorage.setItem(key, String(reached))
        setMilestone({ id: def.id, label: def.label, value: reached })
        showPushNotif('Caldra — Jalon atteint', `${reached} ${def.label}. Garde le cap.`, `caldra-streak-${def.id}`)
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historicalSessions, userId])

  const dismissMilestone = useCallback(() => setMilestone(null), [])

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
        const a = payload.new as AlertRow & { session_date?: string; user_id?: string }
        if (a.session_date && a.session_date !== today) return
        setAlerts(prev => [a, ...prev])
        addToast(a)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades', filter: `user_id=eq.${userId}` }, (payload) => {
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
  }, [userId, today, addToast])

  // Topbar fixe sur mobile : on mesure sa hauteur (variable car elle passe sur 2 lignes)
  // pour décaler le contenu d'autant. Sur desktop la topbar reste dans le flux → 0.
  useEffect(() => {
    const mq = window.matchMedia('(max-width:768px)')
    const update = () => {
      setTopbarH(mq.matches && topbarRef.current ? topbarRef.current.offsetHeight : 0)
    }
    update()
    const ro = new ResizeObserver(update)
    if (topbarRef.current) ro.observe(topbarRef.current)
    mq.addEventListener('change', update)
    return () => { ro.disconnect(); mq.removeEventListener('change', update) }
  }, [])

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPerm(Notification.permission)
    }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler as EventListener)

    // Register SW + re-subscribe if permission already granted (e.g. returning user)
    if ('serviceWorker' in navigator) {
      // Unregister stale service workers (e.g. OneSignal SW left over from a previous integration)
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => { if (!r.active?.scriptURL?.endsWith('/sw.js')) r.unregister() })
      }).catch(() => {})

      navigator.serviceWorker.register('/sw.js').then(async () => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (!vapidKey) return
          try {
            const reg = await navigator.serviceWorker.ready
            const padding = '='.repeat((4 - vapidKey.length % 4) % 4)
            const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
            const raw = window.atob(b64)
            const bytes = new Uint8Array(raw.length)
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
            // Force re-subscribe to ensure the subscription matches current VAPID key
            const existingSub = await reg.pushManager.getSubscription()
            if (existingSub) await existingSub.unsubscribe()
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes.buffer })
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
      }).catch(() => {})
    }

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
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const standalone = typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true)

    // iOS n'autorise les notifications web QUE si l'app est installée sur l'écran
    // d'accueil (mode standalone). En onglet Safari, requestPermission renvoie denied
    // → on guide l'utilisateur au lieu d'afficher « désactivé ».
    if (typeof Notification === 'undefined' || (isIOS && !standalone)) {
      setNotifHint(isIOS
        ? "Sur iPhone/iPad, installe d'abord Caldra sur ton écran d'accueil (bouton Partager → « Sur l'écran d'accueil »), puis rouvre l'app pour activer les notifications."
        : "Ton navigateur ne supporte pas les notifications. Essaie d'installer Caldra comme application.")
      return
    }

    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if (perm !== 'granted') {
      setNotifHint("Notifications bloquées. Autorise-les pour Caldra dans les réglages de ton navigateur (puis recharge la page).")
      return
    }

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
        *{scrollbar-width:none;-ms-overflow-style:none}
        ::-webkit-scrollbar{width:0;height:0;display:none}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.15}}
        @keyframes sli{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
        @keyframes toastIn{from{opacity:0;transform:translateX(28px) scale(.97)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes toastOut{from{opacity:1;transform:translateX(0) scale(1)}to{opacity:0;transform:translateX(28px) scale(.97)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes snRing{0%{transform:scale(.5);opacity:.65}70%{opacity:.1}100%{transform:scale(1.55);opacity:0}}
        @keyframes snGlow{0%,100%{box-shadow:0 0 26px 3px rgba(124,58,237,.4),inset 0 0 16px rgba(124,58,237,.45)}50%{box-shadow:0 0 44px 9px rgba(124,58,237,.62),inset 0 0 22px rgba(124,58,237,.68)}}
        @keyframes snScan{0%{transform:translateY(-120%)}100%{transform:translateY(120%)}}
        @keyframes snStream{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
        @keyframes snDot{0%,20%{opacity:.18}50%{opacity:1}80%,100%{opacity:.18}}
        @keyframes snDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(2%,-2%)}}
        .tab-nav{display:flex;align-items:center;background:${C.b};border:.5px solid ${C.b};border-radius:13px;padding:4px 5px;gap:3px}
        .tab-btn{display:flex;align-items:center;gap:6px;padding:8px 22px;border-radius:9px;font-size:12.5px;letter-spacing:.3px;color:${C.td};cursor:pointer;border:none;background:none;white-space:nowrap;font-weight:400;font-family:${SANS};transition:color .15s,background .15s,box-shadow .15s}
        .tab-btn:hover{color:${C.tm};background:${C.b}}
        .tab-btn.active{color:${C.tx};background:${C.b2};font-weight:500;box-shadow:0 1px 5px rgba(0,0,0,.14)}
        textarea,input{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        input[type=time]::-webkit-calendar-picker-indicator{filter:invert(.3)}
        .ana-prop .cflux{background:linear-gradient(90deg,transparent,rgba(124,58,237,.9) 40%,transparent)!important}
        .c-card{transition:border-color .18s,box-shadow .18s}
        .c-card:hover{border-color:${C.b3}!important;box-shadow:0 2px 18px rgba(0,0,0,.18)}
        .c-row:hover{background:${C.b}!important}
        @media(max-width:768px){
          .app-root{height:auto!important;min-height:100dvh}
          .topbar{flex-wrap:wrap;height:auto!important;min-height:46px;position:fixed!important;top:0;left:0;right:0;width:100vw;z-index:50}
          .nav-wrap{position:static!important;left:auto!important;transform:none!important;order:3;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:5px 8px;border-top:.5px solid rgba(255,255,255,.055)}
          .nav-wrap::-webkit-scrollbar{display:none}
          .tab-nav{border-radius:10px;width:max-content}
          .tab-btn{padding:6px 14px;font-size:11.5px}
          .date-lbl{display:none!important}
          .sidebar-col{display:none!important}
          .main-layout{grid-template-columns:1fr!important;overflow:visible!important;height:auto!important;flex:none!important}
          .panel-container{overflow:visible!important;height:auto!important;min-height:0!important;flex:none!important;display:block!important}
          .panel-container>*{height:auto!important;min-height:0!important;overflow:visible!important;flex:none!important}
          .resp-grid-2{grid-template-columns:1fr!important}
          .detectors-grid{grid-template-columns:repeat(2,1fr)!important}
          .kpi-grid{grid-template-columns:repeat(2,1fr)!important}
          .session-main-grid{grid-template-columns:1fr!important}
          .rules-grid{grid-template-columns:1fr!important}
          .main-layout>*:first-child{overflow:visible!important;height:auto!important;border-radius:12px!important;margin:10px!important}
          .main-layout>*:first-child>div{height:auto!important;overflow:visible!important}
          .main-layout>*:first-child>div>div{flex:none!important;min-height:0!important}
        }
      `}</style>


      {milestone && (
        <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: '#12121c', border: '1px solid rgba(0,209,122,.45)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 40px rgba(0,209,122,.16)', maxWidth: 520, width: 'calc(100vw - 48px)', fontFamily: SANS, animation: 'fadeUp .3s ease' }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>🏆</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#00d17a', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 3, fontFamily: SANS }}>Jalon atteint</div>
            <div style={{ fontSize: 13, color: '#eae8f5', lineHeight: 1.4 }}>Bravo — {milestone.value} {milestone.label}. Garde le cap.</div>
          </div>
          <button onClick={dismissMilestone} style={{ background: 'none', border: 'none', color: 'rgba(234,232,245,.35)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {notifHint && (
        <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: '#12121c', border: '1px solid rgba(124,58,237,.45)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 40px rgba(124,58,237,.16)', maxWidth: 520, width: 'calc(100vw - 48px)', fontFamily: SANS, animation: 'fadeUp .3s ease' }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>🔔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#7c3aed', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 3, fontFamily: SANS }}>Notifications</div>
            <div style={{ fontSize: 13, color: '#eae8f5', lineHeight: 1.4 }}>{notifHint}</div>
          </div>
          <button onClick={() => setNotifHint(null)} style={{ background: 'none', border: 'none', color: 'rgba(234,232,245,.35)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {connectHint && activeTab !== 'integrations' && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: '#12121c', border: '1px solid rgba(124,58,237,.45)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 40px rgba(124,58,237,.22)', maxWidth: 540, width: 'calc(100vw - 48px)', fontFamily: SANS, animation: 'fadeUp .3s ease' }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>🔌</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#7c3aed', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 3, fontFamily: SANS }}>Dernière étape</div>
            <div style={{ fontSize: 13, color: '#eae8f5', lineHeight: 1.45 }}>Connecte ta plateforme de trading pour que Caldra analyse tes trades en temps réel.</div>
          </div>
          <button onClick={() => { setActiveTab('integrations'); dismissConnectHint() }} style={{ background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 14px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
            Aller dans Intégrations
          </button>
          <button onClick={dismissConnectHint} style={{ background: 'none', border: 'none', color: 'rgba(234,232,245,.35)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: SANS, color: C.tx }}>

        {/* ── Top bar ── */}
        <div ref={topbarRef} className="topbar" style={{ display: 'flex', alignItems: 'center', height: 46, borderBottom: `.5px solid ${C.b}`, background: C.sf, flexShrink: 0, position: 'relative' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px 0 20px', borderRight: `.5px solid ${C.b}`, alignSelf: 'stretch', flexShrink: 0, height: 46, minHeight: 46 }}>
            <div style={{ width: 2, height: 17, background: C.red, borderRadius: 1 }} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 5, textTransform: 'uppercase' as const, color: C.tx }}>Cald<span style={{ color: C.red }}>ra</span></span>
          </div>
          {/* Statut notifications — déplacé ici (haut à gauche) */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
            {notifPerm === 'granted' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d17a' }} />
                <span className="date-lbl" style={{ fontSize: 10, color: C.td, fontFamily: SANS }}>Notifications actives</span>
              </div>
            ) : notifPerm === 'denied' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569' }} />
                <span className="date-lbl" style={{ fontSize: 10, color: C.te, fontFamily: SANS }}>Notifications désactivées</span>
              </div>
            ) : (
              <button onClick={requestNotifPermission}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 99, color: C.red, fontSize: 10, fontFamily: SANS, cursor: 'pointer', animation: 'pulse 2s infinite' }}>
                🔔 <span className="date-lbl">Activer les notifications</span>
              </button>
            )}
          </div>
          {/* Tabs — pill nav, centered absolutely */}
          <div className="nav-wrap" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
            <div className="tab-nav">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => { setActiveTab(tab.id as TabId); setSettingsOpen(false) }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {isMaxPlan(plan) && <DebriefMenu tradesToday={stats.total_trades} sessionEnd={liveRules?.session_end ?? null} />}
          </div>
          {/* Right controls */}
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 12, marginLeft: 'auto', flexShrink: 0, height: 46 }}>
            <span className="date-lbl" style={{ fontSize: 10, color: C.te, fontFamily: SANS }}>{displayDate}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: connected ? 'rgba(0,209,122,.06)' : C.rg, border: `.5px solid ${connected ? 'rgba(0,209,122,.18)' : C.rb}`, borderRadius: 99 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? C.g : C.red, animation: 'pulse 1.8s infinite' }} />
              <span style={{ fontSize: 9, color: connected ? C.g : C.red, letterSpacing: 1.2, textTransform: 'uppercase' as const, fontFamily: SANS }}>{connected ? 'Live' : 'Sync'}</span>
            </div>
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
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.red, fontFamily: SANS, background: 'rgba(124,58,237,.06)', border: `.5px solid rgba(124,58,237,.2)`, padding: '4px 10px', cursor: 'pointer', transition: 'all .2s', letterSpacing: .3 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,.06)' }}
              >
                <span style={{ fontSize: 11 }}>⬇</span> installer
              </button>
            )}
          </div>
          {/* Avatar / settings */}
          <div ref={settingsRef} style={{ position: 'relative', flexShrink: 0, paddingRight: 14 }}>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: settingsOpen || SETTINGS_ITEMS.some(s => s.id === activeTab) || activeTab === 'aide' ? C.rd : C.sf2,
                border: `.5px solid ${settingsOpen || SETTINGS_ITEMS.some(s => s.id === activeTab) || activeTab === 'aide' ? C.rb : C.b}`,
                color: settingsOpen || SETTINGS_ITEMS.some(s => s.id === activeTab) || activeTab === 'aide' ? C.red : C.tm,
                fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: SANS,
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
                  onClick={() => { setActiveTab('aide'); setSettingsOpen(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left',
                    background: activeTab === 'aide' ? C.rd : 'transparent', border: 'none', borderRadius: 7,
                    color: activeTab === 'aide' ? C.red : C.tm, fontSize: 12.5, fontFamily: SANS, cursor: 'pointer',
                    boxSizing: 'border-box', transition: 'background .12s',
                  }}
                  onMouseEnter={e => { if (activeTab !== 'aide') e.currentTarget.style.background = C.b }}
                  onMouseLeave={e => { if (activeTab !== 'aide') e.currentTarget.style.background = 'transparent' }}
                >
                  Aide &amp; support
                </button>
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
        <div className="main-layout" style={{ display: 'grid', gridTemplateColumns: activeTab === 'session' ? '20% 1fr' : '1fr', gridTemplateRows: 'minmax(0, 1fr)', flex: 1, overflow: 'hidden', minHeight: 0, height: 0, marginTop: topbarH }}>
          {activeTab === 'session' && <Sidebar score={score} alerts={alerts} stats={stats} rules={liveRules} />}

          <div className="panel-container" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {activeTab === 'session' && (
              <SessionPanel trades={trades} alerts={alerts} stats={stats} yesterdayStats={yesterdayStats} yesterdayTrend={yesterdayTrend} rules={liveRules} connected={!!platformConnected || ctraderConn} />
            )}
            {activeTab === 'calendrier' && (
              <CalendrierPanel sessions={historicalSessions} propFirmStart={(liveRules as any)?.prop_firm_started_at || null} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPanel sessions={historicalSessions} todayAlerts={alerts} journalTrades={journalTrades} accountSize={liveRules?.account_size || 10000} allTimePatterns={allTimePatterns} plan={plan} propFirm={(liveRules as any)?.prop_firm || null} propFirmStart={(liveRules as any)?.prop_firm_started_at || null} />
            )}
            {activeTab === 'rapports' && (
              <RapportsPanel plan={plan} onUpgrade={() => setActiveTab('billing')} />
            )}
            {activeTab === 'integrations' && <IntegrationsPanel apiKeyPrefix={apiKeyPrefix} initialWebhook={tradingRules?.slack_webhook_url ?? null} ctraderConn={ctraderConn} setCtraderConn={setCtraderConn} ctraderConflict={!!ctraderConflict} ctraderPending={!!ctraderPending} userId={userId} lastTradeAt={lastTradeAt} plan={plan} initialTgToken={tradingRules?.telegram_bot_token ?? null} initialTgChat={tradingRules?.telegram_chat_id ?? null} propFirmStart={(liveRules as any)?.prop_firm_started_at || null} />}
            {activeTab === 'regles' && <ReglesPanel initial={liveRules} plan={plan} onSaved={setLiveRules} />}
            {activeTab === 'billing' && <BillingPanel plan={plan} />}
            {activeTab === 'profil' && <ProfilPanel userEmail={userEmail} userMeta={userMeta} plan={plan} />}
            {activeTab === 'aide' && <SupportPanel userEmail={userEmail} />}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
    </ThemeCtx.Provider>
  )
}
