import React, { useMemo, useState } from 'react'
import { useApp } from '../App'
import { formatINR, parseRupees } from '../engine/money'
import { assessTrip, Trip } from '../engine/trips'
import { parseBankSms } from '../engine/ingest/sms'
import { isDuplicate, LedgerEntry } from '../engine/ledger'
import { incentiveStatus, IncentiveSlab } from '../engine/incentives'
import { reconcile, Payout } from '../engine/payouts'
import { genId } from '../state'
import { todayISO } from '../engine/bills'

export function MoneyScreen() {
  const { state, dispatch, t, today } = useApp()
  const [balStr, setBalStr] = useState((state.balance / 100).toString())
  const [setAside, setSetAside] = useState<Record<string, string>>({})
  const [smsText, setSmsText] = useState('')
  const [smsMsg, setSmsMsg] = useState('')

  // trip form
  const [tripPlatform, setTripPlatform] = useState('Main')
  const [tripFare, setTripFare] = useState('')
  const [tripKm, setTripKm] = useState('')
  const [tripMin, setTripMin] = useState('')
  const [tripTip, setTripTip] = useState('')

  // incentive form
  const [slabLabel, setSlabLabel] = useState('')
  const [slabPlatform, setSlabPlatform] = useState('Main')
  const [slabStart, setSlabStart] = useState(today)
  const [slabEnd, setSlabEnd] = useState(today)
  const [slabNeeded, setSlabNeeded] = useState('')
  const [slabBonus, setSlabBonus] = useState('')

  // payout form
  const [poPlatform, setPoPlatform] = useState('Main')
  const [poFrom, setPoFrom] = useState(today)
  const [poTo, setPoTo] = useState(today)
  const [poReceived, setPoReceived] = useState('')
  const [poBonus, setPoBonus] = useState<Record<string, string>>({})

  const fareP = parseRupees(tripFare) ?? 0
  const kmN = parseFloat(tripKm) || 0
  const minN = parseInt(tripMin, 10) || 0
  const tipP = parseRupees(tripTip) ?? 0
  const verdict = useMemo(() => assessTrip({ fare: fareP, km: kmN, minutes: minN }, state.trips, state.rates), [fareP, kmN, minN, state.trips, state.rates])
  const canLog = fareP > 0 && kmN > 0 && minN > 0

  function saveBalance() {
    const p = parseRupees(balStr)
    if (p !== null) dispatch({ type: 'update', patch: { balance: p } })
  }
  function doSetAside(billId: string) {
    const p = parseRupees(setAside[billId] || '')
    if (p && p > 0) {
      dispatch({ type: 'addSetAside', billId, amount: p })
      setSetAside((s) => ({ ...s, [billId]: '' }))
    }
  }
  function checkSms() {
    const parsed = parseBankSms(smsText)
    if (!parsed) { setSmsMsg(t('money.smsUnrecognised')); return }
    if (isDuplicate(state.entries, parsed.dedupeKey)) { setSmsMsg(t('money.smsDuplicate')); return }
    const entry: LedgerEntry = {
      id: genId('entry'),
      kind: parsed.kind,
      amount: parsed.amount,
      day: today,
      source: 'sms',
      dedupeKey: parsed.dedupeKey,
      status: parsed.needsReview ? 'review' : 'posted',
      note: parsed.note,
    }
    dispatch({ type: 'addEntry', entry })
    setSmsMsg(parsed.needsReview ? t('money.smsReview') : t('money.smsAdded'))
    setSmsText('')
  }

  function logTrip() {
    if (!canLog) return
    const trip: Trip = {
      id: genId('trip'),
      day: today,
      fare: fareP,
      tip: tipP,
      km: kmN,
      minutes: minN,
      platform: tripPlatform || 'Main',
    }
    dispatch({ type: 'addTrip', trip })
    setTripFare(''); setTripKm(''); setTripMin(''); setTripTip('')
  }

  function addSlab() {
    const needed = parseInt(slabNeeded, 10) || 0
    const bonus = parseRupees(slabBonus) ?? 0
    if (!slabLabel || needed <= 0 || bonus <= 0) return
    const slab: IncentiveSlab = {
      id: genId('slab'), platform: slabPlatform || 'Main', label: slabLabel,
      startDay: slabStart, endDay: slabEnd, tripsNeeded: needed, bonus,
    }
    dispatch({ type: 'upsertSlab', slab })
    setSlabLabel(''); setSlabNeeded(''); setSlabBonus('')
  }

  function addPayout() {
    const rec = parseRupees(poReceived) ?? 0
    const payout: Payout = { id: genId('payout'), platform: poPlatform || 'Main', from: poFrom, to: poTo, received: rec, status: 'open' }
    dispatch({ type: 'upsertPayout', payout })
    setPoReceived('')
  }

  function copyDispute(p: Payout, expected: number, gap: number) {
    const msg = t('disputeBody', {
      platform: p.platform,
      from: p.from,
      to: p.to,
      expected: formatINR(expected),
      received: formatINR(p.received),
      gap: formatINR(gap),
    })
    navigator.clipboard?.writeText(msg)
  }

  const toConfirm = state.entries.filter((e) => e.status === 'review')
  const lastBank = state.entries.filter((e) => e.source === 'sms' || e.status === 'posted').slice(-5).reverse()

  const verdictText = verdict.verdict === 'learning' ? t('money.verdictLearning')
    : verdict.verdict === 'worth' ? t('money.verdictWorth', { pct: verdict.pct })
    : verdict.verdict === 'marginal' ? t('money.verdictMarginal', { pct: verdict.pct })
    : t('money.verdictSkip', { pct: verdict.pct })

  return (
    <section className="screen" data-testid="screen-money">
      <div className="card">
        <h3>{t('money.balance')}</h3>
        <div className="row gap">
          <input value={balStr} onChange={(e) => setBalStr(e.target.value)} aria-label={t('money.balance')} />
          <button className="btn" onClick={saveBalance}>{t('money.save')}</button>
        </div>
      </div>

      <div className="card">
        <h3>{t('money.bills')}</h3>
        {state.bills.map((b) => (
          <div key={b.id} className="list-row">
            <div>
              <div className="strong">{b.name}</div>
              <div className="muted small num">{formatINR(b.saved)} / {formatINR(b.amount)}</div>
            </div>
            <div className="row gap">
              <input className="small-input" placeholder={t('money.setAside')} value={setAside[b.id] || ''} onChange={(e) => setSetAside((s) => ({ ...s, [b.id]: e.target.value }))} />
              <button className="btn small" onClick={() => doSetAside(b.id)}>{t('money.add')}</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" data-testid="sms-box">
        <h3>{t('money.bankSms')}</h3>
        <textarea value={smsText} onChange={(e) => setSmsText(e.target.value)} placeholder={t('money.pasteSms')} rows={3} />
        <div className="row gap mt">
          <button className="btn" onClick={checkSms}>{t('money.check')}</button>
          {smsMsg && <span className="muted small">{smsMsg}</span>}
        </div>
        <h4 className="mt">{t('money.toConfirm')}</h4>
        {toConfirm.length === 0 && <p className="muted small">{t('money.none')}</p>}
        {toConfirm.map((e) => (
          <div key={e.id} className="list-row">
            <div className="small">{e.note}</div>
            <div className="row gap">
              <button className="btn small" onClick={() => dispatch({ type: 'setEntryStatus', id: e.id, status: 'posted' })}>{t('money.confirm')}</button>
              <button className="btn small danger" onClick={() => dispatch({ type: 'setEntryStatus', id: e.id, status: 'rejected' })}>{t('money.reject')}</button>
            </div>
          </div>
        ))}
        <h4 className="mt">{t('money.lastBank')}</h4>
        {lastBank.length === 0 && <p className="muted small">{t('money.none')}</p>}
        {lastBank.map((e) => (
          <div key={e.id} className="list-row small">
            <span>{e.day} · {e.kind}</span><span className="num">{formatINR(e.amount)}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>{t('money.tripForm')}</h3>
        <div className="grid2">
          <label>{t('money.platform')}<input value={tripPlatform} onChange={(e) => setTripPlatform(e.target.value)} /></label>
          <label>{t('money.fare')}<input value={tripFare} onChange={(e) => setTripFare(e.target.value)} /></label>
          <label>{t('money.km')}<input value={tripKm} onChange={(e) => setTripKm(e.target.value)} /></label>
          <label>{t('money.minutes')}<input value={tripMin} onChange={(e) => setTripMin(e.target.value)} /></label>
          <label>{t('money.tip')}<input value={tripTip} onChange={(e) => setTripTip(e.target.value)} /></label>
        </div>
        <div className="verdict mt small" data-testid="trip-verdict">{verdictText}</div>
        <button className="btn mt" disabled={!canLog} onClick={logTrip}>{t('money.logTrip')}</button>
      </div>

      <div className="card" data-testid="incentives">
        <h3>{t('money.incentives')}</h3>
        {state.incentives.map((slab) => {
          const st = incentiveStatus(slab, state.trips, today, state.rates)
          const statusText = st.complete ? t('money.realisticComplete') : st.expired ? t('money.realisticExpired') : st.realistic ? t('money.realisticYes') : t('money.realisticNo')
          return (
            <div key={slab.id} className="list-row col">
              <div className="row between">
                <strong>{slab.label}</strong>
                <button className="btn small danger" onClick={() => dispatch({ type: 'removeSlab', id: slab.id })}>{t('money.remove')}</button>
              </div>
              <div className="muted small">{slab.platform} · {t('money.incentiveProgress', { done: st.done, needed: slab.tripsNeeded })}</div>
              <div className="tank-bar"><div className="tank-fill" style={{ width: `${Math.min(1, st.done / slab.tripsNeeded) * 100}%` }} /></div>
              <div className="small">{statusText}</div>
              <div className="small muted">{t('money.extraCost')}: {formatINR(st.extraCost)} · {t('money.netGain')}: {formatINR(st.netGain)}</div>
            </div>
          )
        })}
        <h4 className="mt">{t('money.addIncentive')}</h4>
        <div className="grid2">
          <label>{t('money.label')}<input value={slabLabel} onChange={(e) => setSlabLabel(e.target.value)} /></label>
          <label>{t('money.platform')}<input value={slabPlatform} onChange={(e) => setSlabPlatform(e.target.value)} /></label>
          <label>{t('money.startDay')}<input value={slabStart} onChange={(e) => setSlabStart(e.target.value)} /></label>
          <label>{t('money.endDay')}<input value={slabEnd} onChange={(e) => setSlabEnd(e.target.value)} /></label>
          <label>{t('money.tripsNeeded')}<input value={slabNeeded} onChange={(e) => setSlabNeeded(e.target.value)} /></label>
          <label>{t('money.bonus')}<input value={slabBonus} onChange={(e) => setSlabBonus(e.target.value)} /></label>
        </div>
        <button className="btn mt" onClick={addSlab}>{t('money.add')}</button>
      </div>

      <div className="card" data-testid="payouts">
        <h3>{t('money.payoutCheck')}</h3>
        {state.payouts.map((p) => {
          const bonus = parseRupees(poBonus[p.id] || '') ?? 0
          const r = reconcile(p, state.trips, bonus)
          return (
            <div key={p.id} className="list-row col">
              <div className="row between"><strong>{p.platform}</strong><button className="btn small danger" onClick={() => dispatch({ type: 'removePayout', id: p.id })}>{t('money.remove')}</button></div>
              <div className="small muted">{p.from} → {p.to}</div>
              <div className="kv small"><span>{t('money.expected')}</span><span className="num">{formatINR(r.expected)}</span></div>
              <div className="kv small"><span>{t('money.received')}</span><span className="num">{formatINR(p.received)}</span></div>
              <div className="kv small"><span>{t('money.gap')}</span><span className={`num ${r.flagged ? 'coral' : ''}`}>{formatINR(r.gap)} {r.flagged ? `(${t('money.flagged')})` : `(${t('money.ok')})`}</span></div>
              <label className="small">{t('money.incentiveBonusRs')} <input className="small-input" value={poBonus[p.id] || ''} onChange={(e) => setPoBonus((s) => ({ ...s, [p.id]: e.target.value }))} /></label>
              <label className="small">{t('money.status')}
                <select value={p.status} onChange={(e) => dispatch({ type: 'upsertPayout', payout: { ...p, status: e.target.value as Payout['status'] } })}>
                  <option value="open">open</option><option value="sent">sent</option><option value="answered">answered</option><option value="resolved">resolved</option>
                </select>
              </label>
              <button className="btn small" disabled={!r.flagged} onClick={() => copyDispute(p, r.expected, r.gap)}>{t('money.copyDispute')}</button>
            </div>
          )
        })}
        <h4 className="mt">{t('money.addPayout')}</h4>
        <div className="grid2">
          <label>{t('money.platform')}<input value={poPlatform} onChange={(e) => setPoPlatform(e.target.value)} /></label>
          <label>{t('money.from')}<input value={poFrom} onChange={(e) => setPoFrom(e.target.value)} /></label>
          <label>{t('money.to')}<input value={poTo} onChange={(e) => setPoTo(e.target.value)} /></label>
          <label>{t('money.receivedRs')}<input value={poReceived} onChange={(e) => setPoReceived(e.target.value)} /></label>
        </div>
        <button className="btn mt" onClick={addPayout}>{t('money.add')}</button>
      </div>
    </section>
  )
}
