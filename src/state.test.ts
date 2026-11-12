import { describe, expect, it } from 'vitest'
import { createSeed, reducer } from './state'
import type { AppState } from './state'
import type { LedgerEntry } from './engine/ledger'
import type { IncentiveSlab } from './engine/incentives'

const entry = (patch: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: 'e1',
  kind: 'credit',
  amount: 25_000,
  day: '2026-01-01',
  source: 'sms',
  dedupeKey: 'key1',
  status: 'review',
  note: 'Sample SMS',
  ...patch,
})

describe('state reducer', () => {
  it('posting a bank entry never changes the balance', () => {
    const state: AppState = { ...createSeed('2026-01-01'), balance: 500_000, entries: [] }
    const next = reducer(state, { type: 'addEntry', entry: entry() })
    expect(next.balance).toBe(500_000)
    expect(next.entries).toHaveLength(1)
  })

  it('confirm and reject only change status', () => {
    const state: AppState = {
      ...createSeed('2026-01-01'),
      balance: 500_000,
      entries: [entry()],
    }
    const confirmed = reducer(state, { type: 'setEntryStatus', id: 'e1', status: 'posted' })
    expect(confirmed.entries[0].status).toBe('posted')
    expect(confirmed.balance).toBe(500_000)

    const rejected = reducer(confirmed, { type: 'setEntryStatus', id: 'e1', status: 'rejected' })
    expect(rejected.entries[0].status).toBe('rejected')
    expect(rejected.balance).toBe(500_000)
  })

  it('starts and ends a shift and logs rounded minutes', () => {
    const state: AppState = { ...createSeed('2026-01-01'), shiftStartedAt: null }
    const started = reducer(state, { type: 'startShift', at: Date.parse('2026-01-01T10:00:00Z') })
    expect(started.shiftStartedAt).toBe(Date.parse('2026-01-01T10:00:00Z'))

    const ended = reducer(started, {
      type: 'endShift',
      at: Date.parse('2026-01-01T10:05:30Z'),
    })
    expect(ended.shiftStartedAt).toBeNull()
    expect(ended.shiftLog[ended.shiftLog.length - 1]).toEqual({ day: '2026-01-01', minutes: 6 })
  })

  it('caps set-aside at the bill amount', () => {
    const state: AppState = createSeed('2026-01-01')
    const next = reducer(state, { type: 'addSetAside', billId: 'sample-bill-1', amount: 800_000 })
    const bill = next.bills.find((b) => b.id === 'sample-bill-1')
    expect(bill?.saved).toBe(480_000)
  })

  it('upserts slabs and payouts by id', () => {
    const state: AppState = createSeed('2026-01-01')
    const slab: IncentiveSlab = {
      ...state.incentives[0],
      label: 'Updated bonus',
      bonus: 90_000,
    }
    const updated = reducer(state, { type: 'upsertSlab', slab })
    expect(updated.incentives).toHaveLength(state.incentives.length)
    expect(updated.incentives[0].label).toBe('Updated bonus')

    const added = reducer(updated, {
      type: 'upsertSlab',
      slab: { ...slab, id: 'slab-new', label: 'New bonus' },
    })
    expect(added.incentives).toHaveLength(state.incentives.length + 1)
  })

  it('updates partial fields and resets to seed', () => {
    const state: AppState = createSeed('2026-01-01')
    const updated = reducer(state, { type: 'update', patch: { balance: 1, lang: 'hi' } })
    expect(updated.balance).toBe(1)
    expect(updated.lang).toBe('hi')

    const reset = reducer(updated, { type: 'reset', today: '2026-01-01' })
    expect(reset.balance).toBe(4_332_809)
    expect(reset.trips).toHaveLength(39)
    expect(reset.version).toBe(1)
  })
})