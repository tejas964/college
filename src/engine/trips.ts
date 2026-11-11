export interface Rates {
  mileage: number
  fuelPricePerLitre: number
  wearPerKm: number
  platformFeeBps: number
}

export interface Trip {
  id: string
  day: string
  fare: number
  tip: number
  km: number
  minutes: number
  platform?: string
}

export interface TripBreakdown {
  gross: number
  fuel: number
  wear: number
  platformFee: number
  net: number
}

export function tripBreakdown(trip: Trip, rates: Rates): TripBreakdown {
  const gross = trip.fare + trip.tip
  const fuel = rates.mileage > 0 ? Math.round((trip.km / rates.mileage) * rates.fuelPricePerLitre) : 0
  const wear = Math.round(trip.km * rates.wearPerKm)
  const platformFee = Math.round((trip.fare * rates.platformFeeBps) / 10000)
  const net = gross - fuel - wear - platformFee
  return { gross, fuel, wear, platformFee, net }
}

export function ratePerHour(net: number, minutes: number): number {
  if (minutes === 0) return 0
  return Math.round((net * 60) / minutes)
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export type TripVerdict = 'learning' | 'worth' | 'marginal' | 'skip'

export interface AssessResult {
  verdict: TripVerdict
  pct: number
  candidateRph: number
  medianRph: number
}

export function assessTrip(
  candidate: { fare: number; km: number; minutes: number },
  history: Trip[],
  rates: Rates
): AssessResult {
  const candBd = tripBreakdown(
    { id: '', day: '', fare: candidate.fare, tip: 0, km: candidate.km, minutes: candidate.minutes },
    rates
  )
  const candidateRph = ratePerHour(candBd.net, candidate.minutes)
  if (history.length < 30) {
    return { verdict: 'learning', pct: 0, candidateRph, medianRph: 0 }
  }
  const rphs = history.map((t) => ratePerHour(tripBreakdown(t, rates).net, t.minutes))
  const medianRph = median(rphs)
  if (medianRph === 0) {
    return { verdict: 'learning', pct: 0, candidateRph, medianRph }
  }
  const pct = Math.round((candidateRph * 100) / medianRph)
  let verdict: TripVerdict
  if (pct >= 100) verdict = 'worth'
  else if (pct >= 70) verdict = 'marginal'
  else verdict = 'skip'
  return { verdict, pct, candidateRph, medianRph }
}
