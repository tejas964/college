import { describe, it, expect } from 'vitest'
import { incentiveStatus, perKmCost, IncentiveSlab } from './incentives'
import { Rates } from './trips'

const rates: Rates = { mileage: 40, fuelPricePerLitre: 10500, wearPerKm: 80, platformFeeBps: 2000 }
const slab = (p: Partial<IncentiveSlab> = {}): IncentiveSlab => ({
  id: 's1', platform: 'Main', label: 'Weekend', startDay: '2026-11-10', endDay: '2026-11-16',
  tripsNeeded: 10, bonus: 60000, ...p,
})

describe('incentives', () => {
  it('perKmCost', () => {
    // 10500/40 + 80 = 262.5+80=342.5 -> round 343
    expect(perKmCost(rates)).toBe(Math.round(10500 / 40 + 80))
  })

  it('window counting and extra cost', () => {
    const trips = Array.from({ length: 4 }, (_, i) => ({ day: '2026-11-11', platform: 'Main', km: 5 }))
    const st = incentiveStatus(slab(), trips, '2026-11-11', rates)
    expect(st.done).toBe(4)
    expect(st.remaining).toBe(6)
    expect(st.daysLeft).toBe(6) // 11..16 inclusive = 6 days
    expect(st.avgKm).toBe(5)
    expect(st.extraCost).toBe(Math.round(6 * 5 * perKmCost(rates)))
    expect(st.netGain).toBe(60000 - st.extraCost)
  })

  it('realistic at pace', () => {
    // 14 trips in last 14 days on platform -> pace 1/day
    // 4 done inside window (10th-16th), 6 days left from 11th -> projected 10 >= 10 needed
    const inWindow = [
      { day: '2026-11-10', platform: 'Main', km: 5 },
      { day: '2026-11-10', platform: 'Main', km: 5 },
      { day: '2026-11-11', platform: 'Main', km: 5 },
      { day: '2026-11-11', platform: 'Main', km: 5 },
    ]
    const others = Array.from({ length: 10 }, (_, i) => {
      const d = 9 - i // 9 down to 0 -> 11-09..10-31
      const day = d >= 1 ? `2026-11-${String(d).padStart(2, '0')}` : `2026-10-${String(31 + d).padStart(2, '0')}`
      return { day, platform: 'Main' as const, km: 5 }
    })
    const t2 = [...inWindow, ...others]
    const st = incentiveStatus(slab(), t2, '2026-11-11', rates)
    expect(st.done).toBe(4)
    expect(st.pace).toBe(1)
    expect(st.realistic).toBe(true)
  })

  it('complete', () => {
    const trips = Array.from({ length: 10 }, () => ({ day: '2026-11-12', platform: 'Main', km: 5 }))
    const st = incentiveStatus(slab(), trips, '2026-11-13', rates)
    expect(st.complete).toBe(true)
    expect(st.remaining).toBe(0)
    expect(st.realistic).toBe(true)
  })

  it('expired', () => {
    const trips = Array.from({ length: 2 }, () => ({ day: '2026-11-12', platform: 'Main', km: 5 }))
    const st = incentiveStatus(slab({ endDay: '2026-11-10' }), trips, '2026-11-11', rates)
    expect(st.complete).toBe(false)
    expect(st.daysLeft).toBe(0)
    expect(st.expired).toBe(true)
    expect(st.realistic).toBe(false)
  })

  it('uses all platform trips for avgKm when none in window', () => {
    const trips = [{ day: '2026-10-01', platform: 'Main', km: 20 }, { day: '2026-10-02', platform: 'Main', km: 10 }]
    const st = incentiveStatus(slab({ startDay: '2026-11-10', endDay: '2026-11-16' }), trips, '2026-11-11', rates)
    expect(st.avgKm).toBe(15)
  })
})
