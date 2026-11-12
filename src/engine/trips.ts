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

export interface Breakdown {
  gross: number
  fuel: number
  wear: number
  platformFee: number
  net: number
}

export function tripBreakdown(trip: Trip, rates: Rates): Breakdown {
  const gross = trip.fare + trip.tip
  const fuel = rates.mileage > 0 ? Math.round((trip.km / rates.mileage) * rates.fuelPricePerLitre) : 0
  const wear = Math.round(trip.km * rates.wearPerKm)
  const platformFee = Math.round((trip.fare * rates.platformFeeBps) / 10_000)
  return {
    gross,
    fuel,
    wear,
    platformFee,
    net: gross - fuel - wear - platformFee,
  }
}

export function ratePerHour(net: number, minutes: number): number {
  if (minutes === 0 || !Number.isFinite(minutes)) return 0
  return Math.round((net * 60) / minutes)
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function totalKmSince(trips: Trip[], from: string | null): number {
  return trips
    .filter((trip) => from === null || trip.day >= from)
    .reduce((sum, trip) => sum + trip.km, 0)
}

export type Verdict = 'learning' | 'worth' | 'marginal' | 'skip'

export interface TripAssessment {
  verdict: Verdict
  pct: number
  candidateNet: number
  candidateRph: number
  medianRph: number
}

export interface TripCandidate {
  fare: number
  km: number
  minutes: number
}

export function assessTrip(
  candidate: TripCandidate,
  history: Trip[],
  rates: Rates,
): TripAssessment {
  const candidateNet = tripBreakdown(
    { id: 'candidate', day: '', fare: candidate.fare, tip: 0, km: candidate.km, minutes: candidate.minutes },
    rates,
  ).net
  const candidateRph = ratePerHour(candidateNet, candidate.minutes)
  const historyRph = history.map((trip) => ratePerHour(tripBreakdown(trip, rates).net, trip.minutes))
  const medianRph = median(historyRph)
  if (history.length < 30) {
    return { verdict: 'learning', pct: 0, candidateNet, candidateRph, medianRph }
  }
  const pct = medianRph > 0 ? Math.round((candidateRph * 100) / medianRph) : 0
  const verdict: Verdict = pct >= 100 ? 'worth' : pct >= 70 ? 'marginal' : 'skip'
  return { verdict, pct, candidateNet, candidateRph, medianRph }
}