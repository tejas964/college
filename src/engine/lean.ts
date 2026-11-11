import { Trip, Rates, tripBreakdown } from './trips'
import { dayNumber } from './bills'

export function weeklyNets(
  trips: Trip[],
  rates: Rates,
  today: string,
  weeks = 12
): number[] {
  const todayN = dayNumber(today)
  const result: number[] = []
  // buckets ending today, going back: [today-6..today], [today-13..today-7], ...
  for (let w = 0; w < weeks; w++) {
    const end = todayN - w * 7
    const start = end - 6
    const bucket = trips.filter((t) => {
      const dn = dayNumber(t.day)
      return dn >= start && dn <= end
    })
    if (bucket.length > 0) {
      const net = bucket.reduce((s, t) => s + tripBreakdown(t, rates).net, 0)
      result.push(net)
    }
  }
  // oldest first
  return result.reverse()
}

export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const idx = Math.floor(p * (sorted.length - 1))
  return sorted[idx]
}

export interface LeanPlanResult {
  ok: boolean
  low: number
  gap: number
  hours: number
}

export function leanPlan(
  weekly: number[],
  fixedWeekly: number,
  perHour: number
): LeanPlanResult {
  if (weekly.length < 4) {
    return { ok: false, low: 0, gap: 0, hours: 0 }
  }
  const low = percentile(weekly, 0.2)
  const gap = Math.max(0, fixedWeekly - low)
  const hours = gap > 0 && perHour > 0 ? gap / perHour : 0
  return { ok: true, low, gap, hours }
}
