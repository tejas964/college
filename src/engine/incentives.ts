import { Rates } from './trips'
import { dayNumber, daysBetween } from './bills'

export interface IncentiveSlab {
  id: string
  platform: string
  label: string
  startDay: string
  endDay: string
  tripsNeeded: number
  bonus: number
}

export interface IncentiveTrip {
  day: string
  platform?: string
  km: number
}

export function perKmCost(rates: Rates): number {
  const fuelPerKm = rates.mileage > 0 ? rates.fuelPricePerLitre / rates.mileage : 0
  return Math.round(fuelPerKm + rates.wearPerKm)
}

export interface IncentiveStatus {
  done: number
  remaining: number
  daysLeft: number
  pace: number
  projected: number
  complete: boolean
  expired: boolean
  realistic: boolean
  avgKm: number
  extraCost: number
  netGain: number
}

export function incentiveStatus(
  slab: IncentiveSlab,
  trips: IncentiveTrip[],
  today: string,
  rates: Rates
): IncentiveStatus {
  const platform = slab.platform
  const startN = dayNumber(slab.startDay)
  const endN = dayNumber(slab.endDay)
  const windowTrips = trips.filter((t) => {
    const p = t.platform ?? 'Main'
    if (p !== platform) return false
    const dn = dayNumber(t.day)
    return dn >= startN && dn <= endN
  })
  const done = windowTrips.length
  const remaining = Math.max(0, slab.tripsNeeded - done)
  const daysLeft = Math.max(0, daysBetween(today, slab.endDay) + 1)
  const complete = remaining === 0
  const expired = !complete && daysLeft === 0

  const todayN = dayNumber(today)
  const last14Start = todayN - 13
  const last14Trips = trips.filter((t) => {
    const p = t.platform ?? 'Main'
    if (p !== platform) return false
    const dn = dayNumber(t.day)
    return dn >= last14Start && dn <= todayN
  })
  const pace = last14Trips.length / 14
  const projected = done + pace * daysLeft
  const realistic = complete || (!expired && projected >= slab.tripsNeeded)

  let avgKm: number
  if (windowTrips.length > 0) {
    avgKm = windowTrips.reduce((s, t) => s + t.km, 0) / windowTrips.length
  } else {
    const allPlat = trips.filter((t) => (t.platform ?? 'Main') === platform)
    avgKm = allPlat.length > 0 ? allPlat.reduce((s, t) => s + t.km, 0) / allPlat.length : 0
  }
  const extraCost = Math.round(remaining * avgKm * perKmCost(rates))
  const netGain = slab.bonus - extraCost
  return { done, remaining, daysLeft, pace, projected, complete, expired, realistic, avgKm, extraCost, netGain }
}
