import { useState } from 'react'
import type { Dispatch } from 'react'
import type { TFunction } from '../i18n'
import type { Action, AppState } from '../state'
import { makeId } from '../state'
import { addDays, openAmount } from '../engine/bills'
import { formatINR, parseRupees, toPaise, toRupees } from '../engine/money'
import { assessTrip } from '../engine/trips'
import type { Trip } from '../engine/trips'
import { completedIncentiveBonusFor, incentiveStatus } from '../engine/incentives'
import type { IncentiveSlab } from '../engine/incentives'
import { reconcile } from '../engine/payouts'
import type { Payout, PayoutStatus } from '../engine/payouts'
import { isDuplicate, maskNote } from '../engine/ledger'
import type { LedgerEntry } from '../engine/ledger'
import { parseBankSms } from '../ingest/sms'
import { Empty, Field, Pill, ProgressBar, Section } from '../ui'

type SmsMessage = { key: string; tone: 'ok' | 'warn' | 'bad' } | null

const statusKey: Record<PayoutStatus, string> = {
  open: 'money.statusOpen',
  sent: 'money.statusSent',
  answered: 'money.statusAnswered',
  resolved: 'money.statusResolved',
}

export function MoneyScreen({
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
  const [balanceDraft, setBalanceDraft] = useState(() => toRupees(state.balance).toFixed(2))
  const [setAside, setSetAside] = useState<Record<string, string>>({})
  const [sms, setSms] = useState('')
  const [smsMessage, setSmsMessage] = useState<SmsMessage>(null)
  const [platform, setPlatform] = useState('Main')
  const [fare, setFare] = useState('')
  const [km, setKm] = useState('')
  const [minutes, setMinutes] = useState('')
  const [tip, setTip] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [slabDraft, setSlabDraft] = useState({
    platform: 'Main',
    label: '',
    startDay: addDays(today, -1),
    endDay: addDays(today, 9),
    tripsNeeded: '10',
    bonus: '500',
  })
  const [payoutDraft, setPayoutDraft] = useState({
    platform: 'Main',
    from: addDays(today, -30),
    to: today,
    received: '0',
    status: 'open' as PayoutStatus,
  })

  const fareRupees = parseRupees(fare)
  const farePaise = fareRupees === null ? null : toPaise(fareRupees)
  const kmValue = Number(km)
  const minutesValue = Number(minutes)
  const tipPaise = Math.max(0, toPaise(parseRupees(tip) ?? 0))
  const tripValid =
    farePaise !== null &&
    farePaise > 0 &&
    Number.isFinite(kmValue) &&
    kmValue > 0 &&
    Number.isFinite(minutesValue) &&
    minutesValue > 0
  const assessment =
    farePaise !== null && tripValid
      ? assessTrip({ fare: farePaise, km: kmValue, minutes: minutesValue }, state.trips, state.rates)
      : null

  const review = state.entries.filter((entry) => entry.status === 'review')
  const posted = state.entries.filter((entry) => entry.status === 'posted').slice(-5)

  const saveBalance = () => {
    const value = parseRupees(balanceDraft)
    if (value === null) return
    dispatch({ type: 'update', patch: { balance: toPaise(value) } })
  }

  const checkSms = () => {
    const parsed = parseBankSms(sms)
    if (!parsed) {
      setSmsMessage({ key: 'money.smsUnknown', tone: 'bad' })
      return
    }
    if (isDuplicate(state.entries, parsed.dedupeKey)) {
      setSmsMessage({ key: 'money.smsDuplicate', tone: 'warn' })
      return
    }
    const entry: LedgerEntry = {
      id: makeId('entry'),
      kind: parsed.kind,
      amount: parsed.amountPaise,
      day: today,
      source: 'sms',
      dedupeKey: parsed.dedupeKey,
      status: parsed.needsReview ? 'review' : 'posted',
      note: maskNote(sms),
    }
    dispatch({ type: 'addEntry', entry })
    setSmsMessage({
      key: parsed.needsReview ? 'money.smsReview' : 'money.smsAdded',
      tone: parsed.needsReview ? 'warn' : 'ok',
    })
    setSms('')
  }

  const logTrip = () => {
    if (!tripValid || farePaise === null) return
    const trip: Trip = {
      id: makeId('trip'),
      day: today,
      fare: farePaise,
      tip: tipPaise,
      km: kmValue,
      minutes: minutesValue,
      platform: platform.trim() || t('money.platformDefault'),
    }
    dispatch({ type: 'addTrip', trip })
    setFare('')
    setKm('')
    setMinutes('')
    setTip('')
  }

  const addSlab = () => {
    const bonus = parseRupees(slabDraft.bonus) ?? 0
    const tripsNeeded = Number(slabDraft.tripsNeeded)
    if (!slabDraft.label.trim() || !Number.isFinite(tripsNeeded) || tripsNeeded <= 0) return
    const slab: IncentiveSlab = {
      id: makeId('slab'),
      platform: slabDraft.platform.trim() || t('money.platformDefault'),
      label: slabDraft.label.trim(),
      startDay: slabDraft.startDay,
      endDay: slabDraft.endDay,
      tripsNeeded: Math.round(tripsNeeded),
      bonus: toPaise(bonus),
    }
    dispatch({ type: 'upsertSlab', slab })
    setSlabDraft({
      platform: 'Main',
      label: '',
      startDay: addDays(today, -1),
      endDay: addDays(today, 9),
      tripsNeeded: '10',
      bonus: '500',
    })
  }

  const addPayout = () => {
    const received = parseRupees(payoutDraft.received) ?? 0
    const payout: Payout = {
      id: makeId('payout'),
      platform: payoutDraft.platform.trim() || t('money.platformDefault'),
      from: payoutDraft.from,
      to: payoutDraft.to,
      received: toPaise(received),
      status: payoutDraft.status,
    }
    dispatch({ type: 'upsertPayout', payout })
    setPayoutDraft({
      platform: 'Main',
      from: addDays(today, -30),
      to: today,
      received: '0',
      status: 'open',
    })
  }

  const copyDispute = (payout: Payout, expected: number, received: number, gap: number) => {
    const note = t('disputeBody', {
      platform: payout.platform,
      from: payout.from,
      to: payout.to,
      expected: formatINR(expected),
      received: formatINR(received),
      gap: formatINR(gap),
    })
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(note)
        .then(() => setCopiedId(payout.id))
        .catch(() => setCopiedId(null))
    }
  }

  return (
    <div className="screen-stack">
      <Section title={t('money.balance')}>
        <div className="inline-form">
          <input
            className="input"
            inputMode="decimal"
            value={balanceDraft}
            onChange={(event) => setBalanceDraft(event.target.value)}
            aria-label={t('money.balance')}
          />
          <button type="button" className="button primary" onClick={saveBalance}>
            {t('money.save')}
          </button>
        </div>
        <p className="panel-hint">{t('money.balanceHint')}</p>
      </Section>

      <Section title={t('money.bills')}>
        <div className="bill-list">
          {state.bills.map((bill) => (
            <div key={bill.id} className="bill-editor">
              <div className="bill-editor-head">
                <div>
                  <strong>{bill.name}</strong>
                  <span className="bill-editor-meta">
                    {t('today.savedOf', {
                      saved: formatINR(bill.saved),
                      amount: formatINR(bill.amount),
                    })}{' '}
                    · {t('money.billRemaining', { amount: formatINR(openAmount(bill)) })}
                  </span>
                </div>
                <Pill tone={openAmount(bill) <= 0 ? 'mint' : 'muted'}>
                  {openAmount(bill) <= 0 ? t('today.paid') : bill.dueDate}
                </Pill>
              </div>
              <div className="inline-form">
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder={t('money.setAsidePlaceholder')}
                  value={setAside[bill.id] ?? ''}
                  onChange={(event) =>
                    setSetAside((current) => ({ ...current, [bill.id]: event.target.value }))
                  }
                  aria-label={t('money.setAside')}
                />
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    const value = parseRupees(setAside[bill.id] ?? '')
                    if (value === null) return
                    dispatch({ type: 'addSetAside', billId: bill.id, amount: toPaise(value) })
                    setSetAside((current) => ({ ...current, [bill.id]: '' }))
                  }}
                >
                  {t('money.add')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('money.smsTitle')}>
        <textarea
          className="textarea"
          rows={3}
          placeholder={t('money.smsPlaceholder')}
          value={sms}
          onChange={(event) => setSms(event.target.value)}
        />
        <div className="inline-form">
          <button type="button" className="button primary" onClick={checkSms}>
            {t('money.check')}
          </button>
        </div>
        {smsMessage && (
          <p className={`form-message ${smsMessage.tone}`}>{t(smsMessage.key)}</p>
        )}
        <p className="panel-hint">{t('money.smsHint')}</p>
      </Section>

      <Section title={t('money.confirmQueue')}>
        {review.length === 0 ? (
          <Empty>{t('money.noConfirm')}</Empty>
        ) : (
          <ul className="entry-list">
            {review.map((entry) => (
              <li key={entry.id} className="entry-row">
                <div>
                  <strong>
                    {entry.kind === 'credit' ? t('money.credit') : t('money.debit')}{' '}
                    {formatINR(entry.amount)}
                  </strong>
                  <span className="entry-meta">
                    {entry.day} · {entry.note}
                  </span>
                </div>
                <div className="entry-actions">
                  <button
                    type="button"
                    className="button small mint"
                    onClick={() => dispatch({ type: 'setEntryStatus', id: entry.id, status: 'posted' })}
                  >
                    {t('money.confirm')}
                  </button>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => dispatch({ type: 'setEntryStatus', id: entry.id, status: 'rejected' })}
                  >
                    {t('money.reject')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('money.lastVerified')}>
        {posted.length === 0 ? (
          <Empty>{t('money.noEntries')}</Empty>
        ) : (
          <ul className="entry-list compact">
            {posted.map((entry) => (
              <li key={entry.id} className="entry-row">
                <div>
                  <strong>
                    {entry.kind === 'credit' ? t('money.credit') : t('money.debit')}{' '}
                    {formatINR(entry.amount)}
                  </strong>
                  <span className="entry-meta">
                    {entry.day} · {entry.note}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="panel-hint">{t('money.entriesNote')}</p>
      </Section>

      <Section title={t('money.tripForm')}>
        <div className="form-grid">
          <Field label={t('money.platform')}>
            <input
              className="input"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            />
          </Field>
          <Field label={t('money.fare')}>
            <input
              className="input"
              inputMode="decimal"
              value={fare}
              onChange={(event) => setFare(event.target.value)}
            />
          </Field>
          <Field label={t('money.km')}>
            <input
              className="input"
              inputMode="decimal"
              value={km}
              onChange={(event) => setKm(event.target.value)}
            />
          </Field>
          <Field label={t('money.minutes')}>
            <input
              className="input"
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </Field>
          <Field label={`${t('money.tip')} (${t('common.optional')})`}>
            <input
              className="input"
              inputMode="decimal"
              value={tip}
              onChange={(event) => setTip(event.target.value)}
            />
          </Field>
        </div>
        {assessment && (
          <div className="verdict">
            <Pill
              tone={
                assessment.verdict === 'worth'
                  ? 'mint'
                  : assessment.verdict === 'marginal'
                    ? 'gold'
                    : assessment.verdict === 'skip'
                      ? 'coral'
                      : 'ion'
              }
            >
              {assessment.verdict === 'learning'
                ? t('earn.verdictLearning', { count: state.trips.length })
                : assessment.verdict === 'worth'
                  ? t('earn.verdictWorth')
                  : assessment.verdict === 'marginal'
                    ? t('earn.verdictMarginal')
                    : t('earn.verdictSkip')}
            </Pill>
            <span className="verdict-line">
              {t('earn.candidateNet', { amount: formatINR(assessment.candidateNet) })}{' '}
              {t('earn.candidateRph', { rate: formatINR(assessment.candidateRph) })}
            </span>
            <span className="verdict-line muted">
              {t('earn.median', { rate: formatINR(assessment.medianRph) })}
            </span>
          </div>
        )}
        <div className="inline-form">
          <button
            type="button"
            className="button primary"
            onClick={logTrip}
            disabled={!tripValid}
          >
            {t('money.log')}
          </button>
          {!tripValid && <span className="panel-hint">{t('money.logDisabled')}</span>}
        </div>
      </Section>

      <Section title={t('money.incentives')}>
        {state.incentives.length === 0 && <Empty>{t('money.noIncentives')}</Empty>}
        <div className="card-list">
          {state.incentives.map((slab) => {
            const status = incentiveStatus(slab, state.trips, today, state.rates)
            const pct = status.needed > 0 ? Math.min(1, status.done / status.needed) : 1
            const realistic = status.complete
              ? t('money.incentiveComplete')
              : status.expired
                ? t('money.incentiveExpired')
                : status.realistic
                  ? t('money.incentiveRealistic')
                  : t('money.incentiveNotRealistic')
            return (
              <div key={slab.id} className="sub-card">
                <div className="sub-card-head">
                  <div>
                    <strong>{slab.label}</strong>
                    <span className="entry-meta">
                      {slab.platform} · {slab.startDay} → {slab.endDay}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => dispatch({ type: 'removeSlab', id: slab.id })}
                  >
                    {t('money.remove')}
                  </button>
                </div>
                <ProgressBar value={pct} max={1} tone={status.realistic ? 'mint' : 'coral'} />
                <div className="sub-card-meta">
                  <span>{t('money.incentiveProgress', { done: status.done, needed: status.needed })}</span>
                  <span>{realistic}</span>
                </div>
                <div className="sub-card-meta">
                  <span>{t('money.incentiveExtra', { amount: formatINR(status.extraCost) })}</span>
                  <span className={status.netGain >= 0 ? 'positive' : 'negative'}>
                    {t('money.incentiveNet', { amount: formatINR(status.netGain) })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="form-grid compact-grid">
          <Field label={t('money.platform')}>
            <input
              className="input"
              value={slabDraft.platform}
              onChange={(event) => setSlabDraft({ ...slabDraft, platform: event.target.value })}
            />
          </Field>
          <Field label={t('money.label')}>
            <input
              className="input"
              value={slabDraft.label}
              onChange={(event) => setSlabDraft({ ...slabDraft, label: event.target.value })}
            />
          </Field>
          <Field label={t('money.startDay')}>
            <input
              className="input"
              type="date"
              value={slabDraft.startDay}
              onChange={(event) => setSlabDraft({ ...slabDraft, startDay: event.target.value })}
            />
          </Field>
          <Field label={t('money.endDay')}>
            <input
              className="input"
              type="date"
              value={slabDraft.endDay}
              onChange={(event) => setSlabDraft({ ...slabDraft, endDay: event.target.value })}
            />
          </Field>
          <Field label={t('money.tripsNeeded')}>
            <input
              className="input"
              inputMode="numeric"
              value={slabDraft.tripsNeeded}
              onChange={(event) => setSlabDraft({ ...slabDraft, tripsNeeded: event.target.value })}
            />
          </Field>
          <Field label={t('money.bonus')}>
            <input
              className="input"
              inputMode="decimal"
              value={slabDraft.bonus}
              onChange={(event) => setSlabDraft({ ...slabDraft, bonus: event.target.value })}
            />
          </Field>
        </div>
        <div className="inline-form">
          <button type="button" className="button primary" onClick={addSlab}>
            {t('money.addIncentive')}
          </button>
        </div>
      </Section>

      <Section title={t('money.payouts')}>
        {state.payouts.length === 0 && <Empty>{t('money.noPayouts')}</Empty>}
        <div className="card-list">
          {state.payouts.map((payout) => {
            const bonus = completedIncentiveBonusFor(payout.platform, state.incentives, state.trips, today, state.rates)
            const result = reconcile(payout, state.trips, bonus)
            return (
              <div key={payout.id} className="sub-card">
                <div className="sub-card-head">
                  <div>
                    <strong>{payout.platform}</strong>
                    <span className="entry-meta">
                      {payout.from} → {payout.to}
                    </span>
                  </div>
                  <Pill tone={result.flagged ? 'coral' : 'mint'}>
                    {result.flagged ? t('money.flagged') : t('money.notFlagged')}
                  </Pill>
                </div>
                <dl className="reconcile">
                  <div>
                    <dt>{t('money.expected')}</dt>
                    <dd>{formatINR(result.expected)}</dd>
                  </div>
                  <div>
                    <dt>{t('money.received')}</dt>
                    <dd>{formatINR(result.received)}</dd>
                  </div>
                  <div>
                    <dt>{t('money.gap')}</dt>
                    <dd className={result.gap > 0 ? 'negative' : 'positive'}>
                      {formatINR(result.gap)}
                    </dd>
                  </div>
                </dl>
                <div className="inline-form">
                  <select
                    className="input select"
                    value={payout.status}
                    onChange={(event) =>
                      dispatch({
                        type: 'upsertPayout',
                        payout: { ...payout, status: event.target.value as PayoutStatus },
                      })
                    }
                    aria-label={t('money.status')}
                  >
                    {Object.entries(statusKey).map(([value, key]) => (
                      <option key={value} value={value}>
                        {t(key)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="button small"
                    disabled={!result.flagged}
                    onClick={() => copyDispute(payout, result.expected, result.received, result.gap)}
                  >
                    {copiedId === payout.id ? t('money.copyDone') : t('money.copyDispute')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="form-grid compact-grid">
          <Field label={t('money.platform')}>
            <input
              className="input"
              value={payoutDraft.platform}
              onChange={(event) => setPayoutDraft({ ...payoutDraft, platform: event.target.value })}
            />
          </Field>
          <Field label={t('money.from')}>
            <input
              className="input"
              type="date"
              value={payoutDraft.from}
              onChange={(event) => setPayoutDraft({ ...payoutDraft, from: event.target.value })}
            />
          </Field>
          <Field label={t('money.to')}>
            <input
              className="input"
              type="date"
              value={payoutDraft.to}
              onChange={(event) => setPayoutDraft({ ...payoutDraft, to: event.target.value })}
            />
          </Field>
          <Field label={t('money.received')}>
            <input
              className="input"
              inputMode="decimal"
              value={payoutDraft.received}
              onChange={(event) => setPayoutDraft({ ...payoutDraft, received: event.target.value })}
            />
          </Field>
          <Field label={t('money.status')}>
            <select
              className="input select"
              value={payoutDraft.status}
              onChange={(event) =>
                setPayoutDraft({ ...payoutDraft, status: event.target.value as PayoutStatus })
              }
            >
              {Object.entries(statusKey).map(([value, key]) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="inline-form">
          <button type="button" className="button primary" onClick={addPayout}>
            {t('money.addPayout')}
          </button>
        </div>
      </Section>
    </div>
  )
}