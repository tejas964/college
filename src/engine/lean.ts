import { addDays } from './bills'
import { tripBreakdown } from './trips'
import type { Rates, Trip } from './trips'

export interface WeekBucket {
  startDay: string
  endDay: string
  net: number
  tripCount: number
  minutes: number
}

export function weeklyNets(
  trips: Trip[],
  rates: Rates,
  today: string,
  weeks = 12,
): WeekBucket[] {
  if (weeks <= 0) return []
  const result: WeekBucket[] = []
  for (let w = weeks - 1; w >= 0; w -= 1) {
    const endDay = addDays(today, -w * 7)
    const startDay = addDays(endDay, -6)
    const inWeek = trips.filter((trip) => trip.day >= startDay && trip.day <= endDay)
    if (inWeek.length === 0) continue
    result.push({
      startDay,
      endDay,
      net: inWeek.reduce((sum, trip) => sum + tripBreakdown(trip, rates).net, 0),
      tripCount: inWeek.length,
      minutes: inWeek.reduce((sum, trip) => sum + trip.minutes, 0),
    })
  }
  return result
}

export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const clamped = Math.min(1, Math.max(0, p))
  const index = Math.floor(clamped * (sorted.length - 1))
  return sorted[index]
}

export interface LeanPlan {
  enoughData: boolean
  low: number
  gap: number
  hours: number
  weeks: number
}

export function leanPlan(
  weekly: number[],
  fixedWeekly: number,
  perHour: number,
): LeanPlan {
  const weeks = weekly.length
  if (weeks < 4) {
    return { enoughData: false, low: 0, gap: 0, hours: 0, weeks }
  }
  const low = percentile(weekly, 0.2)
  const gap = Math.max(0, fixedWeekly - low)
  const hours = gap > 0 && perHour > 0 ? gap / perHour : 0
  return { enoughData: true, low, gap, hours, weeks }
}