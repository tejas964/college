import React, { useMemo, useState } from 'react'
import { useApp } from '../App'
import { weeklyNets, leanPlan } from '../engine/lean'
import { loanSummary, emiLoadBand } from '../engine/loan'
import { formatINR, parseRupees } from '../engine/money'
import { dayNumber } from '../engine/bills'
import { tripBreakdown } from '../engine/trips'

export function PlanScreen() {
  const { state, t, today } = useApp()

  const nets = weeklyNets(state.trips, state.rates, today, 12)
  const last90 = state.trips.filter((tr) => {
    const dn = dayNumber(tr.day)
    return dn >= dayNumber(today) - 89 && dn <= dayNumber(today)
  })
  const totalNet90 = last90.reduce((s, tr) => s + tripBreakdown(tr, state.rates).net, 0)
  const perHour90 = (() => {
    if (last90.length === 0) return 0
    const mins = last90.reduce((s, tr) => s + tr.minutes, 0)
    return mins > 0 ? (totalNet90 * 60) / mins : 0
  })()
  const fixedWeekly = state.bills.reduce((s, b) => s + b.amount, 0) / 4.3 + state.livingPerDay * 7 + state.emergency.monthly / 4.3
  const lp = leanPlan(nets, Math.round(fixedWeekly), Math.round(perHour90))

  const [principal, setPrincipal] = useState('100000')
  const [emi, setEmi] = useState('9167')
  const [months, setMonths] = useState('12')
  const [fees, setFees] = useState('0')
  const [otherEmis, setOtherEmis] = useState('0')

  const loan = useMemo(() => {
    const p = parseRupees(principal) ?? 0
    const e = parseRupees(emi) ?? 0
    const n = parseInt(months, 10) || 0
    const f = parseRupees(fees) ?? 0
    return loanSummary(p, e, n, f)
  }, [principal, emi, months, fees])

  const monthlyIncomeEst = perHour90 > 0 ? Math.round(perHour90 * 8 * state.workDaysPerMonth) : 0
  const emiPaise = parseRupees(emi) ?? 0
  const otherPaise = parseRupees(otherEmis) ?? 0
  const load = monthlyIncomeEst > 0 ? (emiPaise + otherPaise) / monthlyIncomeEst : 0
  const band = emiLoadBand(load)

  const kmSince = useMemo(() => {
    if (!state.lastServiceDay) return null
    const sinceN = dayNumber(state.lastServiceDay)
    return state.trips.filter((tr) => dayNumber(tr.day) >= sinceN).reduce((s, tr) => s + tr.km, 0)
  }, [state.trips, state.lastServiceDay])
  const dueInKm = kmSince !== null ? state.serviceIntervalKm - Math.round(kmSince) : null

  const checklist = ['plan.chkInsurance', 'plan.chkHealth', 'plan.chkPension', 'plan.chkWelfare']

  return (
    <section className="screen" data-testid="screen-plan">
      <div className="card">
        <h3>{t('plan.leanWeek')}</h3>
        {!lp.ok ? (
          <p className="muted">{t('plan.needWeeks')}</p>
        ) : (
          <div className="stack">
            <div className="kv"><span>{t('plan.lowWeek')}</span><span className="num">{formatINR(lp.low)}</span></div>
            <div className="kv"><span>{t('plan.fixedWeekly')}</span><span className="num">{formatINR(Math.round(fixedWeekly))}</span></div>
            <div className="kv"><span>{t('plan.gap')}</span><span className="num coral">{formatINR(lp.gap)}</span></div>
            <div className="kv"><span>{t('plan.extraHours')}</span><span className="num">{lp.hours.toFixed(1)}</span></div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t('plan.loanCost')}</h3>
        <div className="grid2">
          <label>{t('plan.principal')}<input value={principal} onChange={(e) => setPrincipal(e.target.value)} /></label>
          <label>{t('plan.emi')}<input value={emi} onChange={(e) => setEmi(e.target.value)} /></label>
          <label>{t('plan.months')}<input value={months} onChange={(e) => setMonths(e.target.value)} /></label>
          <label>{t('plan.fees')}<input value={fees} onChange={(e) => setFees(e.target.value)} /></label>
          <label>{t('plan.otherEmis')}<input value={otherEmis} onChange={(e) => setOtherEmis(e.target.value)} /></label>
        </div>
        <div className="stack mt">
          <div className="kv"><span>{t('plan.effectiveYearly')}</span><span className="num">{Number.isFinite(loan.annualEffective) ? (loan.annualEffective * 100).toFixed(2) + '%' : '—'}</span></div>
          <div className="kv"><span>{t('plan.nominalYearly')}</span><span className="num">{Number.isFinite(loan.nominalAnnual) ? (loan.nominalAnnual * 100).toFixed(2) + '%' : '—'}</span></div>
          <div className="kv"><span>{t('plan.totalRepayable')}</span><span className="num">{formatINR(loan.totalRepayable)}</span></div>
          <div className="kv"><span>{t('plan.interestCost')}</span><span className="num">{formatINR(loan.interestCost)}</span></div>
          <div className="kv"><span>{t('plan.emiLoad')}</span><span className={`num band band-${band}`}>{(load * 100).toFixed(1)}% ({band})</span></div>
        </div>
      </div>

      <div className="card">
        <h3>{t('plan.vehicleService')}</h3>
        <div className="kv"><span>{t('plan.lastService')}</span><span className="num">{state.lastServiceDay ?? t('plan.notSet')}</span></div>
        <div className="kv"><span>{t('plan.intervalKm')}</span><span className="num">{state.serviceIntervalKm} {t('plan.km')}</span></div>
        <div className="kv"><span>{t('plan.kmSince')}</span><span className="num">{kmSince !== null ? Math.round(kmSince) + ' ' + t('plan.km') : t('plan.notSet')}</span></div>
        {dueInKm !== null && (
          <div className="kv">
            <span>{dueInKm >= 0 ? t('plan.dueIn') : t('plan.overdueBy')}</span>
            <span className={`num ${dueInKm < 0 ? 'coral' : ''}`}>{Math.abs(dueInKm)} {t('plan.km')}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t('plan.insuranceSchemes')}</h3>
        <p className="muted small">{t('plan.checklistNote')}</p>
        <ul className="checklist">
          {checklist.map((k) => <li key={k}><label><input type="checkbox" /> {t(k)}</label></li>)}
        </ul>
      </div>
    </section>
  )
}
