'use client'

export interface AlertRow {
  id: string
  type?: string
  pattern?: string
  level?: number
  severity?: number
  message: string
  created_at: string
  detail?: Record<string, unknown>
}

interface AlertFeedProps {
  alerts: AlertRow[]
}

const LEVEL_CONFIG: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'INFO',     color: '#60a5fa', bg: '#0d1a2e', border: '#1d3557' },
  2: { label: 'WARNING',  color: '#f59e0b', bg: '#1a1400', border: '#3d2e00' },
  3: { label: 'CRITICAL', color: '#ef4444', bg: '#1a0505', border: '#4d1010' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function AlertCard({ alert, isNew }: { alert: AlertRow; isNew?: boolean }) {
  const level = alert.level ?? alert.severity ?? 1
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1]
  const typeLabel = alert.type ?? alert.pattern ?? '—'

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        animation: isNew ? 'slideIn 0.3s ease' : undefined,
      }}
    >
      <span
        style={{
          background: cfg.border,
          color: cfg.color,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          padding: '2px 6px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {cfg.label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: '#e2e8f0', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
          {alert.message}
        </p>
        <p style={{ margin: '3px 0 0', color: '#475569', fontSize: 11, fontFamily: 'monospace' }}>
          {typeLabel} · {formatTime(alert.created_at)}
        </p>
      </div>
    </div>
  )
}

export default function AlertFeed({ alerts }: AlertFeedProps) {
  const criticals = alerts.filter(a => (a.level ?? a.severity ?? 1) === 3)
  const others = alerts.filter(a => (a.level ?? a.severity ?? 1) < 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'hidden' }}>
      {/* Critical banner */}
      {criticals.length > 0 && (
        <div
          style={{
            background: '#1a0505',
            border: '1px solid #7f1d1d',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>🚨</span>
          <div>
            <p style={{ margin: 0, color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
              {criticals.length} alerte{criticals.length > 1 ? 's' : ''} critique{criticals.length > 1 ? 's' : ''}
            </p>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>
              {criticals[0].message}
            </p>
          </div>
        </div>
      )}

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#374151', padding: '32px 0', fontSize: 13 }}>
            Aucune alerte aujourd'hui
          </div>
        ) : (
          [...criticals, ...others].map((alert, i) => (
            <AlertCard key={alert.id ?? i} alert={alert} isNew={i === 0} />
          ))
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
