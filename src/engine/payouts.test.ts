import { describe, expect, it } from 'vitest'
import { reconcile } from './payouts'
import type { Payout } from './payouts'
import type { Trip } from './trips'

const payout: Payout = {
  id: 'p1',
  platform: 'Main',
  from: '2026-01-01',
  to: '2026-01-31',
  received: 100_000,
  status: 'open',
}

const trip = (id: string, day: string, fare: number, tip: number, platform = 'Main'): Trip => ({
  id,
  day,
  fare,
  tip,
  km: 10,
  minutes: 60,
  platform,
})

describe('payouts', () => {
  it('excludes tips and adds the incentive bonus', () => {
    const trips = [
      trip('a', '2026-01-05', 10_000, 5_000),
      trip('b', '2026-01-06', 20_000, 1_000),
    ]
    const result = reconcile(payout, trips, 50_000)
    expect(result.expected).toBe(80_000)
    expect(result.gap).toBe(-20_000)
    expect(result.tripCount).toBe(2)
    expect(result.flagged).toBe(false)
  })

  it('filters by platform and period', () => {
    const trips = [
      trip('a', '2026-01-05', 10_000, 0),
      trip('b', '2026-01-05', 10_000, 0, 'Other'),
      trip('c', '2026-02-01', 10_000, 0),
    ]
    const result = reconcile(payout, trips, 0)
    expect(result.expected).toBe(10_000)
    expect(result.tripCount).toBe(1)
  })

  it('flags gaps above ₹50 and 2 percent', () => {
    const trips = [trip('a', '2026-01-05', 100_000, 0)]
    const bigGap = reconcile({ ...payout, received: 90_000 }, trips, 0)
    expect(bigGap.gap).toBe(10_000)
    expect(bigGap.flagged).toBe(true)

    const smallRupeeGap = reconcile({ ...payout, received: 96_000 }, trips, 0)
    expect(smallRupeeGap.gap).toBe(4_000)
    expect(smallRupeeGap.flagged).toBe(false)

    const smallPercentGap = reconcile({ ...payout, received: 98_000 }, trips, 0)
    expect(smallPercentGap.gap).toBe(2_000)
    expect(smallPercentGap.flagged).toBe(false)
  })
})