import { addDays, daysBetween } from './bills'
import type { Rates, Trip } from './trips'

export interface IncentiveSlab {
  id: string
  platform: string
  label: string
  startDay: string
  endDay: string
  tripsNeeded: number
  bonus: number
}

export interface IncentiveStatus {
  done: number
  needed: number
  remaining: number
  daysLeft: number
  pace: number
  projected: number
  complete: boolean
  expired: boolean
  realistic: boolean
  avgKm: number
  perKmCost: number
  extraCost: number
  netGain: number
}

export function perKmCost(rates: Rates): number {
  if (!Number.isFinite(rates.mileage) || rates.mileage <= 0) {
    return Math.round(rates.wearPerKm)
  }
  return Math.round(rates.fuelPricePerLitre / rates.mileage + rates.wearPerKm)
}

export function completedIncentiveBonusFor(
  platform: string,
  incentives: IncentiveSlab[],
  trips: Trip[],
  today: string,
  rates: Rates,
): number {
  return incentives
    .filter(
      (slab) =>
        slab.platform === platform && incentiveStatus(slab, trips, today, rates).complete,
    )
    .reduce((sum, slab) => sum + slab.bonus, 0)
}

function platformOf(trip: Trip): string {
  return trip.platform ?? 'Main'
}

function inWindow(trip: Trip, startDay: string, endDay: string): boolean {
  return trip.day >= startDay && trip.day <= endDay
}

export function incentiveStatus(
  slab: IncentiveSlab,
  trips: Trip[],
  today: string,
  rates: Rates,
): IncentiveStatus {
  const platformTrips = trips.filter((trip) => platformOf(trip) === slab.platform)
  const windowTrips = platformTrips.filter((trip) => inWindow(trip, slab.startDay, slab.endDay))
  const done = windowTrips.length
  const needed = Math.max(0, slab.tripsNeeded)
  const remaining = Math.max(0, needed - done)
  const daysLeft = Math.max(0, daysBetween(today, slab.endDay) + 1)
  const recentFrom = addDays(today, -13)
  const recent = platformTrips.filter((trip) => trip.day >= recentFrom && trip.day <= today)
  const pace = recent.length / 14
  const projected = done + pace * daysLeft
  const complete = remaining === 0
  const expired = !complete && daysLeft === 0
  const realistic = complete || (!expired && projected >= needed)
  const avgSource = windowTrips.length > 0 ? windowTrips : platformTrips
  const avgKm =
    avgSource.length === 0
      ? 0
      : avgSource.reduce((sum, trip) => sum + trip.km, 0) / avgSource.length
  const cost = perKmCost(rates)
  const extraCost = Math.round(remaining * avgKm * cost)
  return {
    done,
    needed,
    remaining,
    daysLeft,
    pace,
    projected,
    complete,
    expired,
    realistic,
    avgKm,
    perKmCost: cost,
    extraCost,
    netGain: slab.bonus - extraCost,
  }
}