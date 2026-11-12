import { useState } from 'react'
import type { Dispatch } from 'react'
import type { TFunction } from '../i18n'
import type { Action, AppState, Lang } from '../state'
import { formatINR, parseRupees, toPaise, toRupees } from '../engine/money'
import { TAX_CONFIG } from '../engine/tax'
import { incomeSummary, taxSummary } from '../summary'
import { Field, Section } from '../ui'

const languages: Array<{ id: Lang; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'kn', label: 'ಕನ್ನಡ' },
  { id: 'hi', label: 'हिंदी' },
]

export function MeScreen({
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
  const [settings, setSettings] = useState({
    livingPerDay: toRupees(state.livingPerDay).toFixed(2),
    workDays: String(state.workDaysPerMonth),
    dailyTarget: state.dailyTarget === null ? '' : toRupees(state.dailyTarget).toFixed(2),
    emergencyGoal: toRupees(state.emergency.goal).toFixed(2),
    emergencySaved: toRupees(state.emergency.saved).toFixed(2),
    emergencyMonthly: toRupees(state.emergency.monthly).toFixed(2),
  })
  const [rates, setRates] = useState({
    mileage: String(state.rates.mileage),
    fuelPrice: toRupees(state.rates.fuelPricePerLitre).toFixed(2),
    wearPerKm: toRupees(state.rates.wearPerKm).toFixed(2),
    platformFee: (state.rates.platformFeeBps / 100).toFixed(2),
    tds: toRupees(state.tdsDeducted).toFixed(2),
    digitalReceiptsOk: state.digitalReceiptsOk,
  })

  const saveSettings = () => {
    const living = parseRupees(settings.livingPerDay) ?? 0
    const workDays = Math.round(Number(settings.workDays) || state.workDaysPerMonth)
    const target = parseRupees(settings.dailyTarget)
    const goal = parseRupees(settings.emergencyGoal) ?? 0
    const saved = parseRupees(settings.emergencySaved) ?? 0
    const monthly = parseRupees(settings.emergencyMonthly) ?? 0
    dispatch({
      type: 'update',
      patch: {
        livingPerDay: toPaise(living),
        workDaysPerMonth: Math.max(1, workDays),
        dailyTarget: target === null ? null : toPaise(target),
        emergency: { goal: toPaise(goal), saved: toPaise(saved), monthly: toPaise(monthly) },
      },
    })
  }

  const saveRates = () => {
    const mileage = Math.max(0, Number(rates.mileage) || 0)
    const fuel = parseRupees(rates.fuelPrice) ?? 0
    const wear = parseRupees(rates.wearPerKm) ?? 0
    const platformFee = Math.max(0, Number(rates.platformFee) || 0)
    const tds = parseRupees(rates.tds) ?? 0
    dispatch({
      type: 'update',
      patch: {
        rates: {
          mileage,
          fuelPricePerLitre: toPaise(fuel),
          wearPerKm: toPaise(wear),
          platformFeeBps: Math.round(platformFee * 100),
        },
        tdsDeducted: toPaise(tds),
        digitalReceiptsOk: rates.digitalReceiptsOk,
      },
    })
  }

  const tax = taxSummary(state, today)
  const income = incomeSummary(state, today)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `gigwallet-${today}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="screen-stack">
      <Section title={t('me.language')}>
        <div className="segmented" role="group" aria-label={t('me.language')}>
          {languages.map((language) => (
            <button
              key={language.id}
              type="button"
              className={state.lang === language.id ? 'active' : ''}
              onClick={() => dispatch({ type: 'update', patch: { lang: language.id } })}
            >
              {language.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('me.theme')}>
        <div className="segmented" role="group" aria-label={t('me.theme')}>
          <button
            type="button"
            className={state.theme === 'night' ? 'active' : ''}
            onClick={() => dispatch({ type: 'update', patch: { theme: 'night' } })}
          >
            {t('me.night')}
          </button>
          <button
            type="button"
            className={state.theme === 'day' ? 'active' : ''}
            onClick={() => dispatch({ type: 'update', patch: { theme: 'day' } })}
          >
            {t('me.sunlight')}
          </button>
        </div>
      </Section>

      <Section title={t('me.settings')}>
        <div className="form-grid compact-grid">
          <Field label={t('me.livingPerDay')}>
            <input
              className="input"
              inputMode="decimal"
              value={settings.livingPerDay}
              onChange={(event) => setSettings({ ...settings, livingPerDay: event.target.value })}
            />
          </Field>
          <Field label={t('me.workDays')}>
            <input
              className="input"
              inputMode="numeric"
              value={settings.workDays}
              onChange={(event) => setSettings({ ...settings, workDays: event.target.value })}
            />
          </Field>
          <Field label={t('me.dailyTarget')}>
            <input
              className="input"
              inputMode="decimal"
              value={settings.dailyTarget}
              onChange={(event) => setSettings({ ...settings, dailyTarget: event.target.value })}
            />
          </Field>
          <Field label={t('me.emergencyGoal')}>
            <input
              className="input"
              inputMode="decimal"
              value={settings.emergencyGoal}
              onChange={(event) => setSettings({ ...settings, emergencyGoal: event.target.value })}
            />
          </Field>
          <Field label={t('me.emergencySaved')}>
            <input
              className="input"
              inputMode="decimal"
              value={settings.emergencySaved}
              onChange={(event) => setSettings({ ...settings, emergencySaved: event.target.value })}
            />
          </Field>
          <Field label={t('me.emergencyMonthly')}>
            <input
              className="input"
              inputMode="decimal"
              value={settings.emergencyMonthly}
              onChange={(event) =>
                setSettings({ ...settings, emergencyMonthly: event.target.value })
              }
            />
          </Field>
        </div>
        <div className="inline-form">
          <button type="button" className="button primary" onClick={saveSettings}>
            {t('me.saveSettings')}
          </button>
        </div>
      </Section>

      <Section title={t('me.rates')}>
        <div className="form-grid compact-grid">
          <Field label={t('me.mileage')}>
            <input
              className="input"
              inputMode="decimal"
              value={rates.mileage}
              onChange={(event) => setRates({ ...rates, mileage: event.target.value })}
            />
          </Field>
          <Field label={t('me.fuelPrice')}>
            <input
              className="input"
              inputMode="decimal"
              value={rates.fuelPrice}
              onChange={(event) => setRates({ ...rates, fuelPrice: event.target.value })}
            />
          </Field>
          <Field label={t('me.wearPerKm')}>
            <input
              className="input"
              inputMode="decimal"
              value={rates.wearPerKm}
              onChange={(event) => setRates({ ...rates, wearPerKm: event.target.value })}
            />
          </Field>
          <Field label={t('me.platformFee')}>
            <input
              className="input"
              inputMode="decimal"
              value={rates.platformFee}
              onChange={(event) => setRates({ ...rates, platformFee: event.target.value })}
            />
          </Field>
          <Field label={t('me.tds')}>
            <input
              className="input"
              inputMode="decimal"
              value={rates.tds}
              onChange={(event) => setRates({ ...rates, tds: event.target.value })}
            />
          </Field>
        </div>
        <label className="check-line">
          <input
            type="checkbox"
            checked={rates.digitalReceiptsOk}
            onChange={(event) => setRates({ ...rates, digitalReceiptsOk: event.target.checked })}
          />
          <span>{t('me.digitalReceipts')}</span>
        </label>
        <div className="inline-form">
          <button type="button" className="button primary" onClick={saveRates}>
            {t('common.save')}
          </button>
        </div>
      </Section>

      <Section title={t('me.taxTitle')} className="tax-card">
        {!tax.enoughData ? (
          <p className="panel-hint">{t('me.taxNotEnough')}</p>
        ) : (
          <>
            <dl className="breakdown tax-breakdown">
              <div>
                <dt>{t('me.taxActual')}</dt>
                <dd>{formatINR(tax.actual?.totalPaise ?? 0)}</dd>
              </div>
              {tax.presumptive?.eligible && (
                <div>
                  <dt>{t('me.taxPresumptive')}</dt>
                  <dd>{formatINR(tax.presumptive.totalPaise)}</dd>
                </div>
              )}
              <div className="breakdown-total">
                <dt>{t('me.taxPayable')}</dt>
                <dd>{formatINR(tax.payable)}</dd>
              </div>
              <div>
                <dt>{t('me.taxStill')}</dt>
                <dd>{formatINR(tax.stillToSet)}</dd>
              </div>
              <div>
                <dt>{t('me.taxRefund')}</dt>
                <dd>{formatINR(tax.refund)}</dd>
              </div>
            </dl>
            <p className="panel-hint">
              {t('me.taxMethodUsed', {
                method:
                  tax.method === 'presumptive'
                    ? t('me.taxMethodPresumptive')
                    : t('me.taxMethodActual'),
              })}
            </p>
            <p className="panel-hint">
              {t('me.taxBasis', {
                days: tax.workedDays,
                workDays: state.workDaysPerMonth * 12,
              })}
            </p>
            <p className="panel-hint">{t('me.taxCa')}</p>
          </>
        )}
        <p className="warning">{t('me.taxUnverified')}</p>
        <p className="panel-hint">{t('me.taxVersion', { version: TAX_CONFIG.ruleVersion })}</p>
        <p className="disclaimer">{t('me.taxDisclaimer')}</p>
      </Section>

      <Section title={t('me.incomeTitle')} className="print-area" id="income-summary">
        <p className="panel-hint">{t('me.incomeRange')}</p>
        <dl className="breakdown">
          <div>
            <dt>{t('me.incomeTrips')}</dt>
            <dd>{income.trips}</dd>
          </div>
          <div>
            <dt>{t('me.incomeGross')}</dt>
            <dd>{formatINR(income.gross)}</dd>
          </div>
          <div>
            <dt>{t('me.incomeNet')}</dt>
            <dd>{formatINR(income.net)}</dd>
          </div>
          <div>
            <dt>{t('me.incomeCredits')}</dt>
            <dd>
              {t('me.incomeCreditsCount', { count: income.bankCreditCount })} · {formatINR(income.bankCreditTotal)}
            </dd>
          </div>
        </dl>
        <div className="inline-form">
          <button type="button" className="button" onClick={() => window.print()}>
            {t('me.print')}
          </button>
        </div>
      </Section>

      <Section title={t('me.export')}>
        <div className="inline-form">
          <button type="button" className="button" onClick={exportData}>
            {t('me.export')}
          </button>
          <button
            type="button"
            className="button danger"
            onClick={() => {
              if (window.confirm(t('me.resetConfirm'))) dispatch({ type: 'reset' })
            }}
          >
            {t('me.reset')}
          </button>
        </div>
        <p className="panel-hint">{t('me.storage')}</p>
      </Section>

      <footer className="app-footer">
        <span>{t('me.footer')}</span>
        <span className="muted">
          {t('me.version')} · {t('me.sample')}
        </span>
      </footer>
    </div>
  )
}