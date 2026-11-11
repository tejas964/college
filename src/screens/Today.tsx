import React from 'react'
import { useApp } from '../App'
import { todaySummary } from '../engine/summary'
import { formatINR } from '../engine/money'
import { dailyNeed, openAmount, daysBetween } from '../engine/bills'
import { Gauge } from '../components/Gauge'

export function TodayScreen() {
  const { state, t, today } = useApp()
  const s = todaySummary(state, today)

  let insight = t('today.insightRate', { rate: formatINR(s.perHour) })
  if (s.trips.length === 0) insight = t('today.insightNoTrips')
  else if (s.runwayDays < 15) insight = t('today.insightLowRunway')

  const limitHint = s.freeCashInfo.limitedBy === 'bills'
    ? t('today.limitedBills')
    : s.freeCashInfo.limitedBy === 'emergency'
      ? t('today.limitedEmergency')
      : t('today.limitedNone')

  return (
    <section className="screen" data-testid="screen-today">
      <Gauge value={s.net} target={s.target} label={formatINR(s.net)} sub={t('today.ofTarget')} />
      <div className="tiles four">
        <div className="tile"><div className="tile-label">{t('today.earned')}</div><div className="num gold">{formatINR(s.gross)}</div></div>
        <div className="tile"><div className="tile-label">{t('today.toGo')}</div><div className="num">{formatINR(s.toGo)}</div></div>
        <div className="tile"><div className="tile-label">{t('today.perHour')}</div><div className="num ion">{formatINR(s.perHour)}</div></div>
        <div className="tile"><div className="tile-label">{t('today.runway')}</div><div className="num">{s.runwayDays} {t('today.days')}</div></div>
      </div>
      <p className="muted small">{t('today.runwayHint')}</p>
      <div className="card">
        <h3>{t('today.bills')}</h3>
        <div className="tanks">
          {state.bills.map((b) => {
            const open = openAmount(b)
            const pct = b.amount > 0 ? Math.min(1, b.saved / b.amount) : 1
            const daysLeft = daysBetween(today, b.dueDate)
            const need = dailyNeed(b, today, state.workDaysPerMonth)
            let status = `${daysLeft} ${t('today.daysLeft')} · ${formatINR(need)} ${t('today.dailyNeed')}`
            if (open === 0) status = t('today.paid')
            else if (daysLeft < 0) status = t('today.overdue')
            return (
              <div key={b.id} className="tank" data-paid={open === 0 ? 'true' : 'false'}>
                <div className="tank-head">
                  <span>{b.name}</span>
                  <span className="num">{formatINR(b.saved)} / {formatINR(b.amount)}</span>
                </div>
                <div className="tank-bar"><div className="tank-fill" style={{ width: `${pct * 100}%` }} /></div>
                <div className="tank-status small muted">{status}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="card">
        <h3>{t('today.freeCash')}</h3>
        <div className="num gold big">{formatINR(s.freeCash)}</div>
        <p className="muted small">{t('today.freeCashHint')}</p>
        <p className="muted small">{limitHint}</p>
      </div>
      <div className="insight card">{insight}</div>
    </section>
  )
}
