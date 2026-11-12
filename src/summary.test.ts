import { describe, expect, it } from 'vitest'
import { addDays } from './engine/bills'
import { tripBreakdown } from './engine/trips'
import { createSeed } from './state'
import { taxSummary, todaySummary, weekSummary } from './summary'

const today = '2026-01-01'

describe('summary', () => {
  it("computes today's net from a manual sum", () => {
    const state = createSeed(today)
    const summary = todaySummary(state, today)
    const manual = state.trips
      .filter((trip) => trip.day === today)
      .reduce((sum, trip) => sum + tripBreakdown(trip, state.rates).net, 0)
    expect(summary.net).toBe(manual)
    expect(summary.gross).toBe(
      state.trips
        .filter((trip) => trip.day === today)
        .reduce((sum, trip) => sum + tripBreakdown(trip, state.rates).gross, 0),
    )
    expect(summary.rows).toHaveLength(3)
    expect(summary.target).toBe(summary.suggestedTarget)
    expect(summary.toGo).toBe(Math.max(0, summary.target - summary.net))
  })

  it('never returns negative free cash and reserves for due bills', () => {
    const state = createSeed(today)
    const summary = todaySummary(state, today)
    expect(summary.freeCash.amount).toBeGreaterThanOrEqual(0)
    expect(summary.freeCash.amount).toBeLessThan(state.balance)
    expect(summary.freeCash.billsReserved).toBeGreaterThan(0)
    expect(summary.freeCash.limitedBy).toBe('none')
    expect(summary.runwayDays).toBeGreaterThan(0)
  })

  it('covers seven days in the week summary', () => {
    const state = createSeed(today)
    const week = weekSummary(state, today)
    expect(week.from).toBe(addDays(today, -6))
    expect(week.to).toBe(today)
    expect(week.tripCount).toBe(39)
    expect(week.net).toBe(
      state.trips.reduce((sum, trip) => sum + tripBreakdown(trip, state.rates).net, 0),
    )
  })

  it('requires at least seven worked days for tax', () => {
    const full = taxSummary(createSeed(today), today)
    expect(full.enoughData).toBe(true)
    expect(full.workedDays).toBe(7)
    expect(full.method).toBe('actual')

    const sparse = {
      ...createSeed(today),
      trips: createSeed(today).trips.slice(0, 6),
    }
    const partial = taxSummary(sparse, today)
    expect(partial.enoughData).toBe(false)
    expect(partial.workedDays).toBeLessThan(7)
    expect(partial.payable).toBe(0)
  })
})