import { describe, it, expect } from 'vitest'
import {
  dayNumber, addDays, daysBetween, openAmount, workDaysIn, dailyNeed,
  billsDueWithin, freeCash, runwayDays, Bill
} from './bills'

const bill = (p: Partial<Bill>): Bill => ({
  id: 'b1', name: 'Rent', amount: 10000, saved: 0, dueDate: '2026-11-20', ...p,
})

describe('bills', () => {
  it('UTC date arithmetic', () => {
    expect(daysBetween('2026-11-11', '2026-11-11')).toBe(0)
    expect(daysBetween('2026-11-11', '2026-11-12')).toBe(1)
    expect(daysBetween('2026-11-12', '2026-11-11')).toBe(-1)
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(dayNumber('2026-11-11')).toBe(Math.floor(Date.UTC(2026, 10, 11) / 86400000))
  })

  it('workDaysIn', () => {
    expect(workDaysIn(30, 26)).toBe(26)
    expect(workDaysIn(1, 26)).toBe(1)
    expect(workDaysIn(0, 26)).toBe(1)
  })

  it('daily need including overdue and paid', () => {
    const today = '2026-11-11'
    // 10 days left, 26 wdpm -> workDaysIn(10,26)=round(260/30)=9, need ceil(10000/9)
    expect(dailyNeed(bill({ amount: 10000, saved: 0, dueDate: '2026-11-21' }), today, 26)).toBe(Math.ceil(10000 / 9))
    // due today -> 1 cal day
    expect(dailyNeed(bill({ amount: 10000, saved: 0, dueDate: '2026-11-11' }), today, 26)).toBe(Math.ceil(10000 / 1))
    // overdue -> 1 cal day
    expect(dailyNeed(bill({ amount: 10000, saved: 0, dueDate: '2026-11-01' }), today, 26)).toBe(Math.ceil(10000 / 1))
    // paid
    expect(dailyNeed(bill({ amount: 10000, saved: 10000, dueDate: '2026-11-01' }), today, 26)).toBe(0)
    expect(dailyNeed(bill({ amount: 10000, saved: 12000, dueDate: '2026-11-01' }), today, 26)).toBe(0)
  })

  it('openAmount', () => {
    expect(openAmount(bill({ amount: 10000, saved: 3000 }))).toBe(7000)
    expect(openAmount(bill({ amount: 10000, saved: 10000 }))).toBe(0)
    expect(openAmount(bill({ amount: 10000, saved: 12000 }))).toBe(0)
  })

  it('billsDueWithin includes overdue', () => {
    const today = '2026-11-11'
    const bills = [
      bill({ id: '1', amount: 10000, saved: 0, dueDate: '2026-11-01' }), // overdue
      bill({ id: '2', amount: 5000, saved: 0, dueDate: '2026-11-20' }), // 9 days
      bill({ id: '3', amount: 7000, saved: 0, dueDate: '2026-12-20' }), // 39 days
    ]
    expect(billsDueWithin(bills, today, 30)).toBe(15000)
  })

  it('free cash limits and limitedBy', () => {
    const today = '2026-11-11'
    const bills = [bill({ amount: 200000, saved: 0, dueDate: '2026-11-20' })]
    const r1 = freeCash(500000, bills, 100000, today)
    expect(r1.billsReserved).toBe(200000)
    expect(r1.emergencyReserved).toBe(100000)
    expect(r1.amount).toBe(200000)
    expect(r1.limitedBy).toBe('bills')

    const r2 = freeCash(500000, [], 100000, today)
    expect(r2.amount).toBe(400000)
    expect(r2.limitedBy).toBe('emergency')

    const r3 = freeCash(500000, [], 0, today)
    expect(r3.amount).toBe(500000)
    expect(r3.limitedBy).toBe('none')

    const r4 = freeCash(10000, bills, 100000, today)
    expect(r4.amount).toBe(0)
  })

  it('runway', () => {
    const bills = [bill({ amount: 300000, saved: 0, dueDate: '2026-12-30' })]
    // dailySpend = 50000 + 300000/30 = 60000, balance 600000 -> 10 days
    expect(runwayDays(600000, bills, 50000)).toBe(10)
    expect(runwayDays(100000, [], 0)).toBe(999)
  })
})
