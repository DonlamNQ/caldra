'use client'

interface ScoreRingProps { score: number; size?: number }

function scoreColor(s: number) {
  if (s >= 70) return '#f5a623'
  if (s >= 40) return '#dc8200'
  return '#dc3218'
}

function scoreLabel(s: number) {
  if (s >= 70) return 'Contrôlé'
  if (s >= 40) return 'Vigilance'
  return 'STOP'
}

export default function ScoreRing({ score, size = 148 }: ScoreRingProps) {
  const cx = size / 2
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100)
  const color = scoreColor(score)
  const label = scoreLabel(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
          {/* Track */}
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(245,166,35,.1)" strokeWidth={7} />
          {/* Tick marks */}
          {Array.from({ length: 20 }, (_, i) => {
            const angle = (i / 20) * 2 * Math.PI
            const cos = Math.cos(angle), sin = Math.sin(angle)
            const r1 = r + 5, r2 = r + 9
            return (
              <line key={i}
                x1={cx + cos * r1} y1={cx + sin * r1}
                x2={cx + cos * r2} y2={cx + sin * r2}
                stroke="rgba(245,166,35,.12)" strokeWidth={i % 5 === 0 ? 1.5 : 0.75}
              />
            )
          })}
          {/* Progress arc */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none" stroke={color} strokeWidth={7}
            strokeLinecap="butt"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke .4s', filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        {/* Center */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 600, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: -2 }}>
            {score}
          </span>
          <span style={{ fontSize: size * 0.07, color: 'rgba(232,223,192,.3)', letterSpacing: '.1em', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '.2em', textTransform: 'uppercase', color, fontFamily: "'IBM Plex Mono', monospace" }}>
          {label}
        </span>
        <div style={{ width: 24, height: 1, background: color, opacity: .5 }} />
      </div>
    </div>
  )
}
