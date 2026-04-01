'use client'

interface ScoreRingProps {
  score: number
  size?: number
}

function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e'
  if (score >= 45) return '#eab308'
  if (score >= 20) return '#f97316'
  return '#ef4444'
}

function scoreLabel(score: number): string {
  if (score >= 75) return 'Contrôlé'
  if (score >= 45) return 'Vigilance'
  if (score >= 20) return 'Risque élevé'
  return 'STOP'
}

export default function ScoreRing({ score, size = 160 }: ScoreRingProps) {
  const radius = 54
  const cx = size / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100)
  const color = scoreColor(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="#1e1e35"
          strokeWidth={10}
        />
        {/* Progress */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
        {/* Center text — counter-rotate to cancel the parent -90deg */}
        <text
          x={cx}
          y={cx - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={28}
          fontWeight={700}
          fontFamily="monospace"
          transform={`rotate(90, ${cx}, ${cx})`}
        >
          {score}
        </text>
        <text
          x={cx}
          y={cx + 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#64748b"
          fontSize={11}
          fontFamily="sans-serif"
          transform={`rotate(90, ${cx}, ${cx})`}
        >
          / 100
        </text>
      </svg>
      <span style={{ color, fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {scoreLabel(score)}
      </span>
    </div>
  )
}
