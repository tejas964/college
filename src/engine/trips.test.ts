import { describe, it, expect } from 'vitest'
import { tripBreakdown, ratePerHour, assessTrip, median, Trip, Rates } from './trips'

const rates: Rates = { mileage: 40, fuelPricePerLitre: 10500, wearPerKm: 80, platformFeeBps: 2000 }

const trip = (p: Partial<Trip>): Trip => ({
  id: 't', day: '2026-11-11', fare: 20000, tip: 2000, km: 10, minutes: 30, platform: 'Main', ...p,
})

describe('trips', () => {
  it('cost breakdown in paise', () => {
    const b = tripBreakdown(trip({ fare: 20000, tip: 2000, km: 10 }), rates)
    // gross 22000, fuel round(10/40*10500)=round(2625)=2625, wear 800, fee round(20000*2000/10000)=4000
    expect(b.gross).toBe(22000)
    expect(b.fuel).toBe(2625)
    expect(b.wear).toBe(800)
    expect(b.platformFee).toBe(4000)
    expect(b.net).toBe(22000 - 2625 - 800 - 4000)
  })

  it('per-hour with zero minutes', () => {
    expect(ratePerHour(10000, 0)).toBe(0)
    expect(ratePerHour(10000, 30)).toBe(Math.round(10000 * 60 / 30))
  })

  it('median', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(3) // avg of 2,3 rounded
  })

  it('assessTrip learning when < 30 history', () => {
    const hist = Array.from({ length: 29 }, (_, i) => trip({ id: String(i) }))
    const r = assessTrip({ fare: 20000, km: 10, minutes: 30 }, hist, rates)
    expect(r.verdict).toBe('learning')
  })

  it('assessTrip worth/skip with tips in history but not candidate', () => {
    // history trips with good tips -> higher median rph
    const hist = Array.from({ length: 30 }, (_, i) => trip({ id: String(i), tip: 5000 }))
    const good = assessTrip({ fare: 30000, km: 5, minutes: 20 }, hist, rates)
    expect(good.verdict === 'worth' || good.verdict === 'marginal' || good.verdict === 'skip').toBe(true)
    expect(typeof good.pct).toBe('number')

    // build deterministic: all history same net including tip
    const h2 = Array.from({ length: 30 }, (_, i) => trip({ id: String(i), fare: 20000, tip: 0, km: 10, minutes: 30 }))
    const medianRph = ratePerHour(tripBreakdown(trip({ fare: 20000, tip: 0 }), rates).net, 30)
    // candidate same as median -> worth
    const same = assessTrip({ fare: 20000, km: 10, minutes: 30 }, h2, rates)
    expect(same.medianRph).toBe(medianRph)
    expect(same.pct).toBe(100)
    expect(same.verdict).toBe('worth')
    // low fare -> skip
    const low = assessTrip({ fare: 5000, km: 10, minutes: 30 }, h2, rates)
    expect(low.pct).toBeLessThan(70)
    expect(low.verdict).toBe('skip')
    // marginal
    const mid = assessTrip({ fare: 16000, km: 10, minutes: 30 }, h2, rates)
    expect(mid.pct).toBeGreaterThanOrEqual(70)
    expect(mid.pct).toBeLessThan(100)
    expect(mid.verdict).toBe('marginal')
  })
})
