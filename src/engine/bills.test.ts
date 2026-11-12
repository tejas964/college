import { describe, expect, it } from 'vitest'
import {
  addDays,
  billFill,
  billsDueWithin,
  dailyNeed,
  dayNumber,
  daysBetween,
  freeCash,
  openAmount,
  runwayDays,
  todayISO,
  workDaysIn,
} from './bills'
import type { Bill } from './bills'

const bill = (patch: Partial<Bill>): Bill => ({
  id: 'b1',
  name: 'Rent',
  amount: 100_000,
  saved: 0,
  dueDate: '2026-01-20',
  ...patch,
})

describe('bills', () => {
  it('does UTC date arithmetic', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(dayNumber('2026-01-01')).toBe(20454)
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30)
  })

  it('computes work days and open amounts', () => {
    expect(workDaysIn(30, 26)).toBe(26)
    expect(workDaysIn(1, 0)).toBe(1)
    expect(openAmount(bill({ amount: 100_000, saved: 40_000 }))).toBe(60_000)
    expect(billFill(bill({ amount: 100_000, saved: 40_000 }))).toBe(0.4)
    expect(billFill(bill({ amount: 0, saved: 0 }))).toBe(1)
    expect(openAmount(bill({ amount: 100_000, saved: 150_000 }))).toBe(0)
  })

  it('computes daily need for future, overdue and paid bills', () => {
    expect(dailyNeed(bill({ dueDate: '2026-01-20' }), '2026-01-17', 26)).toBe(33_334)
    expect(dailyNeed(bill({ dueDate: '2026-01-10' }), '2026-01-17', 26)).toBe(100_000)
    expect(dailyNeed(bill({ dueDate: '2026-01-17' }), '2026-01-17', 26)).toBe(100_000)
    expect(dailyNeed(bill({ amount: 100_000, saved: 100_000, dueDate: '2026-01-20' }), '2026-01-17', 26)).toBe(0)
  })

  it('sums bills due within a horizon, including overdue', () => {
    const bills = [
      bill({ id: 'a', amount: 10_000, dueDate: '2026-01-10' }),
      bill({ id: 'b', amount: 20_000, dueDate: '2026-01-31' }),
      bill({ id: 'c', amount: 30_000, dueDate: '2026-02-20' }),
      bill({ id: 'd', amount: 40_000, saved: 10_000, dueDate: '2026-01-18' }),
    ]
    expect(billsDueWithin(bills, '2026-01-17', 30)).toBe(60_000)
    expect(billsDueWithin(bills, '2026-01-17', 40)).toBe(90_000)
  })

  it('computes free cash and which reserve limits it', () => {
    const bills = [bill({ amount: 10_000, dueDate: '2026-01-20' })]
    const none = freeCash(50_000, bills, 5_000, '2026-01-17')
    expect(none).toEqual({ amount: 35_000, billsReserved: 10_000, emergencyReserved: 5_000, limitedBy: 'none' })

    const billsLimited = freeCash(8_000, bills, 1_000, '2026-01-17')
    expect(billsLimited.amount).toBe(0)
    expect(billsLimited.limitedBy).toBe('bills')

    const emergencyLimited = freeCash(3_000, [], 5_000, '2026-01-17')
    expect(emergencyLimited.amount).toBe(0)
    expect(emergencyLimited.limitedBy).toBe('emergency')
  })

  it('computes runway days', () => {
    const bills = [bill({ amount: 3_000, dueDate: '2026-02-01' })]
    expect(runwayDays(30_000, bills, 500)).toBe(50)
    expect(runwayDays(10_000, [], 0)).toBe(999)
    expect(runwayDays(0, [], 500)).toBe(0)
  })
})