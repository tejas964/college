import type { TFunction } from '../i18n'
import type { AppState } from '../state'
import { billFill, daysBetween, dailyNeed, openAmount } from '../engine/bills'
import { formatINR } from '../engine/money'
import { todaySummary } from '../summary'
import { Gauge } from '../Gauge'
import { Empty, Pill, Section, StatTile } from '../ui'

function BillTank({
  state,
  bill,
  today,
  t,
}: {
  state: AppState
  bill: AppState['bills'][number]
  today: string
  t: TFunction
}) {
  const open = openAmount(bill)
  const paid = open <= 0
  const left = daysBetween(today, bill.dueDate)
  const overdue = left < 0 && !paid
  const fill = billFill(bill)
  const status = paid
    ? t('today.paid')
    : overdue
      ? t('today.overdue')
      : left === 0
        ? t('today.dueToday')
        : t('today.dueIn', { days: left })
  return (
    <div className={`bill-tank ${paid ? 'paid' : ''} ${overdue ? 'overdue' : ''}`}>
      <div className="bill-top">
        <strong>{bill.name}</strong>
        <Pill tone={paid ? 'mint' : overdue ? 'coral' : left <= 3 ? 'gold' : 'muted'}>{status}</Pill>
      </div>
      <div className="tank" aria-hidden="true">
        <span className="tank-fill" style={{ height: `${fill * 100}%` }} />
      </div>
      <div className="bill-meta">
        <span>{t('today.savedOf', { saved: formatINR(bill.saved), amount: formatINR(bill.amount) })}</span>
        {!paid && (
          <span className="daily-need">
            {t('today.dailyNeed', { amount: formatINR(dailyNeed(bill, today, state.workDaysPerMonth)) })}
          </span>
        )}
      </div>
    </div>
  )
}

export function TodayScreen({
  state,
  today,
  t,
}: {
  state: AppState
  today: string
  t: TFunction
}) {
  const summary = todaySummary(state, today)
  const runwayValue = summary.runwayDays >= 999 ? '∞' : String(summary.runwayDays)
  const runwayHint =
    summary.runwayDays >= 999
      ? t('today.runwayNoSpend')
      : t('today.runwayHint', {
          days: summary.runwayDays,
          perDay: formatINR(state.livingPerDay),
        })
  const freeCashHint =
    summary.freeCash.limitedBy === 'bills'
      ? t('today.freeCashBills')
      : summary.freeCash.limitedBy === 'emergency'
        ? t('today.freeCashEmergency')
        : t('today.freeCashHint')
  const insight =
    summary.rows.length === 0
      ? t('today.insightNoTrips')
      : summary.runwayDays < 15
        ? t('today.insightLowRunway')
        : t('today.insightRate', { rate: formatINR(summary.perHour) })

  return (
    <div className="screen-stack">
      <Section className="gauge-panel">
        <Gauge
          value={summary.net}
          target={summary.target}
          label={t('today.gaugeLabel')}
          centerLabel={t('today.targetLine', { amount: formatINR(summary.target) })}
        />
        <div className="tile-grid">
          <StatTile label={t('today.earned')} value={formatINR(summary.net)} tone="gold" />
          <StatTile label={t('today.toGo')} value={formatINR(summary.toGo)} tone="ion" />
          <StatTile label={t('today.perHour')} value={formatINR(summary.perHour)} tone="mint" />
          <StatTile label={t('today.runway')} value={runwayValue} hint={t('common.days')} tone="plain" />
        </div>
        <p className="runway-hint">{runwayHint}</p>
        <p className="meta-line">
          {t('today.tripsToday', { count: summary.rows.length })} ·{' '}
          {t('today.worked', { minutes: summary.minutes })} ·{' '}
          {t('today.appOn', { minutes: summary.appOnMinutes })}
        </p>
      </Section>

      <Section title={t('today.bills')}>
        {state.bills.length === 0 ? (
          <Empty>{t('today.noBills')}</Empty>
        ) : (
          <div className="bill-grid">
            {state.bills.map((bill) => (
              <BillTank key={bill.id} state={state} bill={bill} today={today} t={t} />
            ))}
          </div>
        )}
      </Section>

      <Section className="free-cash">
        <div className="free-cash-row">
          <span className="free-cash-label">{t('today.freeCash')}</span>
          <strong className="free-cash-value">{formatINR(summary.freeCash.amount)}</strong>
        </div>
        <p className="panel-hint">{freeCashHint}</p>
        <p className="insight">
          <span className="insight-mark" />
          {insight}
        </p>
      </Section>
    </div>
  )
}