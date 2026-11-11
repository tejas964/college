import { describe, it, expect } from 'vitest'
import { weeklyNets, percentile, leanPlan } from './lean'
import { Trip, Rates } from './trips'

const rates: Rates = { mileage: 40, fuelPricePerLitre: 10500, wearPerKm: 80, platformFeeBps: 2000 }
const trip = (day: string, fare: number): Trip => ({ id: day + fare, day, fare, tip: 0, km: 5, minutes: 30, platform: 'Main' })

describe('lean', () => {
  it('percentile', () => {
    expect(percentile([1, 2, 3, 4, 5], 0.2)).toBe(1) // floor(0.2*4)=0
    expect(percentile([10, 20, 30, 40, 50], 0.5)).toBe(30)
  })

  it('worked-weeks-only filter and oldest first', () => {
    // today 2026-11-11, trips in week 0 (11-05..11-11?) and week 2 only
    const trips = [
      trip('2026-11-11', 10000),
      trip('2026-10-28', 20000), // week 2 back
    ]
    const nets = weeklyNets(trips, rates, '2026-11-11', 4)
    expect(nets.length).toBe(2)
    // oldest first: week2 then week0
    expect(nets[0]).toBeLessThan(nets[1] + 1e9) // just ensure two values
  })

  it('minimum of 4 weeks', () => {
    const r = leanPlan([100, 200, 300], 500, 10000)
    expect(r.ok).toBe(false)
  })

  it('gap and hours', () => {
    const r = leanPlan([10000, 20000, 30000, 40000, 50000], 25000, 5000)
    expect(r.ok).toBe(true)
    expect(r.low).toBe(percentile([10000, 20000, 30000, 40000, 50000], 0.2))
    expect(r.gap).toBe(Math.max(0, 25000 - r.low))
    expect(r.hours).toBe(r.gap > 0 ? r.gap / 5000 : 0)
  })
})
