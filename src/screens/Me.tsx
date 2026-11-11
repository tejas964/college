import React, { useMemo, useState } from 'react'
import { useApp } from '../App'
import { taxSummary } from '../engine/summary'
import { formatINR, parseRupees } from '../engine/money'
import { dayNumber } from '../engine/bills'
import { tripBreakdown } from '../engine/trips'
import { bankTotals } from '../engine/ledger'

export function MeScreen() {
  const { state, dispatch, t, today } = useApp()
  const [dailyTargetStr, setDailyTargetStr] = useState(state.dailyTarget !== null ? String(state.dailyTarget / 100) : '')

  const tax = taxSummary(state, today)
  const income = useMemo(() => {
    const fromN = dayNumber(today) - 89
    const toN = dayNumber(today)
    let trips = 0, gross = 0, net = 0
    for (const tr of state.trips) {
      const dn = dayNumber(tr.day)
      if (dn < fromN || dn > toN) continue
      trips++
      const b = tripBreakdown(tr, state.rates)
      gross += b.gross
      net += b.net
    }
    const bt = bankTotals(state.entries, (() => {
      const d = new Date(toN * 86400000 - 89 * 86400000)
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    })(), today)
    const creditsCount = state.entries.filter((e) => {
      if (e.status !== 'posted' || e.kind !== 'credit') return false
      const dn = dayNumber(e.day)
      return dn >= fromN && dn <= toN
    }).length
    return { trips, gross, net, credits: bt.credits, creditsCount }
  }, [state, today])

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gigwallet-v2-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  function doReset() {
    if (window.confirm(t('me.resetConfirm'))) dispatch({ type: 'reset', today })
  }
  function setNum(patchKey: string, val: string, scale = 100) {
    const p = parseRupees(val)
    if (p === null && val.trim() === '') return
    dispatch({ type: 'update', patch: { [patchKey]: p ?? 0 } as any })
  }

  return (
    <section className="screen" data-testid="screen-me">
      <div className="card">
        <h3>{t('me.language')}</h3>
        <div className="segmented">
          {(['en', 'kn', 'hi'] as const).map((l) => (
            <button key={l} className={state.lang === l ? 'seg active' : 'seg'} onClick={() => dispatch({ type: 'update', patch: { lang: l } })}>
              {l === 'en' ? 'English' : l === 'kn' ? 'ಕನ್ನಡ' : 'हिंदी'}
            </button>
          ))}
        </div>
        <h3 className="mt">{t('me.theme')}</h3>
        <div className="segmented">
          <button className={state.theme === 'night' ? 'seg active' : 'seg'} onClick={() => dispatch({ type: 'update', patch: { theme: 'night' } })}>{t('me.night')}</button>
          <button className={state.theme === 'day' ? 'seg active' : 'seg'} onClick={() => dispatch({ type: 'update', patch: { theme: 'day' } })}>{t('me.sunlight')}</button>
        </div>
      </div>

      <div className="card">
        <h3>{t('me.settings')}</h3>
        <div className="grid2">
          <label>{t('me.livingPerDay')}<input defaultValue={(state.livingPerDay / 100).toString()} onBlur={(e) => setNum('livingPerDay', e.target.value)} /></label>
          <label>{t('me.workDays')}<input type="number" defaultValue={state.workDaysPerMonth} onBlur={(e) => dispatch({ type: 'update', patch: { workDaysPerMonth: parseInt(e.target.value, 10) || 26 } })} /></label>
          <label>{t('me.dailyTarget')}<input value={dailyTargetStr} onChange={(e) => setDailyTargetStr(e.target.value)} onBlur={(e) => {
            const v = e.target.value.trim()
            dispatch({ type: 'update', patch: { dailyTarget: v === '' ? null : (parseRupees(v) ?? null) } })
          }} /></label>
          <label>{t('me.emergencyGoal')}<input defaultValue={(state.emergency.goal / 100).toString()} onBlur={(e) => dispatch({ type: 'update', patch: { emergency: { ...state.emergency, goal: parseRupees(e.target.value) ?? 0 } } })} /></label>
          <label>{t('me.emergencySaved')}<input defaultValue={(state.emergency.saved / 100).toString()} onBlur={(e) => dispatch({ type: 'update', patch: { emergency: { ...state.emergency, saved: parseRupees(e.target.value) ?? 0 } } })} /></label>
          <label>{t('me.emergencyMonthly')}<input defaultValue={(state.emergency.monthly / 100).toString()} onBlur={(e) => dispatch({ type: 'update', patch: { emergency: { ...state.emergency, monthly: parseRupees(e.target.value) ?? 0 } } })} /></label>
        </div>
      </div>

      <div className="card">
        <h3>{t('me.rates')}</h3>
        <div className="grid2">
          <label>{t('me.mileage')}<input type="number" step="0.1" defaultValue={state.rates.mileage} onBlur={(e) => dispatch({ type: 'update', patch: { rates: { ...state.rates, mileage: parseFloat(e.target.value) || 1 } } })} /></label>
          <label>{t('me.fuelPrice')}<input defaultValue={(state.rates.fuelPricePerLitre / 100).toString()} onBlur={(e) => dispatch({ type: 'update', patch: { rates: { ...state.rates, fuelPricePerLitre: parseRupees(e.target.value) ?? 0 } } })} /></label>
          <label>{t('me.wearPerKm')}<input defaultValue={(state.rates.wearPerKm / 100).toString()} onBlur={(e) => dispatch({ type: 'update', patch: { rates: { ...state.rates, wearPerKm: parseRupees(e.target.value) ?? 0 } } })} /></label>
          <label>{t('me.platformFee')}<input type="number" defaultValue={state.rates.platformFeeBps / 100} onBlur={(e) => dispatch({ type: 'update', patch: { rates: { ...state.rates, platformFeeBps: Math.round((parseFloat(e.target.value) || 0) * 100) } } })} /></label>
          <label>{t('me.tdsDeducted')}<input defaultValue={(state.tdsDeducted / 100).toString()} onBlur={(e) => dispatch({ type: 'update', patch: { tdsDeducted: parseRupees(e.target.value) ?? 0 } })} /></label>
        </div>
        <label className="check mt"><input type="checkbox" checked={state.digitalReceiptsOk} onChange={(e) => dispatch({ type: 'update', patch: { digitalReceiptsOk: e.target.checked } })} /> {t('me.digitalReceipts')}</label>
      </div>

      <div className="card" data-testid="tax-card">
        <h3>{t('me.tax')}</h3>
        {!tax.enoughData ? (
          <p className="muted">{t('me.notEnoughTax')}</p>
        ) : (
          <div className="stack">
            <div className="kv"><span>{t('me.taxMethod')}</span><span className="num">{tax.method === 'presumptive' ? t('me.taxPresumptive') : t('me.taxActual')}</span></div>
            <div className="kv"><span>{t('me.stillToSet')}</span><span className="num coral">{formatINR(tax.stillToSet)}</span></div>
            <div className="kv"><span>{t('me.refund')}</span><span className="num mint">{formatINR(tax.refund)}</span></div>
            <div className="kv"><span>{t('me.actualTotal')}</span><span className="num">{formatINR(tax.actual[tax.actual.recommended].totalPaise)}</span></div>
            <div className="kv"><span>{t('me.presumptiveTotal')}</span><span className="num">{tax.presumptive.eligible ? formatINR(tax.presumptive.totalPaise) : t('me.notEligible')}</span></div>
            <p className="muted small">{t('me.basisLine')}</p>
            <p className="muted small">{t('me.caCheck')}</p>
            <p className="warn small">{t('me.unverified')}</p>
            <div className="muted small">{t('me.ruleVersion')}: {tax.ruleVersion}</div>
            <div className="muted small">{t('me.disclaimer')}</div>
          </div>
        )}
      </div>

      <div className="card income-summary-print" data-testid="income-summary">
        <h3>{t('me.incomeSummary')}</h3>
        <div className="kv"><span>{t('me.trips')}</span><span className="num">{income.trips}</span></div>
        <div className="kv"><span>{t('me.gross')}</span><span className="num">{formatINR(income.gross)}</span></div>
        <div className="kv"><span>{t('me.netEstimate')}</span><span className="num gold">{formatINR(income.net)}</span></div>
        <div className="kv"><span>{t('me.bankCredits')}</span><span className="num">{income.creditsCount} · {formatINR(income.credits)}</span></div>
        <button className="btn mt" onClick={() => window.print()}>{t('me.print')}</button>
        <p className="muted small mt">{t('me.notCertificate')}</p>
      </div>

      <div className="card actions">
        <button className="btn" onClick={exportData} data-testid="export-btn">{t('me.export')}</button>
        <button className="btn danger" onClick={doReset}>{t('me.reset')}</button>
      </div>
    </section>
  )
}
