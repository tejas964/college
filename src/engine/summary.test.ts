import { describe, it, expect } from 'vitest'
import { todaySummary, weekSummary, taxSummary } from './summary'
import { createSeed, AppState } from '../state'
import { tripBreakdown } from './trips'
import { addDays } from './bills'

const today = '2026-11-11'

function baseState(): AppState {
  return createSeed(today)
}

describe('summary', () => {
  it("today's net matches a manual sum", () => {
    const s = baseState()
    const ts = todaySummary(s, today)
    const manual = s.trips
      .filter((t) => t.day === today)
      .reduce((sum, t) => sum + tripBreakdown(t, s.rates).net, 0)
    expect(ts.net).toBe(manual)
    expect(ts.rows.length).toBe(ts.trips.length)
  })

  it('free cash is never negative and is less than balance when bills are due', () => {
    const s = baseState()
    const ts = todaySummary(s, today)
    expect(ts.freeCash).toBeGreaterThanOrEqual(0)
    expect(ts.billsDue30).toBeGreaterThan(0)
    expect(ts.freeCash).toBeLessThan(s.balance)
  })

  it('week covers 7 days', () => {
    const s = baseState()
    const ws = weekSummary(s, today)
    expect(ws.from).toBe(addDays(today, -6))
    expect(ws.to).toBe(today)
    // manual net over last 7 days including today
    const manual = s.trips.filter((t) => {
      const dn = Math.floor(Date.UTC(+t.day.slice(0,4), +t.day.slice(5,7)-1, +t.day.slice(8,10)) / 86400000)
      const tn = Math.floor(Date.UTC(2026,10,11)/86400000)
      return dn >= tn - 6 && dn <= tn
    }).reduce((sum, t) => sum + tripBreakdown(t, s.rates).net, 0)
    expect(ws.net).toBe(manual)
  })

  it('tax needs 7 worked days', () => {
    const s = baseState()
    // seed has 7 days of trips so should be enough
    const enough = taxSummary(s, today)
    expect(enough.enoughData).toBe(true)
    expect(enough.workedDays).toBeGreaterThanOrEqual(7)

    // few days
    const few: AppState = { ...s, trips: s.trips.filter((t) => t.day === today) }
    const notEnough = taxSummary(few, today)
    expect(notEnough.enoughData).toBe(false)
  })

  it('target uses suggested when dailyTarget null', () => {
    const s = baseState()
    s.dailyTarget = null
    const ts = todaySummary(s, today)
    expect(ts.target).toBe(ts.suggestedTarget)
    const s2 = { ...s, dailyTarget: 50000 }
    const ts2 = todaySummary(s2, today)
    expect(ts2.target).toBe(50000)
  })
})
