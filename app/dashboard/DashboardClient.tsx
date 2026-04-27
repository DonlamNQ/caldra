'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AlertRow } from '@/components/dashboard/AlertFeed'
import type { TradeRow } from '@/components/dashboard/TradeLog'
import type { DaySession } from './page'

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  red: '#ff5a3d', rd: 'rgba(255,90,61,.08)', rb: 'rgba(255,90,61,.2)', rg: 'rgba(255,90,61,.04)',
  bg: '#06060c', sf: '#0e0e18', sf2: '#131320',
  b: 'rgba(255,255,255,.04)', b2: 'rgba(255,255,255,.08)', b3: 'rgba(255,255,255,.14)',
  tx: '#d8d5e8', tm: 'rgba(216,213,232,.92)', td: 'rgba(216,213,232,.42)', te: 'rgba(216,213,232,.22)',
  g: '#00d17a', o: '#ffab00',
}
const SANS = "'DM Sans', sans-serif"
const MONO = "'DM Mono', monospace"

// ── Types ──────────────────────────────────────────────────────────────────────
interface TradingRules {
  max_daily_drawdown_pct: number
  max_consecutive_losses: number
  min_time_between_entries_sec: number
  session_start: string
  session_end: string
  max_trades_per_session: number
  max_risk_per_trade_pct: number
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
function scoreColor(s: number) { return s >= 70 ? C.g : s >= 40 ? C.o : C.red }

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
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update(); const id = setInterval(update, 1000); return () => clearInterval(id)
  }, [])
  return <span style={{ fontFamily: MONO, fontSize: 11, color: C.td }}>{time}</span>
}

// ── ScoreRingSvg ───────────────────────────────────────────────────────────────
function ScoreRingSvg({ score }: { score: number }) {
  const CIRC = 226
  const offset = CIRC - (CIRC * score / 100)
  const col = scoreColor(score)
  return (
    <div style={{ position: 'relative', width: 86, height: 86, flexShrink: 0 }}>
      <svg width="86" height="86" viewBox="0 0 86 86" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="43" cy="43" r="36" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="5.5" />
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
  const col = scoreColor(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: C.td, width: 80, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: col, borderRadius: 3, transition: 'width .6s, background .4s' }} />
      </div>
      <span style={{ fontSize: 12, color: C.td, fontFamily: MONO, width: 26, textAlign: 'right' as const }}>{value}</span>
    </div>
  )
}

// ── PnlChart (SVG) ─────────────────────────────────────────────────────────────
function PnlChart({ trades }: { trades: TradeRow[] }) {
  const sorted = [...trades]
    .filter(t => t.pnl != null && t.entry_time)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  const W = 600, H = 90, PX = 8, PY = 10
  const LC = 'rgba(216,213,232,.4)'
  const GRID = 'rgba(255,255,255,.06)'

  if (sorted.length === 0) {
    const yMid = H / 2
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <line x1={PX} y1={PY} x2={PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
        <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
        <line x1={PX} y1={yMid} x2={W - PX} y2={yMid} stroke={GRID} strokeWidth={0.5} strokeDasharray="4 6" />
        <text x={W / 2} y={yMid + 4} textAnchor="middle" fill="rgba(216,213,232,.18)" fontSize="10" fontFamily="'DM Mono',monospace">// en attente de trades</text>
      </svg>
    )
  }

  const pts: { t: string; v: number }[] = [{ t: 'open', v: 0 }]
  let cum = 0
  for (const t of sorted) { cum += t.pnl ?? 0; pts.push({ t: fmtTime(t.entry_time), v: cum }) }

  const vals = pts.map(p => p.v)
  const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
  const range = maxV - minV || 1
  const n = pts.length
  const xOf = (i: number) => PX + (i / Math.max(n - 1, 1)) * (W - 2 * PX)
  const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
  const y0 = yOf(0)

  if (n <= 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
        <line x1={PX} y1={PY} x2={PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
        <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
        <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke={GRID} strokeWidth={0.5} strokeDasharray="4 6" />
        {pts.map((p, i) => <circle key={i} cx={xOf(i)} cy={yOf(p.v)} r={3} fill={LC} />)}
      </svg>
    )
  }

  const linePts = pts.map((p, i) => `${xOf(i)},${yOf(p.v)}`).join(' ')
  const last = vals[vals.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
      <line x1={PX} y1={PY} x2={PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
      <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
      <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke={GRID} strokeWidth={0.5} strokeDasharray="4 6" />
      <polyline points={linePts} fill="none" stroke={LC} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.slice(1).map((p, i) => <circle key={i} cx={xOf(i + 1)} cy={yOf(p.v)} r={2} fill={C.bg} stroke={LC} strokeWidth={1} />)}
      <circle cx={xOf(n - 1)} cy={yOf(last)} r={3.5} fill={LC} />
    </svg>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ score, alerts, stats, rules, trades }: {
  score: number; alerts: AlertRow[]; stats: SessionStats; rules: TradingRules | null; trades: TradeRow[]
}) {
  const [paused, setPaused] = useState(false)
  const streak = consecutiveLosses(trades)
  const drawdownPct = rules
    ? Math.min(100, Math.round(Math.abs(Math.min(0, stats.total_pnl)) / ((rules.max_daily_drawdown_pct / 100) * 10000) * 100))
    : 0
  const tradesPct = rules ? Math.min(100, Math.round(stats.total_trades / rules.max_trades_per_session * 100)) : 0

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
    <div style={{ borderRight: `.5px solid ${C.b}`, display: 'flex', flexDirection: 'column', background: C.sf, overflowY: 'auto', overflowX: 'hidden' }}>

      {/* Score */}
      <div style={{ padding: '22px 20px 18px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, letterSpacing: .3, color: C.td, display: 'block', marginBottom: 12 }}>Score comportemental</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRingSvg score={score} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 7,
              padding: '4px 11px', borderRadius: 99, fontSize: 10, letterSpacing: .5,
              background: statusCls === 'ok' ? 'rgba(0,209,122,.07)' : statusCls === 'warn' ? 'rgba(255,171,0,.07)' : C.rd,
              border: `.5px solid ${statusCls === 'ok' ? 'rgba(0,209,122,.18)' : statusCls === 'warn' ? 'rgba(255,171,0,.2)' : C.rb}`,
              color: statusCls === 'ok' ? C.g : statusCls === 'warn' ? C.o : C.red,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
              {statusLabel}
            </div>
            <div style={{ fontSize: 11.5, color: C.td, lineHeight: 1.5, fontWeight: 300, fontStyle: 'italic' }}>{statusNote}</div>
          </div>
        </div>
      </div>

      {/* Métriques */}
      <div style={{ padding: '16px 20px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, letterSpacing: .3, color: C.td, display: 'block', marginBottom: 12 }}>Métriques</span>
        <MetricBar label="Sizing"     value={mSizing} />
        <MetricBar label="Risk/trade" value={mRisk} />
        <MetricBar label="Re-entrées" value={mReentry} />
        <MetricBar label="Drawdown"   value={mDrawdown} />
        <MetricBar label="Horaires"   value={mDiscipline} />
      </div>

      {/* Règles du jour */}
      {rules && (
        <div style={{ padding: '16px 20px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
          <span style={{ fontSize: 11, letterSpacing: .3, color: C.td, display: 'block', marginBottom: 12 }}>Règles du jour</span>
          {[
            { label: 'Max trades', cur: stats.total_trades, max: rules.max_trades_per_session, pct: tradesPct },
            { label: 'Drawdown',   cur: `${drawdownPct}%`, max: `${rules.max_daily_drawdown_pct}%`, pct: drawdownPct },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i === 0 ? `.5px solid rgba(255,255,255,.04)` : 'none' }}>
              <span style={{ fontSize: 12, color: C.td }}>{r.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 13, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{r.cur}</span>
                <span style={{ fontSize: 11, color: C.te, fontFamily: MONO }}>/ {r.max}</span>
                <div style={{ width: 40, height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: scoreColor(100 - r.pct), borderRadius: 2, transition: 'width .4s' }} />
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 12, color: C.td }}>Fenêtre</span>
            <span style={{ fontSize: 11, color: C.g, fontFamily: MONO }}>{rules.session_start}–{rules.session_end}</span>
          </div>
        </div>
      )}

      {/* Streak */}
      <div style={{ padding: '13px 20px', borderBottom: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 300, letterSpacing: -1, color: streak >= 3 ? C.red : C.tm, transition: 'color .3s' }}>{streak}</div>
          <div style={{ fontSize: 12, color: C.td, marginTop: 2 }}>{streak <= 1 ? 'perte consécutive' : 'pertes consécutives'}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < streak ? C.red : 'rgba(255,255,255,.12)', opacity: i < streak ? .85 : 1, transition: 'background .3s' }} />
          ))}
        </div>
      </div>

      {/* Alertes */}
      <div style={{ padding: '15px 20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <span style={{ fontSize: 11, letterSpacing: .3, color: C.td }}>Alertes</span>
          {alerts.length > 0 && (
            <span style={{ fontSize: 9, fontFamily: MONO, padding: '2px 8px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 99, color: C.red }}>
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.te, fontStyle: 'italic' }}>Aucune alerte — session saine.</div>
        ) : (
          alerts.slice(0, 8).map((a, i) => (
            <div key={a.id ?? i} style={{ padding: '10px 0', borderBottom: i < Math.min(alerts.length, 8) - 1 ? `.5px solid ${C.b}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 9, fontFamily: MONO, padding: '2px 7px', borderRadius: 4,
                  background: (a.level ?? 1) >= 2 ? C.rd : 'rgba(255,171,0,.09)',
                  border: `.5px solid ${(a.level ?? 1) >= 2 ? C.rb : 'rgba(255,171,0,.22)'}`,
                  color: (a.level ?? 1) >= 2 ? C.red : C.o,
                }}>L{a.level ?? 1}</span>
                <span style={{ fontSize: 11, color: C.td, letterSpacing: .3 }}>{(a.type ?? '').replace(/_/g, ' ')}</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.tm, lineHeight: 1.45, fontWeight: 300 }}>{a.message}</div>
            </div>
          ))
        )}
      </div>

      {/* Pause */}
      <div style={{ padding: '12px 20px', borderTop: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <button
          onClick={() => setPaused(p => !p)}
          style={{ width: '100%', padding: 11, background: C.rg, border: `.5px solid ${C.rb}`, borderRadius: 7, color: C.red, fontSize: 11, fontFamily: SANS, cursor: 'pointer', letterSpacing: 1, transition: 'background .2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = C.rd)}
          onMouseLeave={e => (e.currentTarget.style.background = C.rg)}
        >
          {paused ? '▶ Reprendre la session' : '⏸ Pause session'}
        </button>
      </div>
    </div>
  )
}

// ── SessionPanel ───────────────────────────────────────────────────────────────
function SessionPanel({ trades, alerts, stats, yesterdayStats, rules }: {
  trades: TradeRow[]; alerts: AlertRow[]; stats: SessionStats
  yesterdayStats: { score: number; pnl: number; alerts: number } | null; rules: TradingRules | null
}) {
  const [note, setNote] = useState('')
  const sortedTrades = [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())
  const drawdownPct = rules
    ? Math.min(100, Math.round(Math.abs(Math.min(0, stats.total_pnl)) / ((rules.max_daily_drawdown_pct / 100) * 10000) * 100))
    : 0

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>

      {/* Row 1: PnL card | Chart | 4 mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'start' }}>

        {/* PnL card */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 22px', minWidth: 160 }}>
          <div style={{ fontSize: 10.5, color: C.td, marginBottom: 8 }}>P&L de session</div>
          <div style={{ fontSize: 34, fontWeight: 300, letterSpacing: -2, lineHeight: 1, color: '#fff' }}>
            {fmtEur(stats.total_pnl)}
          </div>
          <div style={{ fontSize: 10.5, color: C.td, fontFamily: MONO, marginTop: 5 }}>Session en cours</div>
        </div>

        {/* Chart */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: C.td }}>Courbe de session</div>
          <div style={{ height: 90, position: 'relative' }}>
            <PnlChart trades={trades} />
          </div>
        </div>

        {/* 4 mini stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 200 }}>
          {[
            { val: fmtEur(stats.total_pnl), lbl: 'P&L', col: '#fff' },
            { val: String(stats.total_trades), lbl: 'Trades', col: C.te },
            { val: `${drawdownPct}%`, lbl: 'Drawdown', col: drawdownPct > 70 ? C.red : drawdownPct > 40 ? C.o : C.te },
            { val: String(alerts.length), lbl: 'Alertes', col: alerts.length > 0 ? C.red : C.te },
          ].map((item, i) => (
            <div key={i} style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 9, padding: '11px 13px' }}>
              <div style={{ fontSize: 16, fontWeight: 300, letterSpacing: -.5, color: item.col }}>{item.val}</div>
              <div style={{ fontSize: 9.5, color: C.te, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: MONO, marginTop: 3 }}>{item.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: J-1 */}
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '12px 18px', display: 'flex', gap: 22, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: C.te, letterSpacing: .5, marginRight: 4 }}>Hier</div>
        {yesterdayStats ? (
          <>
            {[
              { val: fmtEur(yesterdayStats.pnl), lbl: 'P&L' },
              { val: String(yesterdayStats.score), lbl: 'Score' },
              { val: String(yesterdayStats.alerts), lbl: 'Alertes' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
                {i > 0 && <div style={{ width: .5, height: 18, background: C.b2 }} />}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: -.3, color: C.tm }}>{item.val}</div>
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
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 180 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 10.5, color: C.td }}>Flux de trades</span>
          <span style={{ fontSize: 10, color: C.te, fontFamily: MONO }}>surbrillance = alerte comportementale</span>
        </div>
        {sortedTrades.length === 0 ? (
          <div style={{ fontSize: 12, color: C.te, fontStyle: 'italic', fontWeight: 300, padding: '10px 0' }}>
            Aucun trade aujourd'hui — connectez votre plateforme via l'onglet Intégrations.
          </div>
        ) : (
          sortedTrades.map((t, i) => {
            const flaggedAlert = alerts.find(a => a.created_at && t.entry_time && Math.abs(new Date(a.created_at).getTime() - new Date(t.entry_time).getTime()) < 90000)
            const hasCrit = flaggedAlert && (flaggedAlert.level ?? 1) >= 2
            const hasWarn = flaggedAlert && (flaggedAlert.level ?? 1) === 1
            return (
              <div key={t.id ?? i} style={{
                display: 'grid', gridTemplateColumns: '50px 1fr auto', alignItems: 'center',
                minHeight: 30, borderBottom: `.5px solid rgba(255,255,255,.04)`,
                background: hasCrit ? 'rgba(255,90,61,.04)' : hasWarn ? 'rgba(255,171,0,.04)' : 'transparent',
                borderLeft: hasCrit ? `2px solid rgba(255,90,61,.45)` : hasWarn ? `2px solid rgba(255,171,0,.4)` : 'none',
                padding: hasCrit || hasWarn ? '0 4px 0 10px' : '0',
                borderRadius: hasCrit || hasWarn ? '0 6px 6px 0' : '0',
              }}>
                <span style={{ fontSize: 10.5, color: C.td, fontFamily: MONO }}>{fmtTime(t.entry_time)}</span>
                <span style={{ fontSize: 13.5, color: C.tm, fontWeight: 400 }}>
                  {t.symbol} {t.direction === 'long' ? 'Long' : 'Short'} ×{t.size}
                  {flaggedAlert && (
                    <span style={{
                      fontSize: 8.5, padding: '2px 7px', borderRadius: 99, fontFamily: MONO, marginLeft: 7,
                      background: hasCrit ? C.rd : 'rgba(255,171,0,.09)',
                      border: `.5px solid ${hasCrit ? C.rb : 'rgba(255,171,0,.2)'}`,
                      color: hasCrit ? C.red : C.o,
                    }}>{(flaggedAlert.type ?? '').toLowerCase().replace(/_/g, ' ')}</span>
                  )}
                </span>
                <span style={{ fontSize: 13, fontFamily: MONO, color: '#fff', whiteSpace: 'nowrap' as const, paddingLeft: 8 }}>
                  {(t.pnl ?? 0) >= 0 ? '+' : ''}{(t.pnl ?? 0).toFixed(0)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Row 4: Note */}
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '12px 16px', flexShrink: 0 }}>
        <textarea
          value={note} onChange={e => setNote(e.target.value)} rows={2}
          placeholder="Contexte, état du marché, comment tu te sens..."
          style={{ width: '100%', background: 'rgba(255,255,255,.02)', border: `.5px solid ${C.b}`, borderRadius: 7, padding: '7px 11px', color: C.tm, fontSize: 11, fontFamily: SANS, resize: 'none' as const, outline: 'none', lineHeight: 1.6, fontWeight: 300, boxSizing: 'border-box' as const, transition: 'border-color .2s' }}
        />
      </div>
    </div>
  )
}

// ── CalendrierPanel ────────────────────────────────────────────────────────────
function CalendrierPanel({ sessions }: { sessions: DaySession[] }) {
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
                <div key={d} style={{ minHeight: 68, borderRadius: 9, border: `.5px solid ${C.b}`, background: C.sf, display: 'flex', flexDirection: 'column', padding: 9, opacity: 0.25 }}>
                  <div style={{ fontSize: 11, color: C.te, fontFamily: MONO }}>{d}</div>
                </div>
              )
            }
            const col = scoreColor(s.score)
            const cellBg = s.score >= 70 ? 'rgba(0,209,122,.06)' : s.score >= 40 ? 'rgba(255,171,0,.06)' : 'rgba(255,90,61,.06)'
            const cellBorder = isSelected
              ? 'rgba(255,90,61,.5)'
              : s.score >= 70 ? 'rgba(0,209,122,.15)' : s.score >= 40 ? 'rgba(255,171,0,.15)' : 'rgba(255,90,61,.15)'

            return (
              <div key={d} onClick={() => setSelectedDate(isSelected ? null : dateStr)} style={{
                minHeight: 74, borderRadius: 9, border: `.5px solid ${cellBorder}`,
                background: isSelected ? 'rgba(255,90,61,.12)' : cellBg,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: 9,
                position: 'relative', transition: 'all .18s',
                outline: isSelected ? '1.5px solid rgba(255,90,61,.5)' : 'none', outlineOffset: 1,
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
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: 'linear-gradient(90deg,transparent,rgba(255,90,61,.3),transparent)' }} />
              <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 10 }}>{selectedDate}</div>
              <div style={{ fontSize: 38, fontWeight: 300, letterSpacing: -1.5, lineHeight: 1, color: scoreColor(selectedSession.score) }}>{selectedSession.score}</div>
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
              const col = scoreColor(avg)
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
                      if (!ds) return <div key={d} style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}><span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.3)', fontFamily: MONO }}>{d}</span></div>
                      const dc = scoreColor(ds.score)
                      const dbg = ds.score >= 70 ? 'rgba(0,209,122,' : ds.score >= 40 ? 'rgba(255,171,0,' : 'rgba(255,90,61,'
                      return (
                        <div key={d} onClick={() => setSelectedDate(cellDate(d))} style={{ width: 40, height: 40, borderRadius: 8, background: `${dbg}.09)`, border: `.5px solid ${dbg}.2)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', transition: 'filter .15s' }}>
                          <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 500, color: dc }}>{ds.score}</span>
                          <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,.3)', fontFamily: MONO }}>{d}</span>
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
                { val: String(avgScore), lbl: 'Score moy.', col: scoreColor(avgScore) },
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
            const W2 = 600, H2 = 60, PX2 = 4, PY2 = 6
            const xOf = (i: number) => PX2 + (i / (n - 1)) * (W2 - 2 * PX2)
            const yOf = (v: number) => PY2 + (H2 - 2 * PY2) - ((v - minV) / range) * (H2 - 2 * PY2)
            const pts = cumulPts.map((p, i) => `${xOf(i)},${yOf(p.v)}`).join(' ')
            const y0 = yOf(0)
            return (
              <div style={{ marginTop: 12, height: 60 }}>
                <svg viewBox={`0 0 ${W2} ${H2}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <line x1={PX2} y1={y0} x2={W2 - PX2} y2={y0} stroke="rgba(255,255,255,.06)" strokeWidth={1} strokeDasharray="4 6" />
                  <polyline points={pts} fill="none" stroke="#e2e8f0" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </div>
            )
          })()}
        </div>

        {/* Score moyen */}
        <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: C.td, letterSpacing: .3, marginBottom: 16 }}>Score moyen</div>
          <div style={{ fontSize: 34, fontWeight: 300, letterSpacing: -2, lineHeight: 1, marginBottom: 3, color: scoreColor(avgScore) }}>{avgScore}</div>
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
              const col = avg !== null ? scoreColor(avg) : C.te
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
  const now = new Date()
  const weekNum = Math.ceil(now.getDate() / 7)
  const monthName = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  const reports = [
    { icon: '📋', title: `Rapport hebdomadaire — Sem. ${weekNum} (actuelle)`, sub: 'En cours de génération — disponible vendredi', badge: 'En attente', badgeCol: C.td, badgeBg: 'rgba(255,255,255,.04)', badgeBorder: C.b, canDownload: false },
    { icon: '📋', title: `Rapport hebdomadaire — Sem. ${weekNum - 1}`, sub: 'Session précédente', badge: 'Généré', badgeCol: C.g, badgeBg: 'rgba(0,209,122,.07)', badgeBorder: 'rgba(0,209,122,.2)', canDownload: true },
    { icon: '📋', title: `Rapport hebdomadaire — Sem. ${weekNum - 2}`, sub: 'Il y a 2 semaines', badge: 'Généré', badgeCol: C.g, badgeBg: 'rgba(0,209,122,.07)', badgeBorder: 'rgba(0,209,122,.2)', canDownload: true },
    { icon: '📊', title: `Rapport mensuel — ${monthName}`, sub: `Disponible le 1er du mois prochain`, badge: 'En attente', badgeCol: C.td, badgeBg: 'rgba(255,255,255,.04)', badgeBorder: C.b, canDownload: false },
  ]

  return (
    <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.3, marginBottom: 5 }}>Rapports automatiques</div>
        <div style={{ fontSize: 12.5, color: C.td }}>Générés chaque vendredi + 1er du mois. PDF téléchargeable.</div>
      </div>
      {reports.map((r, i) => (
        <div key={i} style={{
          background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 20,
          display: 'flex', alignItems: 'center', gap: 16,
          opacity: r.canDownload ? 1 : .45, cursor: r.canDownload ? 'pointer' : 'not-allowed',
          transition: 'all .18s',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 400, color: C.tx, marginBottom: 4 }}>{r.title}</div>
            <div style={{ fontSize: 11.5, color: C.td }}>{r.sub}</div>
          </div>
          <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontFamily: MONO, whiteSpace: 'nowrap' as const, background: r.badgeBg, border: `.5px solid ${r.badgeBorder}`, color: r.badgeCol }}>{r.badge}</span>
          {r.canDownload && (
            <button style={{ fontSize: 12, padding: '7px 16px', border: `.5px solid ${C.b2}`, borderRadius: 7, color: C.td, background: 'transparent', cursor: 'pointer', transition: 'all .2s', fontFamily: SANS, whiteSpace: 'nowrap' as const }}>↓ PDF</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── IntegrationsPanel ──────────────────────────────────────────────────────────
function IntegrationsPanel({ apiKeyPrefix }: { apiKeyPrefix: string | null }) {
  const hasKey = !!apiKeyPrefix
  const [copied, setCopied] = useState(false)

  function copyBot() {
    fetch('/CaldraBot.algo').then(r => r.text()).then(code => {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Colonne gauche : cTrader OAuth + CaldraBot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* cTrader OAuth */}
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: C.tm, fontFamily: MONO }}>CT</div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: C.tx }}>cTrader</div>
                <div style={{ fontSize: 11, color: C.td }}>Étape 1 — Connexion OAuth</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasKey ? C.g : 'rgba(255,255,255,.18)' }} />
                <span style={{ color: hasKey ? C.g : C.td, letterSpacing: .5 }}>{hasKey ? 'CONNECTÉ' : 'NON CONNECTÉ'}</span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: C.td, marginBottom: 4 }}>Clé API configurée</div>
              <div style={{ fontSize: 15, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{hasKey ? `${apiKeyPrefix}…` : '—'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <IntBtn primary href="/settings/api">{hasKey ? 'Gérer la clé' : 'Générer une clé'}</IntBtn>
            </div>
          </IntCard>

          {/* CaldraBot */}
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.tx }}>CaldraBot</div>
                <div style={{ fontSize: 11, color: C.td }}>Étape 2 — Envoi automatique des trades</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
                <span style={{ color: C.td, letterSpacing: .5 }}>INACTIF</span>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: C.td, lineHeight: 1.6, marginBottom: 16 }}>
              Installez le cBot dans cTrader pour envoyer vos trades en temps réel à Caldra dès qu'une position se ferme.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {[
                ['1', <>Téléchargez <span style={{ fontFamily: MONO, color: C.tm, fontWeight: 500 }}>CaldraBot.algo</span> ci-dessous et ouvrez-le via <span style={{ color: C.tm }}>Automate → Open</span>.</>],
                ['2', <>Récupérez votre clé API depuis <span style={{ fontFamily: MONO, color: C.red }}>/settings/api</span>.</>],
                ['3', <>Démarrez le cBot et collez votre clé dans le paramètre <span style={{ color: C.tm }}>Caldra API Key</span>.</>],
                ['4', 'Chaque position fermée sera automatiquement analysée dans votre dashboard.'],
              ].map(([n, t]) => (
                <div key={String(n)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.rd, border: `.5px solid ${C.rb}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.red, fontFamily: MONO, flexShrink: 0, marginTop: 1 }}>{n}</div>
                  <div style={{ fontSize: 12.5, color: C.td, lineHeight: 1.5 }}>{t}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/CaldraBot.algo" download="CaldraBot.algo" style={{ flex: 1.4, padding: 9, borderRadius: 7, fontSize: 11, fontFamily: SANS, cursor: 'pointer', textAlign: 'center' as const, textDecoration: 'none', background: C.rd, border: `.5px solid ${C.rb}`, color: C.red, display: 'block', transition: 'all .2s' }}>
                ↓ Télécharger CaldraBot.algo
              </a>
              <IntBtn onClick={copyBot}>{copied ? '✓ Copié' : 'Copier le code'}</IntBtn>
            </div>
          </IntCard>
        </div>

        {/* Colonne droite : MT5 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(255,171,0,.06)', border: `.5px solid rgba(255,171,0,.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: C.o, fontFamily: MONO }}>MT5</div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: C.tx }}>MetaTrader 5</div>
                <div style={{ fontSize: 11, color: C.td }}>Futures · Forex · EA Caldra</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
                <span style={{ color: C.td, letterSpacing: .5 }}>VIA API</span>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: C.td, lineHeight: 1.6, marginBottom: 18 }}>
              Utilisez l'EA Caldra pour envoyer vos trades MT5 automatiquement via la clé API.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <IntBtn href="/settings/api">Configurer la clé API →</IntBtn>
            </div>
          </IntCard>

          {/* API directe */}
          <IntCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: C.tm, fontFamily: MONO }}>API</div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: C.tx }}>API directe</div>
                <div style={{ fontSize: 11, color: C.td }}>POST /api/ingest</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasKey ? C.g : 'rgba(255,255,255,.18)' }} />
                <span style={{ color: hasKey ? C.g : C.td }}>{hasKey ? 'Active' : 'Inactif'}</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.02)', border: `.5px solid ${C.b}`, borderRadius: 6, padding: '9px 13px', fontSize: 10, fontFamily: MONO, color: C.td, marginBottom: 14 }}>
              <div style={{ color: C.te, marginBottom: 3 }}>POST https://getcaldra.com/api/ingest</div>
              <div>Header: x-caldra-key: {hasKey ? `${apiKeyPrefix}…` : '<votre-clé>'}</div>
            </div>
            <IntBtn href="/settings/api">Gérer les clés API →</IntBtn>
          </IntCard>
        </div>
      </div>
    </div>
  )
}

// ── ReglesPanel ────────────────────────────────────────────────────────────────
function ReglesPanel({ initial }: { initial: TradingRules | null }) {
  const defaults: TradingRules = {
    max_daily_drawdown_pct: 3, max_consecutive_losses: 3,
    min_time_between_entries_sec: 120, session_start: '09:30',
    session_end: '16:00', max_trades_per_session: 10, max_risk_per_trade_pct: 1,
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
          <RuleGroup title="Risk management" desc="Niveau 2 si seuil dépassé" accent="rgba(255,90,61,.5)">
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
interface ChatMsg { role: 'user' | 'assistant'; content: string; time: string }

function SentinelPanel({ stats, alerts, score, rules }: {
  stats: SessionStats; alerts: AlertRow[]; score: number; rules: TradingRules | null
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: `Bonjour. Session ouverte. Score comportemental actuel : ${score}/100. ${alerts.length === 0 ? 'Aucune alerte — continuez comme ça.' : `${alerts.length} alerte(s) active(s) — je surveille.`}`,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }])
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
        <div>
          <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: -.3, color: C.tx, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 9 }}>
            Sentinel IA
            <span style={{ fontSize: 10, padding: '3px 9px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 99, color: C.red, letterSpacing: .5 }}>Plan Sentinel</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.td }}>Coach IA actif pendant la session. Analyse ton comportement et te parle en temps réel.</div>
        </div>

        <div style={{ flex: 1, background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 400 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: .5, background: 'linear-gradient(90deg,transparent,rgba(255,90,61,.3),transparent)' }} />
          <div style={{ paddingBottom: 14, borderBottom: `.5px solid ${C.b}`, marginBottom: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: C.tx, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 9 }}>
              Sentinel
              <span style={{ fontSize: 9, padding: '3px 9px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 99, color: C.red, letterSpacing: .5 }}>IA Active</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.td }}>Analyse en temps réel · Répond à tes questions · Debriefing automatique</div>
          </div>

          <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 16, minHeight: 0 }}>
            {msgs.map((m, i) => m.role === 'assistant' ? (
              <div key={i} style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: '10px 10px 10px 2px', padding: '12px 14px', maxWidth: '85%' }}>
                <div style={{ fontSize: 12.5, color: C.tm, lineHeight: 1.55, fontWeight: 300 }}>{m.content}</div>
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

        <div style={{ padding: '16px 0', borderBottom: `.5px solid ${C.b}` }}>
          <div style={{ fontSize: 10, letterSpacing: .3, color: C.te, marginBottom: 10 }}>Session actuelle</div>
          {[
            { k: 'Score', v: `${score} / 100`, c: scoreColor(score) },
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

// ── Main component ─────────────────────────────────────────────────────────────
const TABS: Array<{ id: string; label: string; sentinel?: boolean }> = [
  { id: 'session',       label: 'Session live' },
  { id: 'calendrier',   label: 'Calendrier' },
  { id: 'analytics',    label: 'Analytics' },
  { id: 'rapports',     label: 'Rapports' },
  { id: 'integrations', label: 'Intégrations' },
  { id: 'regles',       label: 'Règles' },
  { id: 'sentinel',     label: 'Sentinel IA', sentinel: true },
]

type TabId = 'session' | 'calendrier' | 'analytics' | 'rapports' | 'integrations' | 'regles' | 'sentinel'

export default function DashboardClient({
  userId, userEmail, initialScore, initialAlerts, initialTrades, initialStats,
  yesterdayStats, tradingRules, apiKeyPrefix, historicalSessions,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('session')
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts)
  const [trades, setTrades] = useState<TradeRow[]>(initialTrades)
  const [stats, setStats] = useState<SessionStats>(initialStats)
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<any>(null)
  const today = new Date().toISOString().split('T')[0]
  const score = computeScore(alerts)

  useEffect(() => {
    const supabase = createClient()
    channelRef.current = supabase
      .channel('caldra-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${userId}` }, (payload) => {
        const a = payload.new as AlertRow & { session_date?: string; user_id?: string }
        if (a.session_date && a.session_date !== today) return
        setAlerts(prev => [a, ...prev])
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
  }, [userId, today])

  const displayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;background:${C.bg}}
        ::-webkit-scrollbar{width:0;height:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.15}}
        @keyframes sli{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
        .tab-btn{padding:11px 0;font-size:11px;letter-spacing:.5px;color:${C.td};cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;font-family:${SANS};background:none;border-top:none;border-left:none;border-right:none;white-space:nowrap;flex:1;text-align:center;font-weight:400}
        .tab-btn:hover{color:${C.tm}}
        .tab-btn.active{color:${C.tx};border-bottom-color:${C.red};font-weight:500}
        .tab-sentinel{color:rgba(255,90,61,.5)!important}
        .tab-sentinel.active{color:${C.red}!important;border-bottom-color:${C.red}}
        textarea,input{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        input[type=time]::-webkit-calendar-picker-indicator{filter:invert(.3)}
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: SANS, color: C.tx }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 26px', borderBottom: `.5px solid ${C.b}`, background: C.sf, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 400, letterSpacing: 5, textTransform: 'uppercase' as const, color: '#fff' }}>
              Cald<span style={{ color: C.red }}>ra</span>
            </div>
            <div style={{ fontSize: 7.5, letterSpacing: 9.5, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.55)', display: 'block', marginTop: 4 }}>Session</div>
          </div>
          <div style={{ fontSize: 11, color: C.td, fontFamily: MONO, letterSpacing: .3 }}>{displayDate}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', background: connected ? 'rgba(0,209,122,.06)' : C.rg, border: `.5px solid ${connected ? 'rgba(0,209,122,.18)' : C.rb}`, borderRadius: 99 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? C.g : C.red, animation: 'pulse 1.8s infinite' }} />
              <span style={{ fontSize: 9, color: connected ? C.g : C.red, letterSpacing: 1.2, textTransform: 'uppercase' as const, fontFamily: MONO }}>{connected ? 'Live' : 'Sync'}</span>
            </div>
            <LiveClock />
            <button
              onClick={() => { window.location.href = '/login' }}
              style={{ fontSize: 11, color: C.te, fontFamily: SANS, background: 'none', border: 'none', cursor: 'pointer', transition: 'color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.td)}
              onMouseLeave={e => (e.currentTarget.style.color = C.te)}
            >logout</button>
          </div>
        </div>

        {/* ── Tab nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `.5px solid ${C.b}`, background: C.sf, padding: 0, flexShrink: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn${tab.sentinel ? ' tab-sentinel' : ''}${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id as TabId)}
            >
              {tab.label}
              {tab.sentinel && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: C.red, marginLeft: 5, verticalAlign: 'middle', animation: 'pulse 2s infinite' }} />}
            </button>
          ))}
        </div>

        {/* ── Main layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '20% 1fr', flex: 1, overflow: 'hidden', minHeight: 0, height: 0 }}>
          <Sidebar score={score} alerts={alerts} stats={stats} rules={tradingRules} trades={trades} />

          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {activeTab === 'session' && (
              <SessionPanel trades={trades} alerts={alerts} stats={stats} yesterdayStats={yesterdayStats} rules={tradingRules} />
            )}
            {activeTab === 'calendrier' && (
              <CalendrierPanel sessions={historicalSessions} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPanel sessions={historicalSessions} todayAlerts={alerts} />
            )}
            {activeTab === 'rapports' && <RapportsPanel />}
            {activeTab === 'integrations' && <IntegrationsPanel apiKeyPrefix={apiKeyPrefix} />}
            {activeTab === 'regles' && <ReglesPanel initial={tradingRules} />}
            {activeTab === 'sentinel' && (
              <SentinelPanel stats={stats} alerts={alerts} score={score} rules={tradingRules} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
