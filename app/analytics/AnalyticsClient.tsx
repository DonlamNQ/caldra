'use client'

import AppShell from '@/components/AppShell'

interface Trade { id: string; pnl?: number; entry_time: string; direction?: string; symbol?: string }
interface AlertRecord { id: string; type?: string; pattern?: string; level?: number; severity?: number; created_at: string }
interface DayStats { date: string; pnl: number; cumPnl: number; trades: number; wins: number }
interface AnalyticsClientProps { trades: Trade[]; alerts: AlertRecord[]; userEmail: string }

function computeDayStats(trades: Trade[]): DayStats[] {
  const by: Record<string, Trade[]> = {}
  for (const t of trades) { const d = t.entry_time.split('T')[0]; if (!by[d]) by[d] = []; by[d].push(t) }
  let cum = 0
  return Object.keys(by).sort().map(date => {
    const ts = by[date]; const pnl = ts.reduce((s, t) => s + (t.pnl ?? 0), 0); cum += pnl
    return { date, pnl, cumPnl: cum, trades: ts.length, wins: ts.filter(t => (t.pnl ?? 0) > 0).length }
  })
}

function computeFreq(alerts: AlertRecord[]) {
  const f: Record<string, { count: number; level: number }> = {}
  for (const a of alerts) { const k = a.type ?? a.pattern ?? 'unknown'; if (!f[k]) f[k] = { count: 0, level: a.level ?? a.severity ?? 1 }; f[k].count++ }
  return Object.entries(f).map(([type, { count, level }]) => ({ type, count, level })).sort((a, b) => b.count - a.count)
}

function PnlChart({ series }: { series: DayStats[] }) {
  const W = 600, H = 140, PX = 4, PY = 12
  const LC = '#e2e8f0'
  const GRID = '#1e1e35'

  if (series.length === 0) {
    const yMid = H / 2
    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 150 }}>
          <line x1={PX} y1={PY} x2={PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
          <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
          <line x1={PX} y1={yMid} x2={W - PX} y2={yMid} stroke={GRID} strokeWidth={0.5} strokeDasharray="4 6" />
          <text x={W / 2} y={yMid + 4} textAnchor="middle" fill="rgba(226,232,240,.3)" fontSize="10" fontFamily="'Geist Mono',monospace">// aucune donnée</text>
        </svg>
      </div>
    )
  }

  if (series.length === 1) {
    const vals = [0, series[0].cumPnl]
    const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals), range = maxV - minV || 1
    const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
    const y0 = yOf(0)
    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 150 }}>
          <line x1={PX} y1={PY} x2={PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
          <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke={GRID} strokeWidth={1} />
          <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke={GRID} strokeWidth={0.5} strokeDasharray="4 6" />
          <circle cx={W / 2} cy={yOf(series[0].cumPnl)} r={3} fill={LC} />
        </svg>
      </div>
    )
  }

  const vals = series.map(s => s.cumPnl)
  const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals), range = maxV - minV || 1, n = series.length
  const xOf = (i: number) => PX + (i / (n - 1)) * (W - 2 * PX)
  const yOf = (v: number) => PY + (H - 2 * PY) - ((v - minV) / range) * (H - 2 * PY)
  const y0 = yOf(0)
  const pts = series.map((s, i) => `${xOf(i)},${yOf(s.cumPnl)}`).join(' ')
  const fp = `M${xOf(0)},${y0} ${series.map((s, i) => `L${xOf(i)},${yOf(s.cumPnl)}`).join(' ')} L${xOf(n - 1)},${y0} Z`
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 150 }}>
        <line x1={PX} y1={y0} x2={W - PX} y2={y0} stroke={GRID} strokeWidth={1} strokeDasharray="3 5"/>
        <path d={fp} fill="rgba(226,232,240,0.05)"/>
        <polyline points={pts} fill="none" stroke={LC} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={xOf(n-1)} cy={yOf(vals[n-1])} r={2.5} fill={LC}/>
        <circle cx={xOf(n-1)} cy={yOf(vals[n-1])} r={6} fill={LC} opacity={0.15}/>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(226,224,218,.2)', fontFamily: "'Geist Mono',monospace", marginTop: 4 }}>
        <span>{series[0].date}</span><span>{series[series.length-1].date}</span>
      </div>
    </div>
  )
}

const DOT_COLORS: Record<number, string> = { 1: '#38bdf8', 2: '#fbbf24', 3: '#f43f5e' }

export default function AnalyticsClient({ trades, alerts, userEmail }: AnalyticsClientProps) {
  const series = computeDayStats(trades)
  const freq = computeFreq(alerts)
  const maxFreq = freq[0]?.count ?? 1
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const wins = trades.filter(t => (t.pnl ?? 0) > 0).length
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0
  const pnlColor = '#e2e8f0'
  const best = series.reduce((b, s) => s.pnl > (b?.pnl ?? -Infinity) ? s : b, null as DayStats|null)
  const worst = series.reduce((w, s) => s.pnl < (w?.pnl ?? Infinity) ? s : w, null as DayStats|null)

  const CARD: React.CSSProperties = { background: '#0f0f17', border: '0.5px solid rgba(255,255,255,.065)', borderRadius: 10, position: 'relative', overflow: 'hidden' }

  return (
    <>
      <style>{`@keyframes anFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <AppShell current="analytics" userEmail={userEmail}>
        <main style={{ padding: '2rem', animation: 'anFadeIn .4s ease both' }}>

          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.4rem', fontFamily: "'DM Sans',sans-serif" }}>Période</div>
            <h1 style={{ margin: 0, fontWeight: 400, fontSize: '1.6rem', letterSpacing: -.5, color: '#fff', fontFamily: "'DM Sans',sans-serif" }}>Analytics — 30 jours</h1>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '.875rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'PnL total',     value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`, color: pnlColor },
              { label: 'Trades',        value: String(trades.length),  color: 'rgba(226,224,218,.8)' },
              { label: 'Win rate',      value: `${winRate}%`,          color: winRate >= 50 ? '#10b981' : '#f59e0b' },
              { label: 'Meilleur jour', value: best ? `+${best.pnl.toFixed(0)}` : '—', color: '#10b981' },
              { label: 'Pire jour',     value: worst ? worst.pnl.toFixed(0) : '—',     color: '#f43f5e' },
              { label: 'Alertes',       value: String(alerts.length),  color: alerts.length > 0 ? '#f59e0b' : '#10b981' },
            ].map((s, i) => (
              <div key={i} style={{ ...CARD, padding: '1rem 1.1rem' }}>
                <div style={{ fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(226,224,218,.25)', marginBottom: '.5rem', fontFamily: "'DM Sans',sans-serif" }}>{s.label}</div>
                <div style={{ fontSize: 'clamp(1rem,1.6vw,1.3rem)', fontWeight: 500, color: s.color, fontVariantNumeric: 'tabular-nums', fontFamily: "'Geist Mono',monospace", letterSpacing: -.5 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ ...CARD, padding: '1.4rem 1.6rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', marginBottom: '1.1rem', fontFamily: "'DM Sans',sans-serif" }}>PnL cumulatif</div>
            <PnlChart series={series} />
          </div>

          {/* 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

            {/* Alert freq */}
            <div style={{ ...CARD, padding: '1.4rem 1.6rem' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', marginBottom: '1.1rem', fontFamily: "'DM Sans',sans-serif" }}>Alertes par type</div>
              {freq.length === 0 ? (
                <p style={{ color: 'rgba(226,224,218,.22)', fontSize: 13, margin: 0, fontFamily: "'DM Sans',sans-serif" }}>Aucune alerte sur la période</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {freq.map(({ type, count, level }) => (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ color: 'rgba(226,224,218,.4)', fontSize: 10, fontFamily: "'Geist Mono',monospace", textTransform: 'uppercase', letterSpacing: .5 }}>{type.replace(/_/g, ' ')}</span>
                        <span style={{ color: DOT_COLORS[level] ?? 'rgba(226,224,218,.4)', fontSize: 10, fontWeight: 600, fontFamily: "'Geist Mono',monospace" }}>{count}</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${(count / maxFreq) * 100}%`, background: DOT_COLORS[level] ?? 'rgba(226,224,218,.3)', borderRadius: 2, transition: 'width .5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Day table */}
            <div style={{ ...CARD, padding: '1.4rem 1.6rem', overflowY: 'auto', maxHeight: 320 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(226,224,218,.28)', marginBottom: '1.1rem', fontFamily: "'DM Sans',sans-serif" }}>Performance par jour</div>
              {series.length === 0 ? (
                <p style={{ color: 'rgba(226,224,218,.22)', fontSize: 13, margin: 0, fontFamily: "'DM Sans',sans-serif" }}>Aucun trade sur la période</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {['Date', 'Trades', 'Wins', 'PnL'].map(h => (
                        <th key={h} style={{ textAlign: 'left', color: 'rgba(226,224,218,.22)', fontWeight: 400, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '0 8px 9px', borderBottom: '0.5px solid rgba(255,255,255,.07)', fontFamily: "'DM Sans',sans-serif' "}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...series].reverse().map(s => (
                      <tr key={s.date}>
                        <td style={{ padding: '7px 8px', color: 'rgba(226,224,218,.4)', fontFamily: "'Geist Mono',monospace", borderBottom: '0.5px solid rgba(255,255,255,.04)' }}>{s.date}</td>
                        <td style={{ padding: '7px 8px', color: 'rgba(226,224,218,.4)', borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>{s.trades}</td>
                        <td style={{ padding: '7px 8px', color: 'rgba(226,224,218,.4)', borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>{s.wins}</td>
                        <td style={{ padding: '7px 8px', color: '#e2e8f0', fontFamily: "'Geist Mono',monospace", fontWeight: 600, borderBottom: '0.5px solid rgba(255,255,255,.04)', fontVariantNumeric: 'tabular-nums' }}>
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
      </AppShell>
    </>
  )
}
