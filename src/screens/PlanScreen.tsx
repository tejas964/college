import { useState } from 'react'
import type { Dispatch } from 'react'
import type { TFunction } from '../i18n'
import type { Action, AppState } from '../state'
import { formatKm, formatPercent } from '../format'
import { formatINR, parseRupees, toPaise } from '../engine/money'
import { emiLoad, emiLoadBand, loanSummary, monthlyIncomeFromWeek } from '../engine/loan'
import { leanPlan, weeklyNets } from '../engine/lean'
import { totalKmSince } from '../engine/trips'
import { weekSummary } from '../summary'
import { Field, Pill, Section } from '../ui'

const checklist = [
  { key: 'plan.checkInsurance', id: 'insurance' },
  { key: 'plan.checkHelmet', id: 'helmet' },
  { key: 'plan.checkHealth', id: 'health' },
  { key: 'plan.checkPMSBY', id: 'pmsby' },
  { key: 'plan.checkSchemes', id: 'schemes' },
]

export function PlanScreen({
  state,
  dispatch,
  today,
  t,
}: {
  state: AppState
  dispatch: Dispatch<Action>
  today: string
  t: TFunction
}) {
  const week = weekSummary(state, today)
  const weekly = weeklyNets(state.trips, state.rates, today, 12)
  const lean = leanPlan(
    weekly.map((bucket) => bucket.net),
    state.livingPerDay * 7,
    week.perHour,
  )

  const [principal, setPrincipal] = useState('100000')
  const [emi, setEmi] = useState('9167')
  const [months, setMonths] = useState('12')
  const [fees, setFees] = useState('0')
  const [otherEmis, setOtherEmis] = useState('0')

  const principalPaise = toPaise(parseRupees(principal) ?? 0)
  const emiPaise = toPaise(parseRupees(emi) ?? 0)
  const monthCount = Math.round(Number(months))
  const feesPaise = toPaise(parseRupees(fees) ?? 0)
  const otherPaise = toPaise(parseRupees(otherEmis) ?? 0)
  const loan = loanSummary(principalPaise, emiPaise, monthCount, feesPaise)
  const loanValid = Number.isFinite(loan.monthlyRate) && loan.monthlyRate >= 0
  const monthlyIncome = monthlyIncomeFromWeek(week.net)
  const load = emiLoad(emiPaise, otherPaise, monthlyIncome)
  const band = emiLoadBand(load)

  const [lastService, setLastService] = useState(state.lastServiceDay ?? '')
  const [interval, setIntervalKm] = useState(String(Math.round(state.serviceIntervalKm)))
  const intervalValue = Math.max(0, Number(interval) || 0)
  const sinceFrom =
    /^\d{4}-\d{2}-\d{2}$/.test(lastService) ? lastService : state.lastServiceDay
  const kmSince = totalKmSince(state.trips, sinceFrom)
  const due = intervalValue - kmSince
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  return (
    <div className="screen-stack">
      <Section title={t('plan.leanTitle')}>
        {!lean.enoughData ? (
          <p className="panel-hint">{t('plan.leanNeedData')}</p>
        ) : week.perHour <= 0 ? (
          <p className="panel-hint">{t('plan.leanNoPerHour')}</p>
        ) : (
          <>
            <dl className="breakdown">
              <div>
                <dt>{t('plan.leanLow', { amount: formatINR(lean.low) })}</dt>
                <dd>{t('plan.workedWeeks', { count: lean.weeks })}</dd>
              </div>
              <div>
                <dt>{t('plan.leanGap', { amount: formatINR(lean.gap) })}</dt>
                <dd>{t('earn.perHour')} {formatINR(week.perHour)}</dd>
              </div>
            </dl>
            <p className="lean-line">{t('plan.leanHours', {
              hours: lean.hours.toFixed(1),
              rate: formatINR(week.perHour),
            })}</p>
          </>
        )}
      </Section>

      <Section title={t('plan.loanTitle')}>
        <div className="form-grid compact-grid">
          <Field label={t('plan.principal')}>
            <input
              className="input"
              inputMode="decimal"
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
            />
          </Field>
          <Field label={t('plan.emi')}>
            <input
              className="input"
              inputMode="decimal"
              value={emi}
              onChange={(event) => setEmi(event.target.value)}
            />
          </Field>
          <Field label={t('plan.months')}>
            <input
              className="input"
              inputMode="numeric"
              value={months}
              onChange={(event) => setMonths(event.target.value)}
            />
          </Field>
          <Field label={t('plan.fees')}>
            <input
              className="input"
              inputMode="decimal"
              value={fees}
              onChange={(event) => setFees(event.target.value)}
            />
          </Field>
          <Field label={t('plan.otherEmis')}>
            <input
              className="input"
              inputMode="decimal"
              value={otherEmis}
              onChange={(event) => setOtherEmis(event.target.value)}
            />
          </Field>
        </div>
        {!loanValid ? (
          <p className="form-message bad">{t('plan.loanInvalid')}</p>
        ) : (
          <dl className="breakdown loan-breakdown">
            <div>
              <dt>{t('plan.effectiveRate')}</dt>
              <dd className="gold">{formatPercent(loan.annualEffective * 100, 1)}</dd>
            </div>
            <div>
              <dt>{t('plan.nominalRate')}</dt>
              <dd>{formatPercent(loan.nominalAnnual * 100, 1)}</dd>
            </div>
            <div>
              <dt>{t('plan.totalRepayable')}</dt>
              <dd>{formatINR(loan.totalRepayable)}</dd>
            </div>
            <div>
              <dt>{t('plan.interest')}</dt>
              <dd>{formatINR(loan.interestCost)}</dd>
            </div>
          </dl>
        )}
        <div className="emi-load">
          <div className="emi-load-head">
            <span>{t('plan.emiLoad')}</span>
            {monthlyIncome > 0 ? (
              <Pill tone={band === 'green' ? 'mint' : band === 'amber' ? 'gold' : 'coral'}>
                {t(band === 'green' ? 'plan.bandGreen' : band === 'amber' ? 'plan.bandAmber' : 'plan.bandRed')}
              </Pill>
            ) : (
              <Pill>{t('plan.noIncome')}</Pill>
            )}
          </div>
          <p className="panel-hint">{t('plan.emiLoadHint')}</p>
        </div>
        <p className="panel-hint">{t('plan.noRecommendation')}</p>
      </Section>

      <Section title={t('plan.serviceTitle')}>
        <div className="form-grid compact-grid">
          <Field label={t('plan.lastService')}>
            <input
              className="input"
              type="date"
              value={lastService}
              onChange={(event) => setLastService(event.target.value)}
            />
          </Field>
          <Field label={t('plan.interval')}>
            <input
              className="input"
              inputMode="numeric"
              value={interval}
              onChange={(event) => setIntervalKm(event.target.value)}
            />
          </Field>
        </div>
        <dl className="breakdown">
          <div>
            <dt>{t('plan.lastService')}</dt>
            <dd>{lastService || '—'}</dd>
          </div>
          <div>
            <dt>{t('plan.kmSince')}</dt>
            <dd>{formatKm(kmSince)} {t('common.km')}</dd>
          </div>
          <div>
            <dt>{due < 0 ? t('plan.overdue', { km: formatKm(Math.abs(due)) }) : t('plan.dueIn', { km: formatKm(due) })}</dt>
            <dd className={due < 0 ? 'negative' : 'positive'}>
              {formatKm(Math.abs(due))} {t('common.km')}
            </dd>
          </div>
        </dl>
        <div className="inline-form">
          <button
            type="button"
            className="button primary"
            onClick={() =>
              dispatch({
                type: 'update',
                patch: {
                  lastServiceDay: lastService || null,
                  serviceIntervalKm: Math.round(intervalValue),
                },
              })
            }
          >
            {t('common.save')}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              setLastService(today)
              dispatch({ type: 'update', patch: { lastServiceDay: today } })
            }}
          >
            {t('plan.setService')}
          </button>
        </div>
        <p className="panel-hint">{t('plan.serviceHint')}</p>
      </Section>

      <Section title={t('plan.checklistTitle')}>
        <p className="panel-hint">{t('plan.checklistIntro')}</p>
        <ul className="checklist">
          {checklist.map((item) => (
            <li key={item.id}>
              <label>
                <input
                  type="checkbox"
                  checked={checked[item.id] ?? false}
                  onChange={(event) =>
                    setChecked((current) => ({ ...current, [item.id]: event.target.checked }))
                  }
                />
                <span>{t(item.key)}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="panel-hint">{t('plan.official')}</p>
      </Section>
    </div>
  )
}