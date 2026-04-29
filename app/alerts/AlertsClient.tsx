'use client'

import { useState, useMemo } from 'react'
import AppShell from '@/components/AppShell'

export interface AlertRecord {
  id: string
  type?: string
  pattern?: string
  level?: number
  severity?: number
  message: string
  created_at: string
  session_date?: string
  trade_id?: string
  detail?: Record<string, unknown>
}

interface AlertsClientProps {
  alerts: AlertRecord[]
  userEmail: string
}

const LVL: Record<number, { label: string; color: string; bg: string; border: string; dot: string }> = {
  1: { label: 'Info',     color: 'rgba(56,189,248,.85)',  bg: 'rgba(56,189,248,.06)',   border: 'rgba(56,189,248,.18)',  dot: '#38bdf8' },
  2: { label: 'Warning',  color: 'rgba(251,191,36,.9)',   bg: 'rgba(251,191,36,.06)',   border: 'rgba(251,191,36,.2)',   dot: '#fbbf24' },
  3: { label: 'Critique', color: 'rgba(244,63,94,.9)',    bg: 'rgba(244,63,94,.07)',    border: 'rgba(244,63,94,.25)',   dot: '#f43f5e' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function exportCSV(alerts: AlertRecord[]) {
  const rows = alerts.map(a => [new Date(a.created_at).toISOString(), a.type ?? a.pattern ?? '', String(a.level ?? a.severity ?? 1), `"${a.message.replace(/"/g, '""')}"`, a.trade_id ?? ''])
  const csv = [['Date', 'Type', 'Sévérité', 'Message', 'Trade ID'].join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `caldra-alerts-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  URL.revokeObjectURL(url)
}

const FILTERS = [{ label: 'Toutes', value: 'all' }, { label: 'Info', value: '1' }, { label: 'Warning', value: '2' }, { label: 'Critique', value: '3' }]

export default function AlertsClient({ alerts, userEmail }: AlertsClientProps) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER = 25

  const filtered = useMemo(() => alerts.filter(a => {
    const l = a.level ?? a.severity ?? 1
    return (filter === 'all' || String(l) === filter) &&
      (!search || a.message.toLowerCase().includes(search.toLowerCase()) || (a.type ?? a.pattern ?? '').toLowerCase().includes(search.toLowerCase()))
  }), [alerts, filter, search])

  const paginated = filtered.slice(0, page * PER)
  const counts = { 1: 0, 2: 0, 3: 0 }
  alerts.forEach(a => { const l = (a.level ?? a.severity ?? 1) as 1|2|3; counts[l]++ })

  const CARD: React.CSSProperties = { background: '#0f0f17', border: '0.5px solid rgba(255,255,255,.065)', borderRadius: 10, position: 'relative', overflow: 'hidden' }

  return (
    <>
      <style>{`
        @keyframes alFadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .al-sumcard:hover{border-color:rgba(255,255,255,.12)!important;cursor:pointer}
        .al-row:hover{background:rgba(255,255,255,.02)!important}
        .al-filt{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;padding:5px 11px;background:transparent;border:none;color:rgba(226,224,218,.3);cursor:pointer;font-family:'DM Sans',sans-serif;border-radius:5px;transition:all .12s}
        .al-filt:hover{color:rgba(226,224,218,.7)}
        .al-filt-on{color:#fff!important;background:rgba(255,255,255,.07)!important}
        .al-search{width:100%;padding:8px 13px;background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.09);border-radius:7px;color:#e2e0da;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .2s}
        .al-search:focus{border-color:rgba(56,189,248,.3)}
        .al-search::placeholder{color:rgba(226,224,218,.22)}
        .al-more{font-size:9px;padding:7px 18px;background:transparent;border:0.5px solid rgba(255,255,255,.09);border-radius:6px;color:rgba(226,224,218,.35);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .15s}
        .al-more:hover{background:rgba(255,255,255,.04);color:rgba(226,224,218,.65)}
        .al-export{font-size:9px;padding:6px 12px;background:transparent;border:0.5px solid rgba(255,255,255,.1);border-radius:5px;color:rgba(226,224,218,.4);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .15s;display:flex;align-items:center;gap:5px}
        .al-export:hover{background:rgba(255,255,255,.04);color:rgba(226,224,218,.7)}
      `}</style>
      <AppShell current="alertes" userEmail={userEmail}>
        <main style={{ padding: '2rem', animation: 'alFadeIn .4s ease both' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.4rem', fontFamily: "'DM Sans',sans-serif" }}>Historique</div>
              <h1 style={{ margin: 0, fontWeight: 400, fontSize: '1.6rem', letterSpacing: -.5, color: '#fff', lineHeight: 1, fontFamily: "'DM Sans',sans-serif" }}>Alertes</h1>
              <p style={{ margin: '.4rem 0 0', color: 'rgba(226,224,218,.3)', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
                {alerts.length} alerte{alerts.length !== 1 ? 's' : ''} au total
              </p>
            </div>
            <button className="al-export" onClick={() => exportCSV(filtered)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            {([1,2,3] as const).map(l => {
              const cfg = LVL[l]; const isOn = filter === String(l)
              return (
                <div key={l} className="al-sumcard" onClick={() => setFilter(isOn ? 'all' : String(l))} style={{
                  ...CARD, padding: '1.1rem 1.3rem', transition: 'border-color .15s',
                  background: isOn ? cfg.bg : '#0f0f17', border: `0.5px solid ${isOn ? cfg.border : 'rgba(255,255,255,.065)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: '.5rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, boxShadow: isOn ? `0 0 6px ${cfg.dot}66` : 'none' }} />
                    <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: isOn ? cfg.color : 'rgba(226,224,218,.28)', fontFamily: "'DM Sans',sans-serif" }}>{cfg.label}</span>
                  </div>
                  <div style={{ fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 500, color: isOn ? cfg.color : 'rgba(226,224,218,.75)', fontVariantNumeric: 'tabular-nums', fontFamily: "var(--font-geist-mono),monospace", letterSpacing: -1 }}>
                    {counts[l]}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Filters + search */}
          <div style={{ display: 'flex', gap: '.875rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.07)', borderRadius: 7, padding: 3 }}>
              {FILTERS.map(f => (
                <button key={f.value} className={`al-filt${filter === f.value ? ' al-filt-on' : ''}`} onClick={() => { setFilter(f.value); setPage(1) }}>{f.label}</button>
              ))}
            </div>
            <input className="al-search" type="text" placeholder="Rechercher…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>

          {/* Table */}
          <div style={{ ...CARD }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(226,224,218,.2)', padding: '3rem 0', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>Aucune alerte correspondante</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Niveau', 'Type', 'Message', 'Date'].map(h => (
                      <th key={h} style={{ textAlign: 'left', color: 'rgba(226,224,218,.25)', fontWeight: 400, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', padding: '11px 14px', borderBottom: '0.5px solid rgba(255,255,255,.07)', fontFamily: "'DM Sans',sans-serif" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((alert, i) => {
                    const l = alert.level ?? alert.severity ?? 1
                    const cfg = LVL[l] ?? LVL[1]
                    const type = (alert.type ?? alert.pattern ?? '—').replace(/_/g, ' ')
                    return (
                      <tr key={alert.id ?? i} className="al-row" style={{ transition: 'background .12s' }}>
                        <td style={{ padding: '9px 14px', borderBottom: '0.5px solid rgba(255,255,255,.04)', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ color: cfg.color, fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>{cfg.label}</span>
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px', color: 'rgba(226,224,218,.32)', fontSize: 10, fontFamily: "var(--font-geist-mono),monospace", borderBottom: '0.5px solid rgba(255,255,255,.04)', whiteSpace: 'nowrap' }}>{type}</td>
                        <td style={{ padding: '9px 14px', color: 'rgba(226,224,218,.72)', lineHeight: 1.5, borderBottom: '0.5px solid rgba(255,255,255,.04)', maxWidth: 440 }}>{alert.message}</td>
                        <td style={{ padding: '9px 14px', color: 'rgba(226,224,218,.25)', fontSize: 10, fontFamily: "var(--font-geist-mono),monospace", borderBottom: '0.5px solid rgba(255,255,255,.04)', whiteSpace: 'nowrap' }}>{fmtDate(alert.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {paginated.length < filtered.length && (
            <div style={{ textAlign: 'center', marginTop: '1.1rem' }}>
              <button className="al-more" onClick={() => setPage(p => p + 1)}>
                Charger plus ({filtered.length - paginated.length} restants)
              </button>
            </div>
          )}
        </main>
      </AppShell>
    </>
  )
}
