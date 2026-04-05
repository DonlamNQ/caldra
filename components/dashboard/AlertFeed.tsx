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

interface AlertFeedProps { alerts: AlertRow[] }

const LVL: Record<number, { label: string; color: string; border: string; dot: string }> = {
  1: { label: 'Info',     color: 'rgba(56,189,248,.85)',  border: 'rgba(56,189,248,.18)',  dot: '#38bdf8' },
  2: { label: 'Warning',  color: 'rgba(251,191,36,.9)',   border: 'rgba(251,191,36,.2)',   dot: '#fbbf24' },
  3: { label: 'Critique', color: 'rgba(244,63,94,.9)',    border: 'rgba(244,63,94,.25)',   dot: '#f43f5e' },
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
      borderBottom: '0.5px solid rgba(255,255,255,.05)',
      padding: '10px 0',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      animation: isNew ? 'alertIn .3s ease' : undefined,
    }}>
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, boxShadow: `0 0 5px ${cfg.dot}66` }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ color: cfg.color, fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>{cfg.label}</span>
          <span style={{ color: 'rgba(226,224,218,.2)', fontSize: 9, letterSpacing: .3, textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace" }}>{type}</span>
        </div>
        <p style={{ margin: 0, color: 'rgba(226,224,218,.75)', fontSize: 12.5, lineHeight: 1.5, fontWeight: 400 }}>{alert.message}</p>
        <p style={{ margin: '3px 0 0', color: 'rgba(226,224,218,.2)', fontSize: 10, fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace" }}>
          {formatTime(alert.created_at)}
        </p>
      </div>
    </div>
  )
}

export default function AlertFeed({ alerts }: AlertFeedProps) {
  const hasCritical = alerts.some(a => (a.level ?? a.severity ?? 1) === 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', paddingTop: '.5rem' }}>
      {hasCritical && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', marginBottom: 8,
          background: 'rgba(244,63,94,.07)', border: '0.5px solid rgba(244,63,94,.22)', borderRadius: 7,
          flexShrink: 0,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 6px rgba(244,63,94,.5)', flexShrink: 0 }} />
          <p style={{ margin: 0, color: 'rgba(244,63,94,.85)', fontSize: 11.5, fontWeight: 500 }}>
            Alerte{alerts.filter(a => (a.level ?? a.severity ?? 1) === 3).length > 1 ? 's' : ''} critique{alerts.filter(a => (a.level ?? a.severity ?? 1) === 3).length > 1 ? 's' : ''} — intervenir maintenant
          </p>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {alerts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '2.5rem 0' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,.07)', border: '0.5px solid rgba(16,185,129,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(16,185,129,.5)' }} />
            </div>
            <span style={{ color: 'rgba(226,224,218,.22)', fontSize: 12 }}>Aucune alerte — session saine</span>
          </div>
        ) : (
          alerts.map((a, i) => <AlertCard key={a.id ?? i} alert={a} isNew={i === 0} />)
        )}
      </div>
      <style>{`@keyframes alertIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  )
}
