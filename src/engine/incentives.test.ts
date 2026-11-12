import { describe, expect, it } from 'vitest'
import { incentiveStatus, perKmCost } from './incentives'
import type { IncentiveSlab } from './incentives'
import type { Rates, Trip } from './trips'

const rates: Rates = {
  mileage: 40,
  fuelPricePerLitre: 10_000,
  wearPerKm: 200,
  platformFeeBps: 0,
}

const slab: IncentiveSlab = {
  id: 's1',
  platform: 'Main',
  label: 'Weekend bonus',
  startDay: '2026-01-01',
  endDay: '2026-01-10',
  tripsNeeded: 10,
  bonus: 100_000,
}

const trip = (id: string, day: string, km: number, platform = 'Main'): Trip => ({
  id,
  day,
  fare: 10_000,
  tip: 0,
  km,
  minutes: 60,
  platform,
})

describe('incentives', () => {
  it('computes per km cost', () => {
    expect(perKmCost(rates)).toBe(450)
  })

  it('counts only platform trips inside the window and computes cost', () => {
    const trips = [
      trip('w1', '2026-01-02', 10),
      trip('w2', '2026-01-03', 20),
      trip('w3', '2026-01-04', 30),
      trip('w4', '2026-01-05', 40),
      trip('r1', '2025-12-31', 10),
      trip('r2', '2025-12-30', 10),
      trip('o1', '2026-01-03', 10, 'Other'),
    ]
    const status = incentiveStatus(slab, trips, '2026-01-05', rates)
    expect(status.done).toBe(4)
    expect(status.remaining).toBe(6)
    expect(status.daysLeft).toBe(6)
    expect(status.pace).toBeCloseTo(6 / 14, 10)
    expect(status.avgKm).toBe(25)
    expect(status.extraCost).toBe(67_500)
    expect(status.netGain).toBe(32_500)
    expect(status.realistic).toBe(false)
  })

  it('calls a pace realistic', () => {
    const activeSlab: IncentiveSlab = {
      ...slab,
      startDay: '2026-01-16',
      endDay: '2026-01-29',
    }
    const trips = Array.from({ length: 14 }, (_, i) => trip(`p${i}`, `2026-01-${String(i + 2).padStart(2, '0')}`, 10))
    const status = incentiveStatus(activeSlab, trips, '2026-01-15', rates)
    expect(status.done).toBe(0)
    expect(status.daysLeft).toBe(15)
    expect(status.pace).toBe(1)
    expect(status.projected).toBe(15)
    expect(status.realistic).toBe(true)
  })

  it('marks complete and expired correctly', () => {
    const completeTrips = Array.from({ length: 10 }, (_, i) =>
      trip(`c${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`, 10),
    )
    const complete = incentiveStatus(slab, completeTrips, '2026-01-05', rates)
    expect(complete.complete).toBe(true)
    expect(complete.remaining).toBe(0)
    expect(complete.extraCost).toBe(0)
    expect(complete.netGain).toBe(100_000)
    expect(complete.realistic).toBe(true)

    const expired = incentiveStatus(slab, [trip('e1', '2026-01-05', 10)], '2026-01-20', rates)
    expect(expired.complete).toBe(false)
    expect(expired.expired).toBe(true)
    expect(expired.realistic).toBe(false)
    expect(expired.daysLeft).toBe(0)
  })
})