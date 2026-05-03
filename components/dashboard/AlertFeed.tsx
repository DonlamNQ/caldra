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

const LVL: Record<number, { label: string; color: string; bg: string; border: string; dot: string }> = {
  1: {
    label: 'L1',
    color: 'rgba(245,166,35,.8)',
    bg: 'rgba(245,166,35,.04)',
    border: 'rgba(245,166,35,.15)',
    dot: '#f5a623',
  },
  2: {
    label: 'L2',
    color: 'rgba(220,130,0,.9)',
    bg: 'rgba(220,130,0,.06)',
    border: 'rgba(220,130,0,.20)',
    dot: '#dc8200',
  },
  3: {
    label: 'L3',
    color: 'rgba(220,50,24,.95)',
    bg: 'rgba(220,50,24,.08)',
    border: 'rgba(220,50,24,.25)',
    dot: '#dc3218',
  },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function AlertCard({ alert, isNew }: { alert: AlertRow; isNew?: boolean }) {
  const level = alert.level ?? alert.severity ?? 1
  const cfg = LVL[level] ?? LVL[1]
  const type = (alert.type ?? alert.pattern ?? '—').replace(/_/g, '_')
  const isCritical = level === 3

  return (
    <div style={{
      borderBottom: `1px solid #3d3000`,
      padding: '9px 0',
      display: 'flex', gap: 9, alignItems: 'flex-start',
      animation: isNew ? 'alertSlide .3s ease' : undefined,
    }}>
      <div style={{ flexShrink: 0, paddingTop: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 5, height: 5, background: cfg.dot }} className={isCritical ? 'dot-pulse' : undefined} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{
            color: cfg.color, fontSize: 8, fontWeight: 600, letterSpacing: '.18em',
            textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace",
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            padding: '1px 5px',
          }}>{cfg.label}</span>
          <span style={{ color: 'rgba(232,223,192,.25)', fontSize: 8.5, letterSpacing: '.05em', textTransform: 'uppercase', fontFamily: "'IBM Plex Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type}</span>
        </div>
        <p style={{ margin: 0, color: 'rgba(232,223,192,.72)', fontSize: 11.5, lineHeight: 1.55, fontWeight: 400, fontFamily: "'IBM Plex Mono', monospace" }}>{alert.message}</p>
        <p style={{ margin: '3px 0 0', color: 'rgba(232,223,192,.22)', fontSize: 9.5, fontVariantNumeric: 'tabular-nums', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.04em' }}>
          {formatTime(alert.created_at)}
        </p>
      </div>
    </div>
  )
}

export default function AlertFeed({ alerts }: AlertFeedProps) {
  const hasCritical = alerts.some(a => (a.level ?? a.severity ?? 1) === 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        @keyframes alertSlide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes dotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.8)}}
        .dot-pulse{animation:dotPulse 1.2s ease infinite}
      `}</style>

      {hasCritical && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 9px', marginBottom: 6,
          background: 'rgba(220,50,24,.08)', border: '1px solid rgba(220,50,24,.25)',
          flexShrink: 0,
        }}>
          <div className="dot-pulse" style={{ width: 4, height: 4, background: '#dc3218', flexShrink: 0 }} />
          <p style={{ margin: 0, color: 'rgba(220,50,24,.9)', fontSize: 10.5, fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.03em' }}>
            CRITIQUE — intervenir maintenant
          </p>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {alerts.length === 0 ? null : (
          alerts.map((a, i) => <AlertCard key={a.id ?? i} alert={a} isNew={i === 0} />)
        )}
      </div>
    </div>
  )
}
