import { describe, expect, it } from 'vitest'
import { assessTrip, median, ratePerHour, tripBreakdown } from './trips'
import type { Rates, Trip } from './trips'

const rates: Rates = {
  mileage: 40,
  fuelPricePerLitre: 10_000,
  wearPerKm: 200,
  platformFeeBps: 1_500,
}

const zeroRates: Rates = {
  mileage: 40,
  fuelPricePerLitre: 0,
  wearPerKm: 0,
  platformFeeBps: 0,
}

describe('trips', () => {
  it('computes a cost breakdown in paise', () => {
    const trip: Trip = { id: 't1', day: '2026-01-10', fare: 20_000, tip: 2_000, km: 10, minutes: 60 }
    expect(tripBreakdown(trip, rates)).toEqual({
      gross: 22_000,
      fuel: 2_500,
      wear: 2_000,
      platformFee: 3_000,
      net: 14_500,
    })
  })

  it('computes rate per hour and guards zero minutes', () => {
    expect(ratePerHour(14_500, 60)).toBe(14_500)
    expect(ratePerHour(14_500, 90)).toBe(9_667)
    expect(ratePerHour(14_500, 0)).toBe(0)
  })

  it('finds a median', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBe(0)
  })

  it('assesses a trip as learning below 30 trips', () => {
    const assessment = assessTrip({ fare: 10_000, km: 5, minutes: 60 }, [], zeroRates)
    expect(assessment.verdict).toBe('learning')
    expect(assessment.candidateNet).toBe(10_000)
  })

  it('assesses worth, marginal and skip with 30 history trips', () => {
    const history: Trip[] = Array.from({ length: 30 }, (_, i) => ({
      id: `h${i}`,
      day: '2026-01-01',
      fare: 10_000,
      tip: 0,
      km: 5,
      minutes: 60,
    }))
    expect(assessTrip({ fare: 12_000, km: 5, minutes: 60 }, history, zeroRates).verdict).toBe('worth')
    expect(assessTrip({ fare: 8_000, km: 5, minutes: 60 }, history, zeroRates).verdict).toBe('marginal')
    expect(assessTrip({ fare: 6_000, km: 5, minutes: 60 }, history, zeroRates).verdict).toBe('skip')
    expect(assessTrip({ fare: 12_000, km: 5, minutes: 60 }, history, zeroRates).pct).toBe(120)
  })
})