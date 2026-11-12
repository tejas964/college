import { describe, expect, it } from 'vitest'
import { leanPlan, percentile, weeklyNets } from './lean'
import type { Rates, Trip } from './trips'

const rates: Rates = {
  mileage: 40,
  fuelPricePerLitre: 0,
  wearPerKm: 0,
  platformFeeBps: 0,
}

const trip = (id: string, day: string, fare: number): Trip => ({
  id,
  day,
  fare,
  tip: 0,
  km: 10,
  minutes: 60,
})

describe('lean', () => {
  it('returns only worked weeks, oldest first', () => {
    const trips = [
      trip('a', '2026-01-10', 10_000),
      trip('b', '2026-01-03', 20_000),
      trip('c', '2025-12-30', 30_000),
    ]
    const weeks = weeklyNets(trips, rates, '2026-01-15', 12)
    expect(weeks.map((w) => [w.startDay, w.endDay, w.net])).toEqual([
      ['2025-12-26', '2026-01-01', 30_000],
      ['2026-01-02', '2026-01-08', 20_000],
      ['2026-01-09', '2026-01-15', 10_000],
    ])
    expect(weeks.every((w) => w.tripCount > 0)).toBe(true)
  })

  it('computes percentiles', () => {
    expect(percentile([1, 2, 3, 4], 0.2)).toBe(1)
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2)
    expect(percentile([1, 2, 3, 4], 1)).toBe(4)
    expect(percentile([], 0.5)).toBe(0)
  })

  it('computes a lean plan from at least 4 worked weeks', () => {
    const plan = leanPlan([10_000, 20_000, 30_000, 40_000], 50_000, 500)
    expect(plan.enoughData).toBe(true)
    expect(plan.low).toBe(10_000)
    expect(plan.gap).toBe(40_000)
    expect(plan.hours).toBe(80)
    expect(plan.weeks).toBe(4)
  })

  it('refuses a plan with fewer than 4 weeks', () => {
    const plan = leanPlan([10_000, 20_000, 30_000], 50_000, 500)
    expect(plan.enoughData).toBe(false)
    expect(plan.gap).toBe(0)
    expect(plan.hours).toBe(0)
  })
})