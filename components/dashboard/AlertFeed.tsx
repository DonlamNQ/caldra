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

const LVL: Record<number, { label: string; color: string; bg: string; border: string; accent: string }> = {
  1: { label: 'Info',     color: 'rgba(147,197,253,.9)', bg: 'rgba(59,130,246,.055)',  border: 'rgba(59,130,246,.18)',  accent: 'rgba(59,130,246,.6)' },
  2: { label: 'Warn',     color: 'rgba(251,191,36,.9)',  bg: 'rgba(245,158,11,.055)',  border: 'rgba(245,158,11,.22)',  accent: 'rgba(245,158,11,.7)' },
  3: { label: 'Critique', color: 'rgba(220,80,60,.95)',  bg: 'rgba(220,80,60,.07)',    border: 'rgba(220,80,60,.28)',   accent: '#dc503c' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function AlertCard({ alert, isNew }: { alert: AlertRow; isNew?: boolean }) {
  const level = alert.level ?? alert.severity ?? 1
  const cfg = LVL[level] ?? LVL[1]
  const type = (alert.type ?? alert.pattern ?? '—').replace(/_/g, ' ')

  return (
    <div style={{
      background: cfg.bg,
      border: `0.5px solid ${cfg.border}`,
      borderRadius: 10,
      padding: '10px 13px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      position: 'relative',
      overflow: 'hidden',
      animation: isNew ? 'alertIn .35s ease' : undefined,
    }}>
      {/* Left accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: cfg.accent, opacity: .55, borderRadius: '10px 0 0 10px' }} />
      <div style={{ paddingLeft: 5, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ color: cfg.color, fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>{cfg.label}</span>
          <span style={{ color: 'rgba(232,230,224,.22)', fontSize: 9, letterSpacing: .4, textTransform: 'uppercase' }}>{type}</span>
        </div>
        <p style={{ margin: 0, color: 'rgba(232,230,224,.82)', fontSize: 12.5, fontWeight: 400, lineHeight: 1.45 }}>
          {alert.message}
        </p>
        <p style={{ margin: '4px 0 0', color: 'rgba(232,230,224,.22)', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(alert.created_at)}
        </p>
      </div>
    </div>
  )
}

export default function AlertFeed({ alerts }: AlertFeedProps) {
  const criticals = alerts.filter(a => (a.level ?? a.severity ?? 1) === 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', overflow: 'hidden' }}>
      {criticals.length > 0 && (
        <div style={{
          background: 'rgba(220,80,60,.07)',
          border: '0.5px solid rgba(220,80,60,.28)',
          borderRadius: 10,
          padding: '9px 13px',
          display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc503c', boxShadow: '0 0 8px rgba(220,80,60,.55)', flexShrink: 0 }} />
          <p style={{ margin: 0, color: 'rgba(220,80,60,.9)', fontWeight: 500, fontSize: 12, letterSpacing: .3 }}>
            {criticals.length} alerte{criticals.length > 1 ? 's' : ''} critique{criticals.length > 1 ? 's' : ''} — intervenir
          </p>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alerts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(34,197,94,.07)', border: '0.5px solid rgba(34,197,94,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(34,197,94,.55)' }} />
            </div>
            <span style={{ color: 'rgba(232,230,224,.25)', fontSize: 12 }}>Aucune alerte aujourd'hui</span>
          </div>
        ) : (
          alerts.map((a, i) => <AlertCard key={a.id ?? i} alert={a} isNew={i === 0} />)
        )}
      </div>

      <style>{`
        @keyframes alertIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
