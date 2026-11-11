import React from 'react'
import { useApp } from '../App'
import { weekSummary } from '../engine/summary'
import { formatINR } from '../engine/money'
import { tripBreakdown, ratePerHour } from '../engine/trips'

export function EarnScreen() {
  const { state, t, today } = useApp()
  const ws = weekSummary(state, today)
  const todays = state.trips.filter((tr) => tr.day === today)

  return (
    <section className="screen" data-testid="screen-earn">
      <div className="card">
        <h3>{t('earn.weeklyNet')}</h3>
        <div className="num gold big">{formatINR(ws.net)}</div>
        <div className="row gap">
          <span>{t('earn.hours')}: <span className="num">{(ws.minutes / 60).toFixed(1)}</span></span>
          <span>{t('today.perHour')}: <span className="num">{formatINR(ws.perHour)}</span></span>
        </div>
      </div>
      <div className="card">
        <h3>{t('earn.breakdown')}</h3>
        <div className="kv"><span>{t('earn.gross')}</span><span className="num">{formatINR(ws.gross)}</span></div>
        <div className="kv"><span>{t('earn.fuel')}</span><span className="num">−{formatINR(ws.fuel)}</span></div>
        <div className="kv"><span>{t('earn.wear')}</span><span className="num">−{formatINR(ws.wear)}</span></div>
        <div className="kv"><span>{t('earn.platformFees')}</span><span className="num">−{formatINR(ws.platformFee)}</span></div>
        <div className="kv total"><span>{t('earn.net')}</span><span className="num gold">{formatINR(ws.net)}</span></div>
      </div>
      <div className="card">
        <h3>{t('earn.todaysTrips')}</h3>
        {todays.length === 0 && <p className="muted">{t('earn.noTrips')}</p>}
        <div className="list">
          {todays.map((tr) => {
            const b = tripBreakdown(tr, state.rates)
            const rph = ratePerHour(b.net, tr.minutes)
            return (
              <div key={tr.id} className="list-row">
                <div>
                  <div className="strong">{tr.platform || 'Main'} · {tr.km} km · {tr.minutes}m</div>
                  <div className="muted small">{formatINR(b.gross)} gross</div>
                </div>
                <div className="right">
                  <div className="num gold">{formatINR(b.net)}</div>
                  <div className="muted small num">{formatINR(rph)} {t('today.perHour')}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
