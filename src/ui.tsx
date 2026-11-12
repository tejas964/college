import type { ReactNode } from 'react'

export function Section({
  title,
  children,
  className = '',
  action,
  id,
}: {
  title?: string
  children: ReactNode
  className?: string
  action?: ReactNode
  id?: string
}) {
  return (
    <section className={`panel ${className}`.trim()} id={id}>
      {(title || action) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'plain',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'plain' | 'gold' | 'ion' | 'mint' | 'coral'
}) {
  return (
    <div className={`tile tile-${tone}`}>
      <span className="tile-label">{label}</span>
      <strong className="tile-value">{value}</strong>
      {hint && <span className="tile-hint">{hint}</span>}
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function ProgressBar({
  value,
  max,
  tone = 'mint',
}: {
  value: number
  max: number
  tone?: 'mint' | 'gold' | 'ion' | 'coral'
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span className={`progress-fill progress-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Pill({
  children,
  tone = 'muted',
}: {
  children: ReactNode
  tone?: 'muted' | 'mint' | 'coral' | 'gold' | 'ion'
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}