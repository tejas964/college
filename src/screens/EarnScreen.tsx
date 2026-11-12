import type { TFunction } from '../i18n'
import type { AppState } from '../state'
import { formatHours } from '../format'
import { formatINR } from '../engine/money'
import { ratePerHour, tripBreakdown } from '../engine/trips'
import { weekSummary } from '../summary'
import { Empty, Section, StatTile } from '../ui'

export function EarnScreen({
  state,
  today,
  t,
}: {
  state: AppState
  today: string
  t: TFunction
}) {
  const week = weekSummary(state, today)
  const trips = state.trips
    .filter((trip) => trip.day === today)
    .map((trip) => ({ trip, breakdown: tripBreakdown(trip, state.rates) }))

  return (
    <div className="screen-stack">
      <Section title={t('earn.weekTitle')}>
        <div className="tile-grid">
          <StatTile label={t('earn.weekNet')} value={formatINR(week.net)} tone="gold" />
          <StatTile label={t('earn.hours')} value={formatHours(week.minutes)} />
          <StatTile label={t('earn.perHour')} value={formatINR(week.perHour)} tone="mint" />
        </div>
      </Section>

      <Section title={t('earn.breakdown')}>
        <dl className="breakdown">
          <div>
            <dt>{t('earn.gross')}</dt>
            <dd>{formatINR(week.gross)}</dd>
          </div>
          <div>
            <dt>{t('earn.fuel')}</dt>
            <dd className="negative">−{formatINR(week.fuel)}</dd>
          </div>
          <div>
            <dt>{t('earn.wear')}</dt>
            <dd className="negative">−{formatINR(week.wear)}</dd>
          </div>
          <div>
            <dt>{t('earn.platformFees')}</dt>
            <dd className="negative">−{formatINR(week.platformFee)}</dd>
          </div>
          <div className="breakdown-total">
            <dt>{t('earn.net')}</dt>
            <dd>{formatINR(week.net)}</dd>
          </div>
        </dl>
      </Section>

      <Section title={t('earn.todayTrips')}>
        {trips.length === 0 ? (
          <Empty>{t('earn.noTrips')}</Empty>
        ) : (
          <ul className="trip-list">
            {trips.map(({ trip, breakdown }, index) => (
              <li key={trip.id} className="trip-row">
                <div>
                  <strong>{t('earn.tripLine', { index: index + 1 })}</strong>
                  <span className="trip-meta">
                    {t('earn.tripMeta', {
                      platform: trip.platform ?? t('money.platformDefault'),
                      km: trip.km,
                      minutes: trip.minutes,
                    })}
                  </span>
                </div>
                <div className="trip-money">
                  <strong>{formatINR(breakdown.net)}</strong>
                  <span>{formatINR(ratePerHour(breakdown.net, trip.minutes))}/h</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}