'use client'

import { useState, useMemo } from 'react'
import AppHeader from '@/components/AppHeader'

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

const LVL: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Info',     color: 'rgba(147,197,253,.85)', bg: 'rgba(59,130,246,.06)',  border: 'rgba(59,130,246,.2)'  },
  2: { label: 'Warn',     color: 'rgba(251,191,36,.85)',  bg: 'rgba(245,158,11,.06)',  border: 'rgba(245,158,11,.22)' },
  3: { label: 'Critique', color: 'rgba(220,80,60,.9)',    bg: 'rgba(220,80,60,.07)',   border: 'rgba(220,80,60,.28)'  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function exportCSV(alerts: AlertRecord[]) {
  const rows = alerts.map(a => [
    new Date(a.created_at).toISOString(),
    a.type ?? a.pattern ?? '',
    String(a.level ?? a.severity ?? 1),
    `"${a.message.replace(/"/g, '""')}"`,
    a.trade_id ?? '',
  ])
  const csv = [['Date', 'Type', 'Sévérité', 'Message', 'Trade ID'].join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `caldra-alerts-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const FILTERS = [
  { label: 'Toutes', value: 'all' },
  { label: 'Info',     value: '1' },
  { label: 'Warn',     value: '2' },
  { label: 'Critique', value: '3' },
]

export default function AlertsClient({ alerts, userEmail }: AlertsClientProps) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 25

  const filtered = useMemo(() => alerts.filter(a => {
    const level = a.level ?? a.severity ?? 1
    const matchLevel = filter === 'all' || String(level) === filter
    const matchSearch = !search ||
      a.message.toLowerCase().includes(search.toLowerCase()) ||
      (a.type ?? a.pattern ?? '').toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  }), [alerts, filter, search])

  const paginated = filtered.slice(0, page * PER_PAGE)
  const hasMore = paginated.length < filtered.length
  const counts = { 1: 0, 2: 0, 3: 0 }
  alerts.forEach(a => { const l = (a.level ?? a.severity ?? 1) as 1|2|3; counts[l]++ })

  const CARD: React.CSSProperties = {
    background: '#0d0d18',
    border: '0.5px solid rgba(255,255,255,.08)',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#07070e}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
        @keyframes aFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .al-filt-btn{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;background:transparent;border:none;color:rgba(232,230,224,.35);cursor:pointer;font-family:'DM Sans',sans-serif;border-radius:4px;transition:all .15s}
        .al-filt-btn:hover{color:rgba(232,230,224,.7)}
        .al-filt-active{color:#fff!important;background:rgba(255,255,255,.07)!important}
        .al-summary:hover{border-color:rgba(255,255,255,.14)!important;cursor:pointer}
        .al-row:hover{background:rgba(255,255,255,.02)!important}
        .al-export{font-size:9px;padding:7px 14px;background:transparent;border:0.5px solid rgba(255,255,255,.13);border-radius:4px;color:rgba(232,230,224,.45);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .2s}
        .al-export:hover{background:rgba(255,255,255,.05);color:rgba(232,230,224,.8)}
        .al-search{width:100%;padding:8px 14px;background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.1);border-radius:6px;color:#e8e6e0;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .2s}
        .al-search:focus{border-color:rgba(220,80,60,.35)}
        .al-search::placeholder{color:rgba(232,230,224,.25)}
        .al-more{font-size:9px;padding:8px 20px;background:transparent;border:0.5px solid rgba(255,255,255,.1);border-radius:6px;color:rgba(232,230,224,.4);cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;font-family:'DM Sans',sans-serif;transition:all .2s}
        .al-more:hover{background:rgba(255,255,255,.04);color:rgba(232,230,224,.7)}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#07070e', color: '#e8e6e0', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <AppHeader current="alertes" userEmail={userEmail} />

        <main style={{ padding: '5rem 3rem 4rem', maxWidth: 1060, margin: '0 auto', animation: 'aFadeIn .4s ease both' }}>

          {/* Title + export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(220,80,60,.55)', marginBottom: '.5rem' }}>Historique</div>
              <h1 style={{ margin: 0, fontWeight: 200, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', letterSpacing: -1, color: '#fff', lineHeight: 1.1 }}>
                Alertes
              </h1>
              <p style={{ margin: '.4rem 0 0', color: 'rgba(232,230,224,.3)', fontSize: 13, fontWeight: 300 }}>
                {alerts.length} alerte{alerts.length !== 1 ? 's' : ''} au total
              </p>
            </div>
            <button className="al-export" onClick={() => exportCSV(filtered)}>
              ↓ Export CSV
            </button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {([1, 2, 3] as const).map(level => {
              const cfg = LVL[level]
              const isActive = filter === String(level)
              return (
                <div key={level} className="al-summary" onClick={() => setFilter(isActive ? 'all' : String(level))} style={{
                  ...CARD,
                  padding: '1.25rem 1.5rem',
                  background: isActive ? cfg.bg : '#0d0d18',
                  border: `0.5px solid ${isActive ? cfg.border : 'rgba(255,255,255,.08)'}`,
                  transition: 'all .15s',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)' }} />
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: isActive ? cfg.color : 'rgba(232,230,224,.28)', marginBottom: '.5rem' }}>{cfg.label}</div>
                  <div style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 200, color: isActive ? cfg.color : 'rgba(232,230,224,.8)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>
                    {counts[level]}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Filters + search */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.08)', borderRadius: 6, padding: '3px' }}>
              {FILTERS.map(f => (
                <button key={f.value} className={`al-filt-btn${filter === f.value ? ' al-filt-active' : ''}`}
                  onClick={() => { setFilter(f.value); setPage(1) }}>
                  {f.label}
                </button>
              ))}
            </div>
            <input
              className="al-search"
              type="text"
              placeholder="Rechercher par message ou type…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          {/* Table */}
          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)' }} />
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(232,230,224,.2)', padding: '3.5rem 0', fontSize: 13 }}>
                Aucune alerte correspondante
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Niveau', 'Type', 'Message', 'Date'].map(h => (
                      <th key={h} style={{ textAlign: 'left', color: 'rgba(232,230,224,.28)', fontWeight: 400, fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,.07)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((alert, i) => {
                    const level = alert.level ?? alert.severity ?? 1
                    const cfg = LVL[level] ?? LVL[1]
                    const type = (alert.type ?? alert.pattern ?? '—').replace(/_/g, ' ')
                    return (
                      <tr key={alert.id ?? i} className="al-row" style={{ background: 'transparent', transition: 'background .12s' }}>
                        <td style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,.04)', whiteSpace: 'nowrap' }}>
                          <span style={{ background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`, fontSize: 9, fontWeight: 600, letterSpacing: '.1em', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'rgba(232,230,224,.35)', fontSize: 11, fontFamily: 'monospace', borderBottom: '0.5px solid rgba(255,255,255,.04)', whiteSpace: 'nowrap' }}>
                          {type}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'rgba(232,230,224,.75)', borderBottom: '0.5px solid rgba(255,255,255,.04)', maxWidth: 420, lineHeight: 1.5 }}>
                          {alert.message}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'rgba(232,230,224,.28)', fontSize: 11, fontFamily: 'monospace', borderBottom: '0.5px solid rgba(255,255,255,.04)', whiteSpace: 'nowrap' }}>
                          {formatDate(alert.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button className="al-more" onClick={() => setPage(p => p + 1)}>
                Charger plus ({filtered.length - paginated.length} restants)
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
