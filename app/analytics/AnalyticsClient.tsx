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
    const dayTrades = byDay[date]
    const pnl = dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
    cum += pnl
    return {
      date,
      pnl,
      cumPnl: cum,
      trades: dayTrades.length,
      wins: dayTrades.filter(t => (t.pnl ?? 0) > 0).length,
    }
  })
}

function computeAlertFreq(alerts: AlertRecord[]): { type: string; count: number; level: number }[] {
  const freq: Record<string, { count: number; level: number }> = {}
  for (const a of alerts) {
    const key = a.type ?? a.pattern ?? 'unknown'
    if (!freq[key]) freq[key] = { count: 0, level: a.level ?? a.severity ?? 1 }
    freq[key].count++
  }
  return Object.entries(freq)
    .map(([type, { count, level }]) => ({ type, count, level }))
    .sort((a, b) => b.count - a.count)
}

// SVG PnL line chart
function PnlChart({ series }: { series: DayStats[] }) {
  if (series.length < 2) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontSize: 13 }}>
        Pas assez de données (min. 2 jours)
      </div>
    )
  }
  const W = 560, H = 140, PAD_X = 8, PAD_Y = 16
  const values = series.map(s => s.cumPnl)
  const minV = Math.min(0, ...values)
  const maxV = Math.max(0, ...values)
  const range = maxV - minV || 1
  const n = series.length

  const xOf = (i: number) => PAD_X + (i / (n - 1)) * (W - 2 * PAD_X)
  const yOf = (v: number) => PAD_Y + (H - 2 * PAD_Y) - ((v - minV) / range) * (H - 2 * PAD_Y)
  const y0 = yOf(0)
  const pts = series.map((s, i) => `${xOf(i)},${yOf(s.cumPnl)}`).join(' ')
  const lastVal = values[values.length - 1]
  const isPos = lastVal >= 0
  const lineColor = isPos ? '#22c55e' : '#ef4444'
  const fillColor = isPos ? '#052e16' : '#1a0505'

  const fillPath = `M${xOf(0)},${y0} ` +
    series.map((s, i) => `L${xOf(i)},${yOf(s.cumPnl)}`).join(' ') +
    ` L${xOf(n - 1)},${y0} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 180 }}>
      {/* Zero line */}
      <line x1={PAD_X} y1={y0} x2={W - PAD_X} y2={y0} stroke="#1e1e35" strokeWidth={1} strokeDasharray="4 4" />
      {/* Fill */}
      <path d={fillPath} fill={fillColor} opacity={0.6} />
      {/* Line */}
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Last value dot */}
      <circle cx={xOf(n - 1)} cy={yOf(lastVal)} r={3} fill={lineColor} />
    </svg>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 10, padding: '16px 20px' }}>
      <p style={{ margin: '0 0 4px', color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: 0, color: color ?? '#e2e8f0', fontSize: 24, fontWeight: 700, fontFamily: 'monospace' }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', color: '#374151', fontSize: 12 }}>{sub}</p>}
    </div>
  )
}

const LEVEL_COLORS: Record<number, string> = { 1: '#60a5fa', 2: '#f59e0b', 3: '#ef4444' }

export default function AnalyticsClient({ trades, alerts, userEmail }: AnalyticsClientProps) {
  const series = computeDayStats(trades)
  const alertFreq = computeAlertFreq(alerts)
  const maxAlertCount = alertFreq[0]?.count ?? 1

  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins = trades.filter(t => (t.pnl ?? 0) > 0).length
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0
  const pnlColor = totalPnl >= 0 ? '#22c55e' : '#ef4444'
  const pnlSign = totalPnl >= 0 ? '+' : ''

  const bestDay = series.reduce((best, s) => s.pnl > (best?.pnl ?? -Infinity) ? s : best, null as DayStats | null)
  const worstDay = series.reduce((worst, s) => s.pnl < (worst?.pnl ?? Infinity) ? s : worst, null as DayStats | null)

  return (
    <div style={{ minHeight: '100vh', background: '#08080d', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <AppHeader current="analytics" userEmail={userEmail} />

      <main style={{ padding: '32px 24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Analytics — 30 derniers jours</h1>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="PnL total" value={`${pnlSign}${totalPnl.toFixed(2)}`} color={pnlColor} />
          <StatCard label="Trades" value={trades.length} />
          <StatCard label="Win rate" value={`${winRate}%`} color={winRate >= 50 ? '#22c55e' : '#f59e0b'} />
          <StatCard label="Meilleur jour" value={bestDay ? `+${bestDay.pnl.toFixed(0)}` : '—'} sub={bestDay?.date} color="#22c55e" />
          <StatCard label="Pire jour" value={worstDay ? worstDay.pnl.toFixed(0) : '—'} sub={worstDay?.date} color="#ef4444" />
          <StatCard label="Alertes" value={alerts.length} color={alerts.length > 0 ? '#f59e0b' : '#22c55e'} />
        </div>

        {/* PnL chart */}
        <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            PnL cumulatif
          </p>
          <PnlChart series={series} />
          {series.length >= 2 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ color: '#374151', fontSize: 11, fontFamily: 'monospace' }}>{series[0].date}</span>
              <span style={{ color: '#374151', fontSize: 11, fontFamily: 'monospace' }}>{series[series.length - 1].date}</span>
            </div>
          )}
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Alert frequency */}
          <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '20px 24px' }}>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Alertes par type
            </p>
            {alertFreq.length === 0 ? (
              <p style={{ color: '#374151', fontSize: 13, margin: 0 }}>Aucune alerte sur la période</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alertFreq.map(({ type, count, level }) => (
                  <div key={type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{type}</span>
                      <span style={{ color: LEVEL_COLORS[level] ?? '#64748b', fontSize: 12, fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: '#1e1e35', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${(count / maxAlertCount) * 100}%`, background: LEVEL_COLORS[level] ?? '#64748b', borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PnL par jour table */}
          <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, padding: '20px 24px', overflowY: 'auto', maxHeight: 320 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Performance par jour
            </p>
            {series.length === 0 ? (
              <p style={{ color: '#374151', fontSize: 13, margin: 0 }}>Aucun trade sur la période</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Date', 'Trades', 'PnL'].map(h => (
                      <th key={h} style={{ textAlign: 'left', color: '#374151', fontWeight: 500, padding: '4px 6px', borderBottom: '1px solid #13132a' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...series].reverse().map(s => (
                    <tr key={s.date}>
                      <td style={{ padding: '6px 6px', color: '#64748b', fontFamily: 'monospace' }}>{s.date}</td>
                      <td style={{ padding: '6px 6px', color: '#64748b' }}>{s.trades}</td>
                      <td style={{ padding: '6px 6px', color: s.pnl >= 0 ? '#22c55e' : '#ef4444', fontFamily: 'monospace', fontWeight: 600 }}>
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
  )
}
