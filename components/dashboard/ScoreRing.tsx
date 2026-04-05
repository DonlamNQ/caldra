'use client'

interface ScoreRingProps { score: number; size?: number }

function scoreColor(s: number) {
  if (s >= 75) return '#10b981'
  if (s >= 45) return '#f59e0b'
  if (s >= 20) return '#f97316'
  return '#f43f5e'
}

function scoreLabel(s: number) {
  if (s >= 75) return 'Contrôlé'
  if (s >= 45) return 'Vigilance'
  if (s >= 20) return 'Risque élevé'
  return 'STOP'
}

export default function ScoreRing({ score, size = 162 }: ScoreRingProps) {
  const cx = size / 2
  const r = size * 0.39
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100)
  const color = scoreColor(score)
  const label = scoreLabel(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <filter id="ring-blur">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>
          {/* Track */}
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={9} />
          {/* Progress */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none" stroke={color} strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1), stroke .4s', filter: `drop-shadow(0 0 4px ${color}88)` }}
          />
        </svg>
        {/* Center */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <span style={{ fontSize: size * 0.205, fontWeight: 500, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono',monospace", letterSpacing: -2 }}>
            {score}
          </span>
          <span style={{ fontSize: size * 0.065, color: 'rgba(226,224,218,.25)', letterSpacing: 1, fontFamily: "'DM Sans',sans-serif" }}>/ 100</span>
        </div>
      </div>
      {/* Label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color, fontFamily: "'DM Sans',sans-serif" }}>
          {label}
        </span>
        <div style={{ width: 18, height: 2, background: color, borderRadius: 2, opacity: .4 }} />
      </div>
    </div>
  )
}
