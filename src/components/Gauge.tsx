import React from 'react'

export function Gauge({ value, target, label, sub }: { value: number; target: number; label: string; sub: string }) {
  const pct = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0
  const r = 80
  const cx = 100, cy = 100
  const start = 150
  const sweep = 240
  const toRad = (d: number) => (d * Math.PI) / 180
  const arc = (a1: number, a2: number) => {
    const p1 = { x: cx + r * Math.cos(toRad(a1)), y: cy + r * Math.sin(toRad(a1)) }
    const p2 = { x: cx + r * Math.cos(toRad(a2)), y: cy + r * Math.sin(toRad(a2)) }
    const large = a2 - a1 > 180 ? 1 : 0
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`
  }
  const bg = arc(start, start + sweep)
  const fg = arc(start, start + sweep * pct)
  const ticks = Array.from({ length: 25 }, (_, i) => start + (sweep * i) / 24)
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 200" width="240" height="240" role="img" aria-label={label}>
        <defs>
          <linearGradient id="ggrad" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--ion)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        {ticks.map((a, i) => {
          const inner = r - 8
          const outer = r - 2
          const x1 = cx + inner * Math.cos(toRad(a))
          const y1 = cy + inner * Math.sin(toRad(a))
          const x2 = cx + outer * Math.cos(toRad(a))
          const y2 = cy + outer * Math.sin(toRad(a))
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth={i % 6 === 0 ? 2 : 1} opacity={0.5} />
        })}
        <path d={bg} fill="none" stroke="var(--raised)" strokeWidth="12" strokeLinecap="round" />
        <path d={fg} fill="none" stroke="url(#ggrad)" strokeWidth="12" strokeLinecap="round" className="gauge-progress" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="gauge-value">{label}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" className="gauge-sub">{sub}</text>
      </svg>
    </div>
  )
}
