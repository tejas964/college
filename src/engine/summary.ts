import { AppState } from '../state'
import { dayNumber, daysBetween, addDays, dailyNeed, billsDueWithin, freeCash, runwayDays } from './bills'
import { tripBreakdown, ratePerHour, TripBreakdown } from './trips'
import { Trip } from './trips'
import { bestRegime, presumptiveTax, taxFromTds, estimateAnnualNet, RegimeTaxResult, PresumptiveResult } from './tax'
import { toPaise } from './money'

export interface TodayTripRow {
  trip: Trip
  breakdown: TripBreakdown
}

export interface TodaySummary {
  today: string
  trips: Trip[]
  rows: TodayTripRow[]
  gross: number
  net: number
  minutes: number
  appOnMinutes: number
  perHour: number
  target: number
  suggestedTarget: number
  toGo: number
  freeCash: number
  freeCashInfo: { billsReserved: number; emergencyReserved: number; limitedBy: 'none' | 'bills' | 'emergency' }
  runwayDays: number
  billsDue30: number
}

export function todaySummary(state: AppState, today: string): TodaySummary {
  const todaysTrips = state.trips.filter((t) => t.day === today)
  const rows = todaysTrips.map((t) => ({ trip: t, breakdown: tripBreakdown(t, state.rates) }))
  const gross = rows.reduce((s, r) => s + r.breakdown.gross, 0)
  const net = rows.reduce((s, r) => s + r.breakdown.net, 0)
  const minutes = todaysTrips.reduce((s, t) => s + t.minutes, 0)
  const appOnMinutes = state.shiftLog.filter((s) => s.day === today).reduce((s, l) => s + l.minutes, 0)
  const perHour = ratePerHour(net, appOnMinutes > 0 ? appOnMinutes : minutes)

  const billsNeed35 = state.bills
    .filter((b) => {
      const d = daysBetween(today, b.dueDate)
      return d <= 35
    })
    .reduce((s, b) => s + dailyNeed(b, today, state.workDaysPerMonth), 0)
  const suggestedTarget =
    billsNeed35 + state.livingPerDay + Math.round(state.emergency.monthly / state.workDaysPerMonth)
  const target = state.dailyTarget !== null ? state.dailyTarget : suggestedTarget
  const toGo = Math.max(0, target - net)

  const fc = freeCash(state.balance, state.bills, state.emergency.monthly, today)
  const rd = runwayDays(state.balance, state.bills, state.livingPerDay)
  const billsDue30 = billsDueWithin(state.bills, today, 30)

  return {
    today,
    trips: todaysTrips,
    rows,
    gross,
    net,
    minutes,
    appOnMinutes,
    perHour,
    target,
    suggestedTarget,
    toGo,
    freeCash: fc.amount,
    freeCashInfo: { billsReserved: fc.billsReserved, emergencyReserved: fc.emergencyReserved, limitedBy: fc.limitedBy },
    runwayDays: rd,
    billsDue30,
  }
}

export interface WeekSummary {
  from: string
  to: string
  gross: number
  fuel: number
  wear: number
  platformFee: number
  net: number
  minutes: number
  perHour: number
}

export function weekSummary(state: AppState, today: string): WeekSummary {
  const toN = dayNumber(today)
  const fromN = toN - 6
  let gross = 0, fuel = 0, wear = 0, platformFee = 0, net = 0, minutes = 0
  for (const t of state.trips) {
    const dn = dayNumber(t.day)
    if (dn < fromN || dn > toN) continue
    const b = tripBreakdown(t, state.rates)
    gross += b.gross
    fuel += b.fuel
    wear += b.wear
    platformFee += b.platformFee
    net += b.net
    minutes += t.minutes
  }
  return {
    from: addDays(today, -6),
    to: today,
    gross, fuel, wear, platformFee, net, minutes,
    perHour: ratePerHour(net, minutes),
  }
}

export interface TaxSummaryEnough {
  enoughData: true
  workedDays: number
  annualNet: number
  annualGross: number
  actual: { new: RegimeTaxResult; old: RegimeTaxResult; recommended: 'new' | 'old' }
  presumptive: PresumptiveResult
  method: 'actual' | 'presumptive'
  payable: number
  stillToSet: number
  refund: number
  ruleVersion: string
  status: string
}

export interface TaxSummaryNotEnough {
  enoughData: false
  workedDays: number
}

export type TaxSummary = TaxSummaryEnough | TaxSummaryNotEnough

export function taxSummary(state: AppState, today: string): TaxSummary {
  const todayN = dayNumber(today)
  const fromN = todayN - 89
  const toN = todayN
  const workedDaysSet = new Set<string>()
  let net90 = 0
  let gross90 = 0
  for (const t of state.trips) {
    const dn = dayNumber(t.day)
    if (dn < fromN || dn > toN) continue
    workedDaysSet.add(t.day)
    const b = tripBreakdown(t, state.rates)
    net90 += b.net
    gross90 += b.gross
  }
  const workedDays = workedDaysSet.size
  if (workedDays < 7) {
    return { enoughData: false, workedDays }
  }
  const workDaysPerYear = state.workDaysPerMonth * 12
  const annualNet = estimateAnnualNet(net90, workedDays, workDaysPerYear)
  const annualGross = estimateAnnualNet(gross90, workedDays, workDaysPerYear)

  const actualBest = bestRegime(Math.max(0, annualNet))
  const actualTotal = actualBest[actualBest.recommended].totalPaise
  const pres = presumptiveTax(annualGross, state.digitalReceiptsOk)

  let method: 'actual' | 'presumptive' = 'actual'
  let payable = actualTotal
  if (pres.eligible && pres.totalPaise < actualTotal) {
    method = 'presumptive'
    payable = pres.totalPaise
  }
  const { stillToSet, refund } = taxFromTds(payable, state.tdsDeducted)

  // import config for ruleVersion/status
  const ruleVersion = 'IN_2025-26-draft'
  const status = 'UNVERIFIED: Tax values are illustrative and must be checked against incometax.gov.in and the current Finance Act before real use.'

  return {
    enoughData: true,
    workedDays,
    annualNet,
    annualGross,
    actual: { new: actualBest.new, old: actualBest.old, recommended: actualBest.recommended },
    presumptive: pres,
    method,
    payable,
    stillToSet,
    refund,
    ruleVersion,
    status,
  }
}
