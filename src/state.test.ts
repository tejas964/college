import { describe, it, expect } from 'vitest'
import { reducer, createSeed, mergeDefaults, AppState } from './state'
import { LedgerEntry } from './engine/ledger'

const today = '2026-11-11'

describe('state reducer', () => {
  it('posting a bank entry never changes balance', () => {
    const s = createSeed(today)
    const bal = s.balance
    const entry: LedgerEntry = {
      id: 'e1', kind: 'credit', amount: 999900, day: today, source: 'sms',
      dedupeKey: 'k', status: 'posted', note: 'test',
    }
    const s2 = reducer(s, { type: 'addEntry', entry })
    expect(s2.balance).toBe(bal)
  })

  it('confirm and reject only change status', () => {
    const s = createSeed(today)
    const entry: LedgerEntry = {
      id: 'e1', kind: 'debit', amount: 1000, day: today, source: 'sms',
      dedupeKey: 'k', status: 'review', note: 'n',
    }
    const s2 = reducer(s, { type: 'addEntry', entry })
    const s3 = reducer(s2, { type: 'setEntryStatus', id: 'e1', status: 'posted' })
    expect(s3.entries[0].status).toBe('posted')
    expect(s3.balance).toBe(s.balance)
    const s4 = reducer(s3, { type: 'setEntryStatus', id: 'e1', status: 'rejected' })
    expect(s4.entries[0].status).toBe('rejected')
  })

  it('shift start and end log minutes', () => {
    let s = createSeed(today)
    s = reducer(s, { type: 'startShift', at: 1000000 })
    expect(s.shiftStartedAt).toBe(1000000)
    s = reducer(s, { type: 'endShift', at: 1000000 + 90 * 60000, day: '2026-11-20' })
    expect(s.shiftStartedAt).toBeNull()
    const log = s.shiftLog.find((l) => l.day === '2026-11-20')
    expect(log?.minutes).toBe(90)
  })

  it('reset', () => {
    const s = createSeed(today)
    const s2 = reducer(s, { type: 'update', patch: { balance: 1 } })
    const s3 = reducer(s2, { type: 'reset', today })
    expect(s3.balance).toBe(createSeed(today).balance)
  })

  it('upsert replaces by id', () => {
    let s = createSeed(today)
    s = reducer(s, { type: 'upsertSlab', slab: { id: 'x', platform: 'Main', label: 'A', startDay: today, endDay: today, tripsNeeded: 1, bonus: 100 } })
    s = reducer(s, { type: 'upsertSlab', slab: { id: 'x', platform: 'Main', label: 'B', startDay: today, endDay: today, tripsNeeded: 2, bonus: 200 } })
    expect(s.incentives.filter((i) => i.id === 'x').length).toBe(1)
    expect(s.incentives.find((i) => i.id === 'x')?.label).toBe('B')
  })

  it('addSetAside capped at bill amount', () => {
    const s = createSeed(today)
    const bill = s.bills[0]
    const s2 = reducer(s, { type: 'addSetAside', billId: bill.id, amount: 99999999 })
    expect(s2.bills[0].saved).toBe(s2.bills[0].amount)
  })

  it('mergeDefaults keeps v1 and fills missing', () => {
    const m = mergeDefaults({ version: 1, balance: 123, lang: 'kn' }, today) as AppState
    expect(m.version).toBe(1)
    expect(m.balance).toBe(123)
    expect(m.lang).toBe('kn')
    expect(m.workDaysPerMonth).toBe(26)
    expect(Array.isArray(m.bills)).toBe(true)
  })

  it('old/invalid falls back to seed', () => {
    const m = mergeDefaults({ version: 2 }, today)
    expect(m.balance).toBe(createSeed(today).balance)
  })
})
