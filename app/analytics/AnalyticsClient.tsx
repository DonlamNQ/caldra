'use client'

import AppHeader from '@/components/AppHeader'

interface Trade {
  id: string
  pnl?: number
  entry_time: string
  direction?: string
  symbol?: string
}

interface AlertRecord {
  id: string
  type?: string
  pattern?: string
  level?: number
  severity?: number
  created_at: string
}

interface DayStats {
  date: string
  pnl: number
  cumPnl: number
  trades: number
  wins: number
}

interface AnalyticsClientProps {
  trades: Trade[]
  alerts: AlertRecord[]
  userEmail: string
}

function computeDayStats(trades: Trade[]): DayStats[] {
  const byDay: Record<string, Trade[]> = {}
  for (const t of trades) {
    const day = t.entry_time.split('T')[0]
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(t)
  }
  const days = Object.keys(byDay).sort()
  let cum = 0
  return days.map(date => {
    const ts = byDay[date]
    const pnl = ts.reduce((s, t) => s + (t.pnl ?? 0), 0)
    cum += pnl
    return { date, pnl, cumPnl: cum, trades: ts.length, wins: ts.filter(t => (t.pnl ?? 0) > 0).length }
  })
}

function computeAlertFreq(alerts: AlertRecord[]) {
  const freq: Record<string, { count: number; level: number }> = {}
  for (const a of alerts) {
    const key = a.type ?? a.pattern ?? 'unknown'
    if (!freq[key]) freq[key] = { count: 0, level: a.level ?? a.severity ?? 1 }
    freq[key].count++
  }
  return Object.entries(freq).map(([type, { count, level }]) => ({ type, count, level })).sort((a, b) => b.count - a.count)
}

function PnlChart({ series }: { series: DayStats[] }) {
  if (series.length < 2) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,230,224,.2)', fontSize: 12 }}>
        Pas assez de données (min. 2 jours)
      </div>
    )
  }
  const W = 600, H = 150, PX = 6, PY = 16
  const values = series.map(s => s.cumPnl)
  const minV = Math.min(0, ...values)
  const maxV = Math.max(0, ...values)
  const range = maxV - minV || 1
  const n = series.length
  const xOf = (i: number) => PX + (i / (n - 1)) * (W - 2 * PX)
  const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
  const y0 = yOf(0)
  const pts = series.map((s, i) => `${xOf(i)},${yOf(s.cumPnl)}`).join(' ')
  const lastVal = values[values.length - 1]
  const isPos = lastVal >= 0
  const lineColor = isPos ? '#22c55e' : '#ef4444'
  const fillPath = `M${xOf(0)},${y0} ${series.map((s, i) => `L${xOf(i)},${yOf(s.cumPnl)}`).join(' ')} L${xOf(n - 1)},${y0} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 160 }}>
        <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke="rgba(255,255,255,.05)" strokeWidth={1} strokeDasharray="3 5" />
        <path d={fillPath} fill={isPos ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.06)'} />
        <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xOf(n - 1)} cy={yOf(lastVal)} r={2.5} fill={lineColor} />
        <circle cx={xOf(n - 1)} cy={yOf(lastVal)} r={5} fill={lineColor} opacity={0.2} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(232,230,224,.22)', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
        <span>{series[0].date}</span>
        <span>{series[series.length - 1].date}</span>
      </div>
    </div>
  )
}

const LVL_COLORS: Record<number, string> = { 1: 'rgba(147,197,253,.7)', 2: 'rgba(251,191,36,.7)', 3: 'rgba(220,80,60,.7)' }

export default function AnalyticsClient({ trades, alerts, userEmail }: AnalyticsClientProps) {
  const series = computeDayStats(trades)
  const alertFreq = computeAlertFreq(alerts)
  const maxAlertCount = alertFreq[0]?.count ?? 1

  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins = trades.filter(t => (t.pnl ?? 0) > 0).length
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0
  const pnlColor = totalPnl >= 0 ? '#22c55e' : '#ef4444'
  const pnlSign = totalPnl >= 0 ? '+' : ''

  const bestDay = series.reduce((b, s) => s.pnl > (b?.pnl ?? -Infinity) ? s : b, null as DayStats | null)
  const worstDay = series.reduce((w, s) => s.pnl < (w?.pnl ?? Infinity) ? s : w, null as DayStats | null)

  const CARD: React.CSSProperties = {
    background: '#0d0d18',
    border: '0.5px solid rgba(255,255,255,.08)',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  }

  const statCards = [
    { label: 'PnL total',      value: `${pnlSign}${totalPnl.toFixed(2)}`, sub: '30 jours',     color: pnlColor },
    { label: 'Trades',         value: trades.length,                       sub: 'au total',     color: 'rgba(232,230,224,.85)' },
    { label: 'Win rate',       value: `${winRate}%`,                       sub: 'réussite',     color: winRate >= 50 ? '#22c55e' : '#f59e0b' },
    { label: 'Meilleur jour',  value: bestDay ? `+${bestDay.pnl.toFixed(0)}` : '—', sub: bestDay?.date ?? '—', color: '#22c55e' },
    { label: 'Pire jour',      value: worstDay ? worstDay.pnl.toFixed(0) : '—', sub: worstDay?.date ?? '—', color: '#ef4444' },
    { label: 'Alertes',        value: alerts.length,                       sub: 'déclenchées',  color: alerts.length > 0 ? '#f59e0b' : '#22c55e' },
  ]

  return (
    <>
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#07070e}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        @keyframes anFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ minHeight: '100vh', background: '#07070e', color: '#e8e6e0', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        <AppHeader current="analytics" userEmail={userEmail} />

        <main style={{ padding: '5rem 3rem 4rem', maxWidth: 1060, margin: '0 auto', width: '100%', animation: 'anFadeIn .4s ease both' }}>

          {/* Title */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.5rem' }}>Période</div>
            <h1 style={{ margin: 0, fontWeight: 200, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', letterSpacing: -1, color: '#fff', lineHeight: 1.1 }}>
              Analytics — 30 derniers jours
            </h1>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {statCards.map((s, i) => (
              <div key={i} style={{ ...CARD, padding: '1.1rem 1.25rem' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)' }} />
                <div style={{ fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '.6rem' }}>{s.label}</div>
                <div style={{ fontSize: 'clamp(1.1rem,1.8vw,1.4rem)', fontWeight: 200, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: -.5 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9.5, color: 'rgba(232,230,224,.25)', marginTop: '.3rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* PnL chart */}
          <div style={{ ...CARD, padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '1.25rem' }}>PnL cumulatif</div>
            <PnlChart series={series} />
          </div>

          {/* Two columns: alert freq + day table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

            {/* Alert freq */}
            <div style={{ ...CARD, padding: '1.5rem 1.75rem' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '1.25rem' }}>Alertes par type</div>
              {alertFreq.length === 0 ? (
                <p style={{ color: 'rgba(232,230,224,.25)', fontSize: 13, margin: 0 }}>Aucune alerte sur la période</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {alertFreq.map(({ type, count, level }) => (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ color: 'rgba(232,230,224,.5)', fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: .5 }}>
                          {type.replace(/_/g, ' ')}
                        </span>
                        <span style={{ color: LVL_COLORS[level] ?? 'rgba(232,230,224,.4)', fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${(count / maxAlertCount) * 100}%`, background: LVL_COLORS[level] ?? 'rgba(232,230,224,.3)', borderRadius: 2, transition: 'width .5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Day table */}
            <div style={{ ...CARD, padding: '1.5rem 1.75rem', overflowY: 'auto', maxHeight: 340 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(232,230,224,.28)', marginBottom: '1.25rem' }}>Performance par jour</div>
              {series.length === 0 ? (
                <p style={{ color: 'rgba(232,230,224,.25)', fontSize: 13, margin: 0 }}>Aucun trade sur la période</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['Date', 'Trades', 'Gagnants', 'PnL'].map(h => (
                        <th key={h} style={{ textAlign: 'left', color: 'rgba(232,230,224,.25)', fontWeight: 400, fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '0 8px 10px', borderBottom: '0.5px solid rgba(255,255,255,.07)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...series].reverse().map(s => (
                      <tr key={s.date}>
                        <td style={{ padding: '8px 8px', color: 'rgba(232,230,224,.45)', fontFamily: 'monospace', fontSize: 11, borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>{s.date}</td>
                        <td style={{ padding: '8px 8px', color: 'rgba(232,230,224,.45)', borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>{s.trades}</td>
                        <td style={{ padding: '8px 8px', color: 'rgba(232,230,224,.45)', borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>{s.wins}</td>
                        <td style={{ padding: '8px 8px', color: s.pnl >= 0 ? '#22c55e' : '#ef4444', fontFamily: 'monospace', fontWeight: 600, borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>
                          {s.pnl >= 0 ? '+' : ''}{s.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
