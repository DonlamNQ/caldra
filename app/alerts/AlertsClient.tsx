'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

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

const LEVEL_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'INFO',     color: '#60a5fa', bg: '#1d3557' },
  2: { label: 'WARNING',  color: '#f59e0b', bg: '#3d2e00' },
  3: { label: 'CRITICAL', color: '#ef4444', bg: '#4d1010' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function exportCSV(alerts: AlertRecord[]) {
  const headers = ['Date', 'Type', 'Sévérité', 'Message', 'Trade ID']
  const rows = alerts.map(a => [
    new Date(a.created_at).toISOString(),
    a.type ?? a.pattern ?? '',
    String(a.level ?? a.severity ?? 1),
    `"${a.message.replace(/"/g, '""')}"`,
    a.trade_id ?? '',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
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
  { label: 'Info',   value: '1' },
  { label: 'Warning', value: '2' },
  { label: 'Critical', value: '3' },
]

export default function AlertsClient({ alerts, userEmail }: AlertsClientProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 25

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      const level = a.level ?? a.severity ?? 1
      const matchLevel = filter === 'all' || String(level) === filter
      const matchSearch = !search ||
        (a.message.toLowerCase().includes(search.toLowerCase())) ||
        ((a.type ?? a.pattern ?? '').toLowerCase().includes(search.toLowerCase()))
      return matchLevel && matchSearch
    })
  }, [alerts, filter, search])

  const paginated = filtered.slice(0, page * PER_PAGE)
  const hasMore = paginated.length < filtered.length

  async function handleSignOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Stats summary
  const counts = { 1: 0, 2: 0, 3: 0 }
  alerts.forEach(a => { const l = a.level ?? a.severity ?? 1; counts[l as 1|2|3]++ })

  return (
    <div style={{ minHeight: '100vh', background: '#08080d', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #1e1e35', background: '#0a0a14' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>caldra</span>
          <span style={{ color: '#334155' }}>/</span>
          <a href="/dashboard" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>dashboard</a>
          <span style={{ color: '#334155' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>alertes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#334155', fontSize: 12 }}>{userEmail}</span>
          <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 6, color: '#475569', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
        {/* Title + export */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Historique des alertes</h1>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 14 }}>
              {alerts.length} alerte{alerts.length !== 1 ? 's' : ''} au total
            </p>
          </div>
          <button
            onClick={() => exportCSV(filtered)}
            style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 8, color: '#94a3b8', fontSize: 13, padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ↓ Export CSV
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {([1, 2, 3] as const).map(level => {
            const cfg = LEVEL_CONFIG[level]
            return (
              <div
                key={level}
                onClick={() => setFilter(filter === String(level) ? 'all' : String(level))}
                style={{
                  background: filter === String(level) ? cfg.bg : '#0d0d1a',
                  border: `1px solid ${filter === String(level) ? cfg.color + '44' : '#1e1e35'}`,
                  borderRadius: 10,
                  padding: '14px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {cfg.label}
                </p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
                  {counts[level]}
                </p>
              </div>
            )
          })}
        </div>

        {/* Filters + search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 8, padding: 4 }}>
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setPage(1) }}
                style={{
                  background: filter === f.value ? '#1e1e35' : 'none',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 12px',
                  color: filter === f.value ? '#e2e8f0' : '#475569',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: filter === f.value ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{
              flex: 1,
              background: '#0d0d1a',
              border: '1px solid #1e1e35',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#e2e8f0',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        {/* Table */}
        <div style={{ background: '#0d0d1a', border: '1px solid #1e1e35', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#374151', padding: '48px 0', fontSize: 14 }}>
              Aucune alerte correspondante
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e35' }}>
                  {['Sévérité', 'Type', 'Message', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', color: '#475569', fontWeight: 500, padding: '10px 16px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((alert, i) => {
                  const level = alert.level ?? alert.severity ?? 1
                  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1]
                  const typeLabel = alert.type ?? alert.pattern ?? '—'
                  return (
                    <tr key={alert.id ?? i} style={{ borderBottom: '1px solid #13132a' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 4 }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>
                        {typeLabel}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#e2e8f0', maxWidth: 420 }}>
                        {alert.message}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#475569', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDate(alert.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Load more */}
        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ background: 'none', border: '1px solid #1e1e35', borderRadius: 8, color: '#64748b', fontSize: 13, padding: '8px 24px', cursor: 'pointer' }}
            >
              Charger plus ({filtered.length - paginated.length} restants)
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
