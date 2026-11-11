import { describe, it, expect } from 'vitest'
import { reconcile, Payout } from './payouts'

const payout = (p: Partial<Payout> = {}): Payout => ({
  id: 'p1', platform: 'Main', from: '2026-11-01', to: '2026-11-07', received: 0, status: 'open', ...p,
})

describe('payouts', () => {
  it('tips excluded, bonus added, platform and period filtering', () => {
    const trips = [
      { platform: 'Main', day: '2026-11-02', fare: 10000 },
      { platform: 'Main', day: '2026-11-05', fare: 15000 },
      { platform: 'Other', day: '2026-11-03', fare: 9000 },
      { platform: 'Main', day: '2026-10-31', fare: 8000 },
      { platform: 'Main', day: '2026-11-08', fare: 7000 },
    ]
    const r = reconcile(payout({ received: 20000 }), trips, 5000)
    expect(r.expected).toBe(30000) // 10000+15000+5000
    expect(r.gap).toBe(10000)
  })

  it('flag thresholds (₹50 and 2%)', () => {
    const trips = [{ platform: 'Main', day: '2026-11-02', fare: 100000 }]
    // gap 5000 exactly -> not flagged (>5000 required)
    expect(reconcile(payout({ received: 95000 }), trips, 0).flagged).toBe(false)
    // gap 5001 but 2% of 100000 is 2000 -> flagged
    expect(reconcile(payout({ received: 94999 }), trips, 0).flagged).toBe(true)
    // large expected, small gap percent
    expect(reconcile(payout({ received: 994999 }), [{ platform: 'Main', day: '2026-11-02', fare: 1000000 }], 0).flagged).toBe(false) // gap 5001, 0.5%
    // small expected where gap>50 but <=2%
    const r = reconcile(payout({ received: 0 }), [{ platform: 'Main', day: '2026-11-02', fare: 4000 }], 0)
    expect(r.gap).toBe(4000)
    expect(r.flagged).toBe(false)
  })
})
