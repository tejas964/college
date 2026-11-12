import { useId } from 'react'
import { formatINR } from './engine/money'

const CX = 110
const CY = 110
const R = 82
const START = 150
const SWEEP = 240

function polar(angle: number, radius: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

export function Gauge({
  value,
  target,
  label,
  centerLabel,
}: {
  value: number
  target: number
  label: string
  centerLabel: string
}) {
  const uid = useId().replace(/:/g, '')
  const ratio = target > 0 ? Math.min(1, Math.max(0, value / target)) : 0
  const start = polar(START, R)
  const end = polar(START + SWEEP, R)
  const arc = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${R} ${R} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
  const progressAngle = START + SWEEP * ratio
  const ticks = Array.from({ length: 41 }, (_, index) => {
    const angle = START + (SWEEP * index) / 40
    const outer = polar(angle, 100)
    const inner = polar(angle, index % 5 === 0 ? 91 : 95)
    return { angle, outer, inner, major: index % 5 === 0 }
  })
  return (
    <div className="gauge">
      <svg viewBox="0 0 220 220" role="img" aria-label={`${label} ${formatINR(value)}`}>
        <defs>
          <linearGradient id={`gauge-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5BE0FF" />
            <stop offset="55%" stopColor="#F5B83D" />
            <stop offset="100%" stopColor="#42E3A0" />
          </linearGradient>
        </defs>
        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            className={`gauge-tick ${tick.major ? 'major' : ''} ${tick.angle <= progressAngle ? 'lit' : ''}`}
          />
        ))}
        <path d={arc} className="gauge-track" pathLength={100} />
        <path
          d={arc}
          className="gauge-progress"
          pathLength={100}
          strokeDasharray={`${ratio * 100} 100`}
          stroke={`url(#gauge-${uid})`}
        />
        <text x={CX} y={CY - 8} className="gauge-value">
          {formatINR(value)}
        </text>
        <text x={CX} y={CY + 16} className="gauge-label">
          {centerLabel}
        </text>
        <text x={CX} y={CY + 38} className="gauge-sub">
          {label} {formatINR(target)}
        </text>
      </svg>
    </div>
  )
}