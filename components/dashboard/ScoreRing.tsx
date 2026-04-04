'use client'

interface ScoreRingProps {
  score: number
  size?: number
}

function scoreColor(s: number) {
  if (s >= 75) return '#22c55e'
  if (s >= 45) return '#eab308'
  if (s >= 20) return '#f97316'
  return '#ef4444'
}

function scoreGlow(s: number) {
  if (s >= 75) return 'rgba(34,197,94,.45)'
  if (s >= 45) return 'rgba(234,179,8,.45)'
  if (s >= 20) return 'rgba(249,115,22,.45)'
  return 'rgba(239,68,68,.45)'
}

function scoreLabel(s: number) {
  if (s >= 75) return 'Contrôlé'
  if (s >= 45) return 'Vigilance'
  if (s >= 20) return 'Risque élevé'
  return 'STOP'
}

export default function ScoreRing({ score, size = 180 }: ScoreRingProps) {
  const cx = size / 2
  const r1 = size * 0.415   // outer ring
  const r2 = size * 0.305   // inner ring

  const c1 = 2 * Math.PI * r1
  const c2 = 2 * Math.PI * r2
  const pct = Math.max(0, Math.min(100, score)) / 100
  const o1 = c1 * (1 - pct)
  const o2 = c2 * (1 - pct)

  const color = scoreColor(score)
  const glow  = scoreGlow(score)
  const label = scoreLabel(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: size, height: size }}>

        {/* SVG rings */}
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
          {/* Outer track */}
          <circle cx={cx} cy={cx} r={r1} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={8} />
          {/* Outer progress */}
          <circle
            cx={cx} cy={cx} r={r1}
            fill="none" stroke={color} strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={c1} strokeDashoffset={o1}
            style={{
              transition: 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1), stroke .4s ease',
              filter: `drop-shadow(0 0 5px ${glow})`,
            }}
          />
          {/* Inner track */}
          <circle cx={cx} cy={cx} r={r2} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth={3.5} />
          {/* Inner progress (ghost) */}
          <circle
            cx={cx} cy={cx} r={r2}
            fill="none" stroke={color} strokeWidth={3.5}
            strokeLinecap="round" opacity={0.3}
            strokeDasharray={c2} strokeDashoffset={o2}
            style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>

        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2,
        }}>
          <span style={{
            fontSize: Math.round(size * 0.215),
            fontWeight: 200,
            color,
            lineHeight: 1,
            letterSpacing: -2,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 22px ${glow}`,
          }}>
            {score}
          </span>
          <span style={{ fontSize: Math.round(size * 0.063), color: 'rgba(232,230,224,.28)', letterSpacing: 1 }}>
            / 100
          </span>
        </div>
      </div>

      {/* Label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <span style={{
          color,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textShadow: `0 0 14px ${glow}`,
        }}>
          {label}
        </span>
        <div style={{ width: 20, height: 1.5, background: color, borderRadius: 2, opacity: 0.45 }} />
      </div>
    </div>
  )
}
