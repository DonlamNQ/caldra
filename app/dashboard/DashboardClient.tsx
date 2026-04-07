'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AlertRow } from '@/components/dashboard/AlertFeed'
import type { TradeRow } from '@/components/dashboard/TradeLog'
import type { DaySession } from './page'

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  red: '#dc503c', rd: 'rgba(220,80,60,.1)', rb: 'rgba(220,80,60,.25)', rg: 'rgba(220,80,60,.06)',
  bg: '#08080d', sf: '#0f0f16', sf2: '#141420',
  b: 'rgba(255,255,255,.07)', b2: 'rgba(255,255,255,.15)',
  tx: '#f0ede8', tm: 'rgba(240,237,232,.95)', td: 'rgba(240,237,232,.7)', te: 'rgba(240,237,232,.45)',
  g: '#3cc87a', o: '#f5a623',
}
const SANS = "'Geist', sans-serif"
const MONO = "'Geist Mono', monospace"

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

// ── LiveClock ──────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update(); const id = setInterval(update, 1000); return () => clearInterval(id)
  }, [])
  return <span style={{ fontFamily: MONO, fontSize: 10, color: C.td }}>{time}</span>
}

// ── ScoreRingSvg ───────────────────────────────────────────────────────────────
function ScoreRingSvg({ score }: { score: number }) {
  const C2 = 233
  const offset = C2 - (C2 * score / 100)
  const col = scoreColor(score)
  return (
    <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0, cursor: 'default' }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="44" cy="44" r="37" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="6" />
        <circle cx="44" cy="44" r="37" fill="none" stroke={col} strokeWidth="6"
          strokeDasharray="233" strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s, stroke .5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32, fontWeight: 200, letterSpacing: -2, lineHeight: 1, color: col, fontFamily: SANS, transition: 'color .5s' }}>{score}</span>
        <span style={{ fontSize: 10, color: C.td, fontFamily: MONO, marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

// ── MetricBar ──────────────────────────────────────────────────────────────────
function MetricBar({ label, value }: { label: string; value: number }) {
  const col = scoreColor(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: C.td, fontFamily: MONO, width: 82, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: col, borderRadius: 2, transition: 'width .6s, background .4s' }} />
      </div>
      <span style={{ fontSize: 12, color: C.tm, fontFamily: MONO, width: 24, textAlign: 'right', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function metricScore(alerts: AlertRow[], type: string): number {
  const count = alerts.filter(a => (a.type ?? (a as any).pattern ?? '').includes(type)).length
  return Math.max(0, 100 - count * 25)
}

// ── PnlChart (SVG) ─────────────────────────────────────────────────────────────
function PnlChart({ trades }: { trades: TradeRow[] }) {
  const sorted = [...trades]
    .filter(t => t.pnl != null && t.entry_time)
    .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())

  if (sorted.length < 2) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.te, fontSize: 11, fontFamily: MONO }}>
        {sorted.length === 0 ? '// aucun trade — session en attente' : '// données insuffisantes'}
      </div>
    )
  }

  const pts: { t: string; v: number }[] = [{ t: 'open', v: 0 }]
  let cum = 0
  for (const t of sorted) { cum += t.pnl ?? 0; pts.push({ t: fmtTime(t.entry_time), v: cum }) }

  const W = 600, H = 100, PX = 4, PY = 8
  const vals = pts.map(p => p.v)
  const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
  const range = maxV - minV || 1
  const n = pts.length
  const xOf = (i: number) => PX + (i / (n - 1)) * (W - 2 * PX)
  const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
  const y0 = yOf(0)
  const last = vals[vals.length - 1]
  const lc = last >= 0 ? C.g : C.red
  const linePts = pts.map((p, i) => `${xOf(i)},${yOf(p.v)}`).join(' ')
  const fillPath = `M${xOf(0)},${y0} ${pts.map((p, i) => `L${xOf(i)},${yOf(p.v)}`).join(' ')} L${xOf(n - 1)},${y0} Z`

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', flex: 1 }} preserveAspectRatio="none">
        <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke="rgba(255,255,255,.06)" strokeWidth={1} strokeDasharray="4 6" />
        <path d={fillPath} fill={last >= 0 ? 'rgba(60,200,122,.06)' : 'rgba(220,80,60,.06)'} />
        <polyline points={linePts} fill="none" stroke={lc} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.slice(1).map((p, i) => <circle key={i} cx={xOf(i + 1)} cy={yOf(p.v)} r={2} fill={C.bg} stroke={lc} strokeWidth={1} />)}
        <circle cx={xOf(n - 1)} cy={yOf(last)} r={3.5} fill={lc} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
        {[pts[0], pts[Math.floor(n / 2)], pts[n - 1]].map((p, i) => (
          <span key={i} style={{ fontSize: 9, color: C.te, fontFamily: MONO }}>{p.t}</span>
        ))}
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  score: number
  alerts: AlertRow[]
  stats: SessionStats
  rules: TradingRules | null
  trades: TradeRow[]
}

function Sidebar({ score, alerts, stats, rules, trades }: SidebarProps) {
  const [paused, setPaused] = useState(false)
  const hasCritical = alerts.some(a => (a.level ?? 1) >= 3)
  const streak = consecutiveLosses(trades)
  const drawdownPct = rules
    ? Math.min(100, Math.round(Math.abs(Math.min(0, stats.total_pnl)) / ((rules.max_daily_drawdown_pct / 100) * 10000) * 100))
    : 0
  const tradesPct = rules ? Math.min(100, Math.round(stats.total_trades / rules.max_trades_per_session * 100)) : 0

  const statusLabel = score >= 70 ? 'Contrôlé' : score >= 40 ? 'Attention' : 'STOP'
  const statusCls = score >= 70 ? 'ok' : score >= 40 ? 'warn' : 'danger'

  const mSizing    = metricScore(alerts, 'revenge_sizing')
  const mRisk      = metricScore(alerts, 'drawdown')
  const mReentry   = metricScore(alerts, 'reentry')
  const mDrawdown  = Math.max(0, 100 - drawdownPct)
  const mDiscipline = metricScore(alerts, 'outside_session')

  return (
    <div style={{ borderRight: `.5px solid ${C.b}`, display: 'flex', flexDirection: 'column', background: C.sf, overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Score */}
      <div style={{ padding: '24px 22px 20px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(220,80,60,.45),transparent)' }} />
        <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, display: 'block', marginBottom: 12 }}>Score comportemental</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <ScoreRingSvg score={score} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 100, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' as const,
              background: statusCls === 'ok' ? 'rgba(60,200,122,.07)' : statusCls === 'warn' ? 'rgba(245,166,35,.07)' : C.rd,
              border: `.5px solid ${statusCls === 'ok' ? 'rgba(60,200,122,.2)' : statusCls === 'warn' ? 'rgba(245,166,35,.22)' : C.rb}`,
              color: statusCls === 'ok' ? C.g : statusCls === 'warn' ? C.o : C.red,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
              {statusLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Métriques */}
      <div style={{ padding: '18px 22px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, display: 'block', marginBottom: 2 }}>Métriques</span>
        <MetricBar label="Sizing"      value={mSizing} />
        <MetricBar label="Risk/trade"  value={mRisk} />
        <MetricBar label="Re-entrées"  value={mReentry} />
        <MetricBar label="Drawdown"    value={mDrawdown} />
        <MetricBar label="Horaires"    value={mDiscipline} />
      </div>

      {/* Règles du jour */}
      {rules && (
        <div style={{ padding: '18px 22px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
          <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, display: 'block', marginBottom: 10 }}>Règles du jour</span>
          {[
            { label: 'Max trades', cur: stats.total_trades, max: rules.max_trades_per_session, pct: tradesPct },
            { label: 'Drawdown',   cur: `${drawdownPct}%`, max: `${rules.max_daily_drawdown_pct}%`, pct: drawdownPct },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i === 0 ? `.5px solid rgba(255,255,255,.04)` : 'none' }}>
              <span style={{ fontSize: 12, color: C.td, fontFamily: MONO }}>{r.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontFamily: MONO, color: r.pct > 80 ? C.red : r.pct > 50 ? C.o : C.tm, fontWeight: 500, transition: 'color .3s' }}>{r.cur}</span>
                <span style={{ fontSize: 11, color: C.te, fontFamily: MONO }}>/ {r.max}</span>
                <div style={{ width: 44, height: 2, background: 'rgba(255,255,255,.06)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: scoreColor(100 - r.pct), borderRadius: 1, transition: 'width .4s' }} />
                </div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0' }}>
            <span style={{ fontSize: 12, color: C.td, fontFamily: MONO }}>Fenêtre</span>
            <span style={{ fontSize: 10, color: C.g, fontFamily: MONO }}>{rules.session_start}–{rules.session_end}</span>
          </div>
        </div>
      )}

      {/* Streak */}
      <div style={{ padding: '14px 22px', borderBottom: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 200, letterSpacing: -1, color: streak >= 3 ? C.red : C.tm, transition: 'color .3s', fontFamily: SANS }}>{streak}</div>
          <div style={{ fontSize: 12, color: C.td, fontFamily: MONO, marginTop: 3 }}>{streak <= 1 ? 'perte consécutive' : 'pertes consécutives'}</div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i < streak ? C.red : C.b2, opacity: i < streak ? .8 : 1, transition: 'background .3s' }} />
          ))}
        </div>
      </div>

      {/* Alertes */}
      <div style={{ padding: '16px 22px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO }}>Alertes</span>
          {alerts.length > 0 && (
            <span style={{ fontSize: 9, fontFamily: MONO, padding: '2px 8px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 100, color: C.red }}>
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length === 0 ? (
          <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic', fontWeight: 300 }}>Aucune alerte — session saine.</div>
        ) : (
          alerts.slice(0, 8).map((a, i) => (
            <div key={a.id ?? i} style={{ padding: '11px 0', borderBottom: i < alerts.length - 1 ? `.5px solid ${C.b}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <span style={{
                  fontSize: 9, fontFamily: MONO, padding: '2px 7px', borderRadius: 3,
                  background: (a.level ?? 1) >= 2 ? C.rd : 'rgba(245,166,35,.1)',
                  border: `.5px solid ${(a.level ?? 1) >= 2 ? C.rb : 'rgba(245,166,35,.25)'}`,
                  color: (a.level ?? 1) >= 2 ? C.red : C.o,
                }}>L{a.level ?? 1}</span>
                <span style={{ fontSize: 11, fontFamily: MONO, color: C.td, letterSpacing: .5 }}>{(a.type ?? '').replace(/_/g, ' ')}</span>
              </div>
              <div style={{ fontSize: 13, color: C.tm, lineHeight: 1.5, fontWeight: 300 }}>{a.message}</div>
            </div>
          ))
        )}
      </div>

      {/* Pause */}
      <div style={{ padding: '14px 22px', borderTop: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <button
          onClick={() => setPaused(p => !p)}
          style={{
            width: '100%', padding: 12, background: C.rg, border: `.5px solid ${C.rb}`,
            borderRadius: 5, color: C.red, fontSize: 11, fontFamily: SANS, cursor: 'pointer',
            letterSpacing: 2, textTransform: 'uppercase' as const, transition: 'background .2s',
          }}
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
  trades: TradeRow[]
  alerts: AlertRow[]
  stats: SessionStats
  yesterdayStats: { score: number; pnl: number; alerts: number } | null
  rules: TradingRules | null
}) {
  const [note, setNote] = useState('')
  const pnlColor = stats.total_pnl > 0 ? C.g : stats.total_pnl < 0 ? C.red : C.td
  const winRate = stats.total_trades > 0 ? Math.round((stats.wins / stats.total_trades) * 100) : null
  const sortedTrades = [...trades].sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* J-1 bar */}
      {yesterdayStats && (
        <div style={{ padding: '11px 24px', borderBottom: `.5px solid ${C.b}`, display: 'flex', gap: 24, alignItems: 'center', background: C.sf2, flexShrink: 0 }}>
          {[
            { val: `${fmtPnl(yesterdayStats.pnl)} USD`, lbl: 'J-1 P&L', color: yesterdayStats.pnl >= 0 ? C.g : C.red },
            { val: String(yesterdayStats.score), lbl: 'J-1 Score', color: scoreColor(yesterdayStats.score) },
            { val: String(yesterdayStats.alerts), lbl: 'J-1 Alertes', color: yesterdayStats.alerts > 0 ? C.o : C.td },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 14, fontWeight: 300, letterSpacing: -.5, color: item.color }}>{item.val}</div>
              <div style={{ fontSize: 9, color: C.td, fontFamily: MONO, textTransform: 'uppercase' as const, letterSpacing: 1 }}>{item.lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* PnL block */}
      <div style={{ padding: '14px 24px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, display: 'block', marginBottom: 6 }}>P&L de session</span>
        <div style={{ fontSize: 36, fontWeight: 200, letterSpacing: -2.5, lineHeight: 1, color: pnlColor, transition: 'color .4s', fontFamily: SANS }}>
          {fmtPnl(stats.total_pnl)} <span style={{ fontSize: 14, color: C.te }}>USD</span>
        </div>
        {winRate !== null && (
          <div style={{ fontSize: 10, color: C.td, fontFamily: MONO, marginTop: 3 }}>
            {stats.wins}W / {stats.losses}L · {winRate}% win rate
          </div>
        )}
        <div style={{ marginTop: 12, height: 100, display: 'flex', flexDirection: 'column' }}>
          <PnlChart trades={trades} />
        </div>
      </div>

      {/* Trade feed */}
      <div style={{ padding: '14px 24px', flex: 1, borderBottom: `.5px solid ${C.b}`, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO }}>Flux de trades</span>
          <span style={{ fontSize: 11, color: C.te, fontFamily: MONO }}>— surbrillance = alerte comportementale</span>
        </div>
        {sortedTrades.length === 0 ? (
          <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic', fontWeight: 300, padding: '12px 0' }}>
            Aucun trade aujourd'hui. Connectez MetaTrader 5 via l'EA Caldra ou utilisez l'API.
          </div>
        ) : (
          sortedTrades.map((t, i) => {
            const flaggedAlert = alerts.find(a => a.created_at && t.entry_time && Math.abs(new Date(a.created_at).getTime() - new Date(t.entry_time).getTime()) < 90000)
            const hasCrit = flaggedAlert && (flaggedAlert.level ?? 1) >= 2
            const hasWarn = flaggedAlert && (flaggedAlert.level ?? 1) === 1
            return (
              <div key={t.id ?? i} style={{
                display: 'grid', gridTemplateColumns: '52px 1fr auto', alignItems: 'center',
                gap: 0, padding: hasCrit || hasWarn ? '0 24px' : '0',
                margin: hasCrit || hasWarn ? '0 -24px' : '0',
                minHeight: 40, borderBottom: `.5px solid rgba(255,255,255,.05)`,
                background: hasCrit ? 'rgba(220,80,60,.05)' : hasWarn ? 'rgba(245,166,35,.04)' : 'transparent',
                borderLeft: hasCrit ? `2px solid rgba(220,80,60,.5)` : hasWarn ? `2px solid rgba(245,166,35,.4)` : 'none',
              }}>
                <span style={{ fontSize: 11, color: C.td, fontFamily: MONO }}>{fmtTime(t.entry_time)}</span>
                <span style={{ fontSize: 14, color: C.tm, textAlign: 'center' as const, fontWeight: 400 }}>
                  {t.symbol} {t.direction === 'long' ? 'Long' : 'Short'} ×{t.size}
                  {flaggedAlert && (
                    <span style={{
                      fontSize: 8, padding: '2px 7px', borderRadius: 100, fontFamily: MONO, marginLeft: 8,
                      background: hasCrit ? C.rd : 'rgba(245,166,35,.09)',
                      border: `.5px solid ${hasCrit ? C.rb : 'rgba(245,166,35,.2)'}`,
                      color: hasCrit ? C.red : C.o,
                    }}>{(flaggedAlert.type ?? '').replace(/_/g, ' ')}</span>
                  )}
                </span>
                <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 500, color: (t.pnl ?? 0) >= 0 ? C.g : C.red }}>
                  {fmtPnl(t.pnl ?? 0)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Note */}
      <div style={{ padding: '12px 24px', borderBottom: `.5px solid ${C.b}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, display: 'block', marginBottom: 6 }}>Note de session</span>
        <textarea
          value={note} onChange={e => setNote(e.target.value)} rows={2}
          placeholder="Contexte, état du marché, comment tu te sens..."
          style={{
            width: '100%', background: 'rgba(255,255,255,.03)', border: `.5px solid ${C.b}`, borderRadius: 5,
            padding: '8px 12px', color: C.tm, fontSize: 11, fontFamily: MONO, resize: 'none' as const,
            outline: 'none', lineHeight: 1.6, boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', flexShrink: 0, borderTop: `.5px solid ${C.b}` }}>
        {[
          { val: `${fmtPnl(stats.total_pnl)}`, lbl: 'P&L', color: pnlColor },
          { val: String(stats.total_trades), lbl: 'Trades', color: C.tm },
          { val: `${winRate ?? '—'}${winRate !== null ? '%' : ''}`, lbl: 'Win rate', color: winRate !== null ? scoreColor(winRate) : C.te },
          { val: String(alerts.length), lbl: 'Alertes', color: alerts.length > 0 ? C.red : C.te },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: 'center' as const, padding: '14px 8px', borderRight: i < 3 ? `.5px solid ${C.b}` : 'none' }}>
            <div style={{ fontSize: 20, fontWeight: 200, letterSpacing: -1, color: item.color }}>{item.val}</div>
            <div style={{ fontSize: 10, color: C.td, letterSpacing: 1.5, textTransform: 'uppercase' as const, fontFamily: MONO, marginTop: 4 }}>{item.lbl}</div>
          </div>
        ))}
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

  const firstDOW = (displayDate.getDay() + 6) % 7 // 0=Mon
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
      const endDay = d - 1
      weeks.push({ lbl: `Sem (${weekStart}–${endDay})`, days: [...weekDays] })
      weekDays = []
      weekStart = d
    }
    weekDays.push(d)
  }
  if (weekDays.length > 0) weeks.push({ lbl: `Sem (${weekStart}–${daysInMonth})`, days: weekDays })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', flex: 1, height: '100%' }}>
      <div style={{ padding: '24px 28px', borderRight: `.5px solid ${C.b}`, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 19, fontWeight: 300, letterSpacing: -.3, color: C.tx, textTransform: 'capitalize' as const }}>{monthName}</div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setCalOffset(o => o - 1)} style={{ background: 'transparent', border: `.5px solid ${C.b}`, borderRadius: 5, color: C.td, cursor: 'pointer', width: 32, height: 32, fontSize: 16, fontFamily: MONO }}>‹</button>
            <button onClick={() => setCalOffset(o => o + 1)} style={{ background: 'transparent', border: `.5px solid ${C.b}`, borderRadius: 5, color: C.td, cursor: 'pointer', width: 32, height: 32, fontSize: 16, fontFamily: MONO }}>›</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, marginBottom: 16, flexWrap: 'wrap' as const }}>
          {[['rgba(60,200,122,.7)', 'Score ≥ 70'], ['rgba(245,166,35,.7)', '40–69'], ['rgba(220,80,60,.7)', '< 40']].map(([bg, lbl]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: C.td, fontFamily: MONO }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: bg }} />{lbl}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
            <div key={d} style={{ textAlign: 'center' as const, fontSize: 11, color: C.td, fontFamily: MONO, padding: 4, opacity: ['Sam','Dim'].includes(d) ? .35 : 1 }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
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
                <div key={d} style={{ minHeight: 78, borderRadius: 6, border: `.5px solid ${C.b}`, background: C.sf, opacity: isWeekend || !s ? .15 : 1, display: 'flex', flexDirection: 'column', padding: 10, pointerEvents: 'none' }}>
                  <div style={{ fontSize: 11, color: C.tm }}>{d}</div>
                </div>
              )
            }
            const bg = s.score >= 70 ? 'rgba(60,200,122,.05)' : s.score >= 40 ? 'rgba(245,166,35,.05)' : 'rgba(220,80,60,.07)'
            const bdr = s.score >= 70 ? 'rgba(60,200,122,.16)' : s.score >= 40 ? 'rgba(245,166,35,.13)' : 'rgba(220,80,60,.18)'
            const col = scoreColor(s.score)
            return (
              <div key={d} onClick={() => setSelectedDate(dateStr)} style={{
                minHeight: 78, borderRadius: 6, border: `.5px solid ${isSelected ? 'rgba(220,80,60,.55)' : bdr}`,
                background: bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: 10,
                position: 'relative', transition: 'all .2s', outline: isSelected ? '1.5px solid rgba(220,80,60,.55)' : 'none', outlineOffset: 1,
              }}>
                {s.alertCount > 0 && <div style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: C.red }} />}
                <div style={{ fontSize: 11, fontWeight: 400, color: C.tm, marginBottom: 4 }}>{d}</div>
                <div style={{ fontSize: 24, fontWeight: 200, letterSpacing: -1, lineHeight: 1, color: col }}>{s.score}</div>
                <div style={{ fontSize: 10, color: C.td, fontFamily: MONO, marginTop: 4 }}>{fmtPnl(s.pnl)} USD</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sidebar droite calendrier */}
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', background: C.sf }}>
        <div>
          <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, display: 'block', marginBottom: 10 }}>Scores par semaine</span>
          {weeks.map(w => {
            const wScores = w.days.map(d => sessionByDate[cellDate(d)]?.score).filter((s): s is number => s !== undefined)
            if (wScores.length === 0) return null
            const avg = Math.round(wScores.reduce((a, b) => a + b) / wScores.length)
            const col = scoreColor(avg)
            return (
              <div key={w.lbl} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO }}>{w.lbl}</span>
                  <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 500, color: col }}>{avg}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 1, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: `${avg}%`, background: col, borderRadius: 1 }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Stats mois */}
        {sessions.length > 0 && (() => {
          const avgScore = Math.round(sessions.reduce((s, d) => s + d.score, 0) / sessions.length)
          const totalPnl = sessions.reduce((s, d) => s + d.pnl, 0)
          const critical = sessions.filter(d => d.criticalAlerts > 0).length
          return (
            <div>
              <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, display: 'block', marginBottom: 10 }}>Stats 30 derniers jours</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {[
                  { val: String(avgScore), lbl: 'Score moy.', color: scoreColor(avgScore) },
                  { val: String(sessions.length), lbl: 'Sessions', color: C.tm },
                  { val: String(critical), lbl: 'Critiques', color: critical > 0 ? C.red : C.te },
                  { val: `${fmtPnl(totalPnl)}`, lbl: 'P&L total', color: totalPnl >= 0 ? C.g : C.red },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, fontWeight: 200, letterSpacing: -.5, color: item.color }}>{item.val}</div>
                    <div style={{ fontSize: 10, color: C.td, fontFamily: MONO, letterSpacing: 1, textTransform: 'uppercase' as const, marginTop: 4 }}>{item.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Day detail */}
        <div>
          <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, display: 'block', marginBottom: 10 }}>Détail du jour</span>
          {selectedSession ? (
            <div style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: 9, padding: 18, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(220,80,60,.35),transparent)' }} />
              <div style={{ fontSize: 11, color: C.td, fontFamily: MONO, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 11 }}>{selectedDate}</div>
              <div style={{ fontSize: 40, fontWeight: 200, letterSpacing: -1.5, lineHeight: 1, color: scoreColor(selectedSession.score) }}>{selectedSession.score}</div>
              <div style={{ fontSize: 14, color: C.tm, marginBottom: 14, marginTop: 4 }}>{fmtPnl(selectedSession.pnl)} USD</div>
              {[
                { k: 'Trades', v: String(selectedSession.tradeCount) },
                { k: 'Win rate', v: selectedSession.tradeCount > 0 ? `${Math.round(selectedSession.wins / selectedSession.tradeCount * 100)}%` : '—' },
                { k: 'Alertes', v: String(selectedSession.alertCount) },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
                  <span style={{ fontSize: 12, color: C.td, fontFamily: MONO }}>{k}</span>
                  <span style={{ fontSize: 13, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              {selectedSession.alerts.slice(0, 3).map((a, i) => (
                <div key={i} style={{ padding: '9px 11px', borderRadius: 6, marginTop: 9, border: `.5px solid ${a.level >= 2 ? C.rb : 'rgba(245,166,35,.2)'}`, background: a.level >= 2 ? C.rd : 'rgba(245,166,35,.06)' }}>
                  <div style={{ fontSize: 10, fontFamily: MONO, marginBottom: 4, color: a.level >= 2 ? C.red : C.o }}>L{a.level} · {a.type.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 12, color: C.tm, lineHeight: 1.4, fontWeight: 300 }}>{a.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic', fontWeight: 300 }}>Clique sur un jour pour le détail.</div>
          )}
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
  const allAlerts = sessions.flatMap(d => d.alerts)
  const allTodayAlerts = todayAlerts.map(a => ({ type: a.type ?? '', level: a.level ?? 1 }))
  const combinedAlerts = [...allAlerts, ...allTodayAlerts]

  // Pattern breakdown
  const patternCounts: Record<string, number> = {}
  for (const a of combinedAlerts) {
    const t = (a.type ?? '').replace(/_/g, ' ')
    if (t) patternCounts[t] = (patternCounts[t] ?? 0) + 1
  }
  const patterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxCount = patterns[0]?.[1] ?? 1

  // PnL cumulative chart
  const cumulPts = sessions.reduce<{ date: string; v: number }[]>((acc, s) => {
    const prev = acc[acc.length - 1]?.v ?? 0
    return [...acc, { date: s.date, v: prev + s.pnl }]
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.b, flex: 1, overflow: 'auto' }}>
      {/* P&L cumulé */}
      <div style={{ background: C.bg, padding: 28, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, marginBottom: 18 }}>P&L cumulé — {sessions.length} dernières sessions</span>
        <div style={{ fontSize: 44, fontWeight: 200, letterSpacing: -2, lineHeight: 1, marginBottom: 6, color: totalPnl >= 0 ? C.g : C.red }}>{fmtPnl(totalPnl)} <span style={{ fontSize: 16, color: C.te }}>USD</span></div>
        <div style={{ fontSize: 12, color: C.td, fontFamily: MONO }}>Sur {sessions.length} sessions tradées</div>
        {cumulPts.length >= 2 && (
          <div style={{ marginTop: 16, height: 90, flex: 1 }}>
            {(() => {
              const vals = cumulPts.map(p => p.v)
              const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals)
              const range = maxV - minV || 1
              const n = cumulPts.length
              const W = 600, H = 90, PX = 4, PY = 6
              const xOf = (i: number) => PX + (i / (n - 1)) * (W - 2 * PX)
              const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
              const last = vals[vals.length - 1]
              const lc = last >= 0 ? C.g : C.red
              const pts = cumulPts.map((p, i) => `${xOf(i)},${yOf(p.v)}`).join(' ')
              const y0 = yOf(0)
              const fill = `M${xOf(0)},${y0} ${cumulPts.map((p, i) => `L${xOf(i)},${yOf(p.v)}`).join(' ')} L${xOf(n - 1)},${y0} Z`
              return (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                  <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke="rgba(255,255,255,.06)" strokeWidth={1} strokeDasharray="4 6" />
                  <path d={fill} fill={last >= 0 ? 'rgba(60,200,122,.06)' : 'rgba(220,80,60,.06)'} />
                  <polyline points={pts} fill="none" stroke={lc} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              )
            })()}
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{ background: C.bg, padding: 28, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, marginBottom: 18 }}>Score comportemental moyen</span>
        <div style={{ fontSize: 44, fontWeight: 200, letterSpacing: -2, lineHeight: 1, marginBottom: 6, color: scoreColor(avgScore) }}>{avgScore}</div>
        <div style={{ fontSize: 12, color: C.td, fontFamily: MONO }}>Sur {sessions.length} sessions</div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { k: `Sessions score > 80`, v: `${sessionsAbove80} / ${sessions.length}`, col: C.g },
            { k: `Sessions critiques (< 40)`, v: `${sessionsCritical} / ${sessions.length}`, col: sessionsCritical > 0 ? C.red : C.td },
            { k: 'Win rate global', v: (() => { const t = sessions.reduce((s, d) => s + d.tradeCount, 0); const w = sessions.reduce((s, d) => s + d.wins, 0); return t > 0 ? `${Math.round(w / t * 100)}%` : '—' })(), col: C.tm },
          ].map(({ k, v, col }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
              <span style={{ fontSize: 13, color: C.td }}>{k}</span>
              <span style={{ fontSize: 13, fontFamily: MONO, color: col, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Patterns */}
      <div style={{ background: C.bg, padding: 28, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, marginBottom: 18 }}>Patterns les plus déclenchés</span>
        {patterns.length === 0 ? (
          <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic' }}>Aucun pattern détecté — excellent travail.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {patterns.map(([type, count]) => {
              const pct = Math.round((count / maxCount) * 100)
              const col = pct >= 60 ? C.red : pct >= 30 ? C.o : C.g
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: C.td, fontFamily: MONO, width: 130, flexShrink: 0 }}>{type}</span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 12, color: C.tm, fontFamily: MONO, width: 30, textAlign: 'right' as const, fontWeight: 500 }}>{count}×</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sessions par jour de semaine */}
      <div style={{ background: C.bg, padding: 28, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.td, fontFamily: MONO, marginBottom: 18 }}>Performance par jour de semaine</span>
        {(() => {
          const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
          const byDow: Record<number, DaySession[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] }
          for (const s of sessions) {
            const dow = (new Date(s.date).getDay() + 6) % 7
            if (dow < 5) byDow[dow].push(s)
          }
          return (
            <div style={{ display: 'flex', gap: 6 }}>
              {dayNames.map((name, i) => {
                const ds = byDow[i] ?? []
                const avg = ds.length > 0 ? Math.round(ds.reduce((s, d) => s + d.score, 0) / ds.length) : null
                const col = avg !== null ? scoreColor(avg) : C.te
                const bgCol = avg !== null ? (avg >= 70 ? 'rgba(60,200,122,.1)' : avg >= 40 ? 'rgba(245,166,35,.1)' : 'rgba(220,80,60,.1)') : 'rgba(255,255,255,.02)'
                return (
                  <div key={name} style={{ flex: 1, height: 80, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, border: `.5px solid transparent`, background: bgCol }}>
                    <span style={{ fontSize: 18, fontFamily: MONO, fontWeight: 500, color: col }}>{avg ?? '—'}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontFamily: MONO }}>{name}</span>
                  </div>
                )
              })}
            </div>
          )
        })()}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {(() => {
            const allT = sessions.reduce((s, d) => s + d.tradeCount, 0)
            const allW = sessions.reduce((s, d) => s + d.wins, 0)
            const avgTrades = sessions.length > 0 ? (allT / sessions.length).toFixed(1) : '—'
            return [
              { k: 'Trades total', v: String(allT) },
              { k: 'Trades / session', v: avgTrades },
              { k: 'Alertes total', v: String(sessions.reduce((s, d) => s + d.alertCount, 0)) },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
                <span style={{ fontSize: 13, color: C.td }}>{k}</span>
                <span style={{ fontSize: 13, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{v}</span>
              </div>
            ))
          })()}
        </div>
      </div>
    </div>
  )
}

// ── RapportsPanel ──────────────────────────────────────────────────────────────
function RapportsPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 48, textAlign: 'center' as const }}>
      <div style={{ fontSize: 32, opacity: .3 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 300, color: C.td, fontFamily: SANS }}>Rapports automatiques</div>
      <div style={{ fontSize: 12, color: C.te, fontFamily: MONO, maxWidth: 340, lineHeight: 1.7 }}>
        Les rapports hebdomadaires et mensuels PDF seront disponibles dans une prochaine version.
      </div>
      <div style={{ fontSize: 9, padding: '4px 14px', borderRadius: 100, background: C.rd, border: `.5px solid ${C.rb}`, color: C.red, fontFamily: MONO, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>À venir</div>
    </div>
  )
}

// ── TradovateCard ──────────────────────────────────────────────────────────────
interface TradovateStatus {
  isConnected: boolean
  wsAlive: boolean
  accountId: number | null
  isDemo: boolean
  username: string | null
  lastSyncAt: string | null
  dbActive: boolean
}

function TradovateCard({ apiKeyPrefix }: { apiKeyPrefix: string | null }) {
  const [status, setStatus]     = useState<TradovateStatus | null>(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    username: '',
    password: '',
    apiKey: '',
    caldraApiKey: '',
    isDemo: true,
  })

  // Poll status toutes les 10s
  useEffect(() => {
    let mounted = true
    async function fetchStatus() {
      try {
        const res  = await fetch('/api/tradovate/status')
        const data = await res.json() as TradovateStatus
        if (mounted) { setStatus(data); setLoading(false) }
      } catch {
        if (mounted) setLoading(false)
      }
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 10000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const res  = await fetch('/api/tradovate/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { success?: boolean; error?: string; accountId?: number; isDemo?: boolean }
      if (!res.ok || data.error) { setError(data.error ?? 'Erreur inconnue'); return }
      setStatus({ isConnected: true, wsAlive: true, accountId: data.accountId ?? null, isDemo: data.isDemo ?? true, username: form.username, lastSyncAt: null, dbActive: true })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDisconnect() {
    setSubmitting(true)
    await fetch('/api/tradovate/disconnect', { method: 'POST' })
    setStatus(prev => prev ? { ...prev, isConnected: false, wsAlive: false, dbActive: false } : null)
    setSubmitting(false)
  }

  const connected = status?.isConnected ?? false
  const inputSt: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,.04)', border: `.5px solid ${C.b2}`,
    borderRadius: 5, padding: '8px 11px', color: C.tx, fontSize: 12, fontFamily: MONO,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: C.sf, border: `.5px solid ${connected ? 'rgba(60,200,122,.2)' : C.b}`, borderRadius: 12, padding: 24, position: 'relative', overflow: 'hidden', transition: 'border-color .3s' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(220,80,60,.2),transparent)' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 42, height: 42, borderRadius: 9, background: connected ? 'rgba(60,200,122,.08)' : C.sf2, border: `.5px solid ${connected ? 'rgba(60,200,122,.25)' : C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: connected ? C.g : C.tm, transition: 'all .3s' }}>TV</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.tx }}>Tradovate</div>
          <div style={{ fontSize: 11, color: C.td, fontFamily: MONO }}>Futures CME · WebSocket temps réel</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: MONO }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? C.g : 'rgba(255,255,255,.2)', animation: connected ? 'pulse 1.8s infinite' : 'none' }} />
          <span style={{ color: connected ? C.g : C.td }}>{loading ? '…' : connected ? 'Connecté' : 'Non connecté'}</span>
        </div>
      </div>

      {/* État connecté */}
      {connected && status && (
        <div style={{ marginBottom: 16 }}>
          {[
            { k: 'Compte', v: status.username ?? '—' },
            { k: 'Account ID', v: status.accountId ? String(status.accountId) : '—' },
            { k: 'Environnement', v: status.isDemo ? 'Demo' : 'Live' },
            { k: 'Dernière synchro', v: status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleTimeString('fr-FR') : 'En attente du premier trade' },
          ].map(({ k, v }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
              <span style={{ fontSize: 11, color: C.td, fontFamily: MONO }}>{k}</span>
              <span style={{ fontSize: 11, fontFamily: MONO, color: C.tm }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire de connexion */}
      {!connected && showForm && (
        <form onSubmit={handleConnect} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.te, fontFamily: MONO, marginBottom: 4 }}>Username Tradovate</div>
              <input style={inputSt} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="john.doe" required />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.te, fontFamily: MONO, marginBottom: 4 }}>Mot de passe</div>
              <input style={inputSt} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" required />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.te, fontFamily: MONO, marginBottom: 4 }}>API Key Tradovate</div>
            <input style={inputSt} value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} placeholder="Tradovate API key (app secret)" required />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.te, fontFamily: MONO, marginBottom: 4 }}>Clé API Caldra <span style={{ color: C.red }}>*</span></div>
            <input style={inputSt} value={form.caldraApiKey} onChange={e => setForm(p => ({ ...p, caldraApiKey: e.target.value }))} placeholder="cal_xxxxxxxxxxxxxxxxxxxx" required />
            <div style={{ fontSize: 9, color: C.te, fontFamily: MONO, marginTop: 3 }}>Depuis Settings → API Key</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={() => setForm(p => ({ ...p, isDemo: !p.isDemo }))} style={{
              padding: '6px 14px', borderRadius: 5, fontSize: 10, fontFamily: MONO, cursor: 'pointer',
              background: form.isDemo ? 'rgba(245,166,35,.1)' : C.rd,
              border: `.5px solid ${form.isDemo ? 'rgba(245,166,35,.3)' : C.rb}`,
              color: form.isDemo ? C.o : C.red,
              letterSpacing: 1, textTransform: 'uppercase' as const,
            }}>
              {form.isDemo ? '▶ Demo' : '▶ Live'}
            </button>
            <span style={{ fontSize: 10, color: C.te, fontFamily: MONO }}>Cliquer pour basculer</span>
          </div>
          {error && <div style={{ fontSize: 11, color: C.red, fontFamily: MONO, padding: '6px 10px', background: C.rd, borderRadius: 4 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 9 }}>
            <button type="submit" disabled={submitting} style={{ flex: 1, padding: 10, borderRadius: 6, fontSize: 11, fontFamily: MONO, cursor: submitting ? 'not-allowed' : 'pointer', background: C.rd, border: `.5px solid ${C.rb}`, color: C.red, opacity: submitting ? .6 : 1 }}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: 10, borderRadius: 6, fontSize: 11, fontFamily: MONO, cursor: 'pointer', background: 'transparent', border: `.5px solid ${C.b}`, color: C.td }}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 9 }}>
        {connected ? (
          <button onClick={handleDisconnect} disabled={submitting} style={{ flex: 1, padding: 10, borderRadius: 6, fontSize: 11, fontFamily: MONO, cursor: submitting ? 'not-allowed' : 'pointer', background: 'transparent', border: `.5px solid ${C.b}`, color: C.td }}>
            {submitting ? 'Déconnexion…' : 'Déconnecter'}
          </button>
        ) : !showForm ? (
          <button onClick={() => setShowForm(true)} style={{ flex: 1, padding: 10, borderRadius: 6, fontSize: 11, fontFamily: MONO, cursor: 'pointer', background: C.rd, border: `.5px solid ${C.rb}`, color: C.red }}>
            + Connecter Tradovate
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ── IntegrationsPanel ──────────────────────────────────────────────────────────
function IntegrationsPanel({ apiKeyPrefix }: { apiKeyPrefix: string | null }) {
  const hasKey = !!apiKeyPrefix

  return (
    <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignContent: 'start', overflowY: 'auto', height: '100%' }}>

      {/* MetaTrader 5 */}
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(220,80,60,.2),transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 9, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: C.tm }}>MT5</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.tx }}>MetaTrader 5</div>
            <div style={{ fontSize: 11, color: C.td, fontFamily: MONO }}>Futures · CFD · Forex</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: MONO }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: hasKey ? C.g : 'rgba(255,255,255,.2)' }} />
            <span style={{ color: hasKey ? C.g : C.td }}>{hasKey ? 'Clé configurée' : 'Non connecté'}</span>
          </div>
        </div>
        {hasKey && (
          <div style={{ background: 'rgba(255,255,255,.02)', border: `.5px solid ${C.b}`, borderRadius: 6, padding: '9px 13px', fontSize: 11, fontFamily: MONO, color: C.td, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span>Clé API</span><span style={{ color: C.tm }}>{apiKeyPrefix}…</span>
          </div>
        )}
        <div style={{ fontSize: 12, color: C.td, fontFamily: MONO, marginBottom: 16, lineHeight: 1.6 }}>
          Installez l'EA CaldraEA.mq5 sur MT5. Chaque trade clôturé est envoyé automatiquement à l'API.
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <a href="/settings/api" style={{ flex: 1, padding: 10, borderRadius: 6, fontSize: 11, fontFamily: MONO, cursor: 'pointer', textAlign: 'center' as const, textDecoration: 'none', background: C.rd, border: `.5px solid ${C.rb}`, color: C.red }}>
            {hasKey ? 'Gérer la clé' : 'Générer une clé'}
          </a>
          <a href="https://github.com/DonlamNQ/caldra/tree/main/connectors/mt5" target="_blank" rel="noopener" style={{ flex: 1, padding: 10, borderRadius: 6, fontSize: 11, fontFamily: MONO, cursor: 'pointer', textAlign: 'center' as const, textDecoration: 'none', background: 'transparent', border: `.5px solid ${C.b}`, color: C.td }}>
            Documentation
          </a>
        </div>
      </div>

      {/* Tradovate */}
      <TradovateCard apiKeyPrefix={apiKeyPrefix} />

      {/* API directe */}
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(220,80,60,.2),transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 9, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: C.tm }}>API</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.tx }}>API directe</div>
            <div style={{ fontSize: 11, color: C.td, fontFamily: MONO }}>POST /api/ingest</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: MONO }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: hasKey ? C.g : 'rgba(255,255,255,.2)' }} />
            <span style={{ color: hasKey ? C.g : C.td }}>{hasKey ? 'Active' : 'Inactif'}</span>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,.02)', border: `.5px solid ${C.b}`, borderRadius: 6, padding: '9px 13px', fontFamily: MONO, fontSize: 10, color: C.td, marginBottom: 16 }}>
          <div style={{ color: C.te, marginBottom: 4 }}>POST https://getcaldra.com/api/ingest</div>
          <div>Header: x-caldra-key: {hasKey ? `${apiKeyPrefix}…` : '<votre-clé>'}</div>
        </div>
        <div style={{ fontSize: 12, color: C.td, fontFamily: MONO, marginBottom: 16, lineHeight: 1.6 }}>
          Compatible avec n'importe quelle plateforme capable d'envoyer des requêtes HTTP.
        </div>
        <a href="/settings/api" style={{ display: 'block', padding: 10, borderRadius: 6, fontSize: 11, fontFamily: MONO, cursor: 'pointer', textAlign: 'center' as const, textDecoration: 'none', background: 'transparent', border: `.5px solid ${C.b}`, color: C.td }}>
          Gérer les clés API →
        </a>
      </div>

      {/* À venir */}
      {[
        { logo: 'TVW', name: 'TradingView', type: 'Alerts webhook', desc: 'Reçoit les alertes TradingView via webhook.' },
        { logo: 'SLK', name: 'Slack', type: 'Notifications sortantes', desc: 'Reçois les alertes Caldra dans ton channel Slack.' },
      ].map(({ logo, name, type, desc }) => (
        <div key={name} style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 24, opacity: .45 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: 9, background: C.sf2, border: `.5px solid ${C.b}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 500, color: C.tm }}>{logo}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.tx }}>{name}</div>
              <div style={{ fontSize: 11, color: C.td, fontFamily: MONO }}>{type}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: MONO, color: C.td }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />Non connecté
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.td, fontFamily: MONO, marginBottom: 16 }}>{desc}</div>
          <div style={{ fontSize: 9, padding: '4px 14px', display: 'inline-block', borderRadius: 100, background: C.rd, border: `.5px solid ${C.rb}`, color: C.red, fontFamily: MONO, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>À venir</div>
        </div>
      ))}
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
    background: 'rgba(255,255,255,.04)', border: `.5px solid ${C.b2}`, borderRadius: 5,
    padding: '8px 13px', fontSize: 12, fontFamily: MONO, color: C.tx, width: 95,
    textAlign: 'right', outline: 'none', transition: 'border-color .2s',
  }

  function RuleGroup({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
    return (
      <div style={{ background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 22, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)' }} />
        <div style={{ fontSize: 15, fontWeight: 500, color: C.tx, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: C.td, fontFamily: MONO, marginBottom: 18 }}>{desc}</div>
        {children}
      </div>
    )
  }

  function RuleField({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `.5px solid rgba(255,255,255,.04)` }}>
        <span style={{ fontSize: 13, color: C.tm }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {children}
          {unit && <span style={{ fontSize: 12, color: C.te, fontFamily: MONO, width: 30 }}>{unit}</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', height: '100%' }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 300, letterSpacing: -.3, color: C.tx, marginBottom: 6 }}>Règles de session</div>
        <div style={{ fontSize: 13, color: C.td, fontFamily: MONO }}>Ces seuils définissent quand Caldra déclenche une alerte. Modifiables à tout moment.</div>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <RuleGroup title="Risk management" desc="LEVEL_2 si seuil dépassé">
          <RuleField label="Drawdown journalier max" unit="%">
            <input style={inputStyle} type="number" min={0.1} max={20} step={0.1} value={rules.max_daily_drawdown_pct} onChange={e => set('max_daily_drawdown_pct', e.target.value)} />
          </RuleField>
          <RuleField label="Risque max par trade" unit="%">
            <input style={inputStyle} type="number" min={0.1} max={10} step={0.1} value={rules.max_risk_per_trade_pct} onChange={e => set('max_risk_per_trade_pct', e.target.value)} />
          </RuleField>
        </RuleGroup>

        <RuleGroup title="Discipline comportementale" desc="LEVEL_1 à 80% · LEVEL_2 si dépassé">
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

        <RuleGroup title="Fenêtre de session" desc="LEVEL_1 si trade hors fenêtre">
          <RuleField label="Heure de début">
            <input style={{ ...inputStyle, width: 88, textAlign: 'center' }} type="time" value={rules.session_start} onChange={e => set('session_start', e.target.value)} />
          </RuleField>
          <RuleField label="Heure de fin">
            <input style={{ ...inputStyle, width: 88, textAlign: 'center' }} type="time" value={rules.session_end} onChange={e => set('session_end', e.target.value)} />
          </RuleField>
        </RuleGroup>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="submit" disabled={save === 'saving'} style={{
            padding: '13px 30px', background: C.red, border: 'none', borderRadius: 7, color: '#fff',
            fontSize: 13, fontFamily: SANS, cursor: save === 'saving' ? 'not-allowed' : 'pointer',
            fontWeight: 500, transition: 'opacity .2s', opacity: save === 'saving' ? .6 : 1,
          }}>
            {save === 'saving' ? 'Enregistrement…' : 'Sauvegarder les règles'}
          </button>
          {save === 'saved' && <span style={{ color: C.g, fontSize: 12, fontFamily: SANS }}>✓ Règles mises à jour</span>}
          {save === 'error' && <span style={{ color: C.red, fontSize: 12, fontFamily: SANS }}>Erreur — réessayez</span>}
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

    const context = {
      score, pnl: stats.total_pnl, totalTrades: stats.total_trades,
      alertCount: alerts.length,
      alertTypes: [...new Set(alerts.map(a => a.type ?? '').filter(Boolean))],
      rules,
    }

    try {
      const res = await fetch('/api/sentinel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...msgs, userMsg].map(m => ({ role: m.role, content: m.content })), context }),
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', flex: 1, height: '100%', minHeight: 0 }}>
      <div style={{ padding: 28, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 300, letterSpacing: -.3, color: C.tx, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            Sentinel IA
            <span style={{ fontSize: 10, padding: '3px 10px', background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: 100, color: C.red, letterSpacing: 1, textTransform: 'uppercase' as const }}>Plan Sentinel</span>
          </div>
          <div style={{ fontSize: 13, color: C.td, fontFamily: MONO }}>Coach IA actif pendant la session.</div>
        </div>

        <div style={{ flex: 1, background: C.sf, border: `.5px solid ${C.b}`, borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 400 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(220,80,60,.35),transparent)' }} />
          <div style={{ paddingBottom: 16, borderBottom: `.5px solid ${C.b}`, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.tx, marginBottom: 4 }}>Sentinel</div>
            <div style={{ fontSize: 12, color: C.td }}>Analyse en temps réel · Répond à tes questions</div>
          </div>

          <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18, minHeight: 0 }}>
            {msgs.map((m, i) => m.role === 'assistant' ? (
              <div key={i} style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: '10px 10px 10px 2px', padding: '14px 16px', maxWidth: '85%' }}>
                <div style={{ fontSize: 13, color: C.tm, lineHeight: 1.6, fontWeight: 300 }}>{m.content}</div>
                <div style={{ fontSize: 10, color: C.te, fontFamily: MONO, marginTop: 6 }}>{m.time}</div>
              </div>
            ) : (
              <div key={i} style={{ background: C.rd, border: `.5px solid ${C.rb}`, borderRadius: '10px 10px 2px 10px', padding: '14px 16px', maxWidth: '85%', alignSelf: 'flex-end' }}>
                <div style={{ fontSize: 13, color: C.tm, lineHeight: 1.6 }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: '10px 10px 10px 2px', padding: '14px 16px', maxWidth: '85%' }}>
                <div style={{ fontSize: 13, color: C.te, fontStyle: 'italic' }}>Sentinel analyse…</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: `.5px solid ${C.b}` }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Pose une question à Sentinel..."
              style={{ flex: 1, background: 'rgba(255,255,255,.03)', border: `.5px solid ${C.b2}`, borderRadius: 7, padding: '11px 15px', color: C.tm, fontSize: 13, fontFamily: MONO, outline: 'none' }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              padding: '11px 20px', background: C.red, border: 'none', borderRadius: 7, color: '#fff',
              fontSize: 12, fontFamily: SANS, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500,
              opacity: loading || !input.trim() ? .5 : 1, transition: 'opacity .2s',
            }}>Envoyer</button>
          </div>
        </div>
      </div>

      {/* Sentinel sidebar */}
      <div style={{ borderLeft: `.5px solid ${C.b}`, padding: 22, display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', background: C.sf }}>
        <div style={{ padding: '16px 0', borderBottom: `.5px solid ${C.b}` }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.te, fontFamily: MONO, marginBottom: 11 }}>Insights de session</div>
          {score >= 70 && (
            <div style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: 9, padding: 14, marginBottom: 11, borderLeft: `3px solid ${C.g}`, marginLeft: -1 }}>
              <div style={{ fontSize: 10, fontFamily: MONO, marginBottom: 6, color: C.g }}>✓ POINT FORT</div>
              <div style={{ fontSize: 12, color: C.tm, lineHeight: 1.55, fontWeight: 300 }}>Score solide — comportement discipliné depuis le début de session.</div>
            </div>
          )}
          {dominant && (
            <div style={{ background: C.sf2, border: `.5px solid ${C.b}`, borderRadius: 9, padding: 14, borderLeft: `3px solid ${C.o}`, marginLeft: -1 }}>
              <div style={{ fontSize: 10, fontFamily: MONO, marginBottom: 6, color: C.o }}>⚠ À SURVEILLER</div>
              <div style={{ fontSize: 12, color: C.tm, lineHeight: 1.55, fontWeight: 300 }}>Pattern dominant : {dominant[0].replace(/_/g, ' ')} ({dominant[1]}×). Reste vigilant.</div>
            </div>
          )}
          {!dominant && score >= 70 && (
            <div style={{ fontSize: 12, color: C.te, fontStyle: 'italic', fontWeight: 300 }}>Aucun pattern problématique détecté.</div>
          )}
        </div>

        <div style={{ padding: '16px 0', borderBottom: `.5px solid ${C.b}` }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.te, fontFamily: MONO, marginBottom: 11 }}>Session actuelle</div>
          {[
            { k: 'Score', v: `${score} / 100`, c: scoreColor(score) },
            { k: 'P&L', v: `${fmtPnl(stats.total_pnl)} USD`, c: stats.total_pnl >= 0 ? C.g : C.red },
            { k: 'Trades', v: String(stats.total_trades), c: C.tm },
            { k: 'Alertes', v: String(alerts.length), c: alerts.length > 0 ? C.red : C.td },
          ].map(({ k, v, c }) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <span style={{ fontSize: 12, color: C.td }}>{k}</span>
              <span style={{ fontSize: 13, fontFamily: MONO, color: c, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {rules && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: C.te, fontFamily: MONO, marginBottom: 11 }}>Règles actives</div>
            {[
              { k: 'Drawdown max', v: `${rules.max_daily_drawdown_pct}%` },
              { k: 'Max trades', v: String(rules.max_trades_per_session) },
              { k: 'Fenêtre', v: `${rules.session_start}–${rules.session_end}` },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontSize: 12, color: C.td }}>{k}</span>
                <span style={{ fontSize: 13, fontFamily: MONO, color: C.tm, fontWeight: 500 }}>{v}</span>
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const a = payload.new as AlertRow & { session_date?: string; user_id?: string }
        if (a.user_id !== userId) return
        if (a.session_date && a.session_date !== today) return
        setAlerts(prev => [a, ...prev])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades' }, (payload) => {
        const t = payload.new as TradeRow & { user_id?: string }
        if (t.user_id !== userId) return
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
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@200;300;400;500&family=Geist+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;background:${C.bg}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.15}}
        @keyframes dshIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .tab-btn{padding:11px 0;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(240,237,232,.6);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;font-family:${MONO};background:none;border-top:none;border-left:none;border-right:none;white-space:nowrap;flex:1;text-align:center}
        .tab-btn:hover{color:rgba(240,237,232,.95)}
        .tab-btn.active{color:${C.tx};border-bottom-color:${C.red}}
        .tab-sentinel{color:rgba(220,80,60,.6)!important}
        .tab-sentinel.active{color:${C.red}!important;border-bottom-color:${C.red}}
        textarea,input{box-sizing:border-box}
        input[type=number]::-webkit-inner-spin-button{opacity:.25}
        input[type=time]::-webkit-calendar-picker-indicator{filter:invert(.3)}
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: SANS, color: C.tx, animation: 'dshIn .3s ease both' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: `.5px solid ${C.b}`, background: 'rgba(8,8,13,.97)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 300, letterSpacing: 5, textTransform: 'uppercase', color: '#fff' }}>Cald<span style={{ color: C.red }}>ra</span></div>
            <div style={{ fontSize: 7, letterSpacing: 5.7, textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', display: 'block', marginTop: 3 }}>Session</div>
          </div>
          <div style={{ fontSize: 10, color: C.td, letterSpacing: 1, fontFamily: MONO }}>{displayDate}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', background: connected ? 'rgba(60,200,122,.06)' : C.rg, border: `.5px solid ${connected ? 'rgba(60,200,122,.2)' : C.rb}`, borderRadius: 100 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? C.g : C.red, animation: 'pulse 1.8s infinite' }} />
              <span style={{ fontSize: 9, color: connected ? C.g : C.red, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: MONO }}>{connected ? 'Live' : 'Sync'}</span>
            </div>
            <LiveClock />
            <button
              onClick={() => { window.location.href = '/login' }}
              style={{ fontSize: 9, color: C.te, fontFamily: MONO, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase', padding: '4px 8px' }}
            >Logout</button>
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
        <div style={{ display: 'grid', gridTemplateColumns: '25% 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <Sidebar score={score} alerts={alerts} stats={stats} rules={tradingRules} trades={trades} />

          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
