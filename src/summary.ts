import {
  addDays,
  billsDueWithin,
  dailyNeed,
  daysBetween,
  freeCash,
  runwayDays,
} from './engine/bills'
import type { FreeCashResult } from './engine/bills'
import { tripBreakdown } from './engine/trips'
import type { Breakdown, Trip } from './engine/trips'
import { bankTotals } from './engine/ledger'
import {
  bestRegime,
  estimateAnnualNet,
  presumptiveTax,
  taxFromTds,
} from './engine/tax'
import type { BestRegime, PresumptiveResult } from './engine/tax'
import { ratePerHour } from './engine/trips'
import type { AppState } from './state'

export interface TodayRow {
  trip: Trip
  breakdown: Breakdown
}

export interface TodaySummary {
  day: string
  rows: TodayRow[]
  gross: number
  net: number
  minutes: number
  appOnMinutes: number
  perHour: number
  target: number
  suggestedTarget: number
  toGo: number
  freeCash: FreeCashResult
  runwayDays: number
  billsDue30: number
}

export function todaySummary(state: AppState, today: string): TodaySummary {
  const rows = state.trips
    .filter((trip) => trip.day === today)
    .map((trip) => ({ trip, breakdown: tripBreakdown(trip, state.rates) }))
  const gross = rows.reduce((sum, row) => sum + row.breakdown.gross, 0)
  const net = rows.reduce((sum, row) => sum + row.breakdown.net, 0)
  const minutes = rows.reduce((sum, row) => sum + row.trip.minutes, 0)
  const appOnMinutes = state.shiftLog
    .filter((entry) => entry.day === today)
    .reduce((sum, entry) => sum + entry.minutes, 0)
  const workDays = state.workDaysPerMonth > 0 ? state.workDaysPerMonth : 1
  const suggestedTarget =
    state.bills
      .filter((bill) => daysBetween(today, bill.dueDate) <= 35)
      .reduce((sum, bill) => sum + dailyNeed(bill, today, state.workDaysPerMonth), 0) +
    state.livingPerDay +
    Math.round(state.emergency.monthly / workDays)
  const target = state.dailyTarget ?? suggestedTarget
  return {
    day: today,
    rows,
    gross,
    net,
    minutes,
    appOnMinutes,
    perHour: ratePerHour(net, minutes),
    target,
    suggestedTarget,
    toGo: Math.max(0, target - net),
    freeCash: freeCash(state.balance, state.bills, state.emergency.monthly, today),
    runwayDays: runwayDays(state.balance, state.bills, state.livingPerDay),
    billsDue30: billsDueWithin(state.bills, today, 30),
  }
}

export interface WeekSummary {
  from: string
  to: string
  tripCount: number
  gross: number
  fuel: number
  wear: number
  platformFee: number
  net: number
  minutes: number
  perHour: number
}

export function weekSummary(state: AppState, today: string): WeekSummary {
  const from = addDays(today, -6)
  const trips = state.trips.filter((trip) => trip.day >= from && trip.day <= today)
  const breakdowns = trips.map((trip) => tripBreakdown(trip, state.rates))
  const gross = breakdowns.reduce((sum, b) => sum + b.gross, 0)
  const fuel = breakdowns.reduce((sum, b) => sum + b.fuel, 0)
  const wear = breakdowns.reduce((sum, b) => sum + b.wear, 0)
  const platformFee = breakdowns.reduce((sum, b) => sum + b.platformFee, 0)
  const net = breakdowns.reduce((sum, b) => sum + b.net, 0)
  const minutes = trips.reduce((sum, trip) => sum + trip.minutes, 0)
  return {
    from,
    to: today,
    tripCount: trips.length,
    gross,
    fuel,
    wear,
    platformFee,
    net,
    minutes,
    perHour: ratePerHour(net, minutes),
  }
}

export type TaxMethod = 'actual' | 'presumptive'

export interface TaxSummary {
  enoughData: boolean
  workedDays: number
  annualNetPaise: number
  annualGrossPaise: number
  method: TaxMethod | null
  payable: number
  stillToSet: number
  refund: number
  actual: BestRegime | null
  presumptive: PresumptiveResult | null
}

export function taxSummary(state: AppState, today: string): TaxSummary {
  const from = addDays(today, -89)
  const recentTrips = state.trips.filter((trip) => trip.day >= from && trip.day <= today)
  const workedDays = new Set(recentTrips.map((trip) => trip.day)).size
  if (workedDays < 7) {
    return {
      enoughData: false,
      workedDays,
      annualNetPaise: 0,
      annualGrossPaise: 0,
      method: null,
      payable: 0,
      stillToSet: 0,
      refund: 0,
      actual: null,
      presumptive: null,
    }
  }

  let totalGross = 0
  let totalNet = 0
  for (const trip of recentTrips) {
    const breakdown = tripBreakdown(trip, state.rates)
    totalGross += breakdown.gross
    totalNet += breakdown.net
  }
  const workDaysPerYear = state.workDaysPerMonth * 12
  const annualNetPaise = estimateAnnualNet(totalNet, workedDays, workDaysPerYear)
  const annualGrossPaise = estimateAnnualNet(totalGross, workedDays, workDaysPerYear)
  const actual = bestRegime(annualNetPaise)
  const presumptive = presumptiveTax(annualGrossPaise, state.digitalReceiptsOk)
  const method: TaxMethod =
    presumptive.eligible && presumptive.totalPaise < actual.totalPaise ? 'presumptive' : 'actual'
  const payable = method === 'presumptive' ? presumptive.totalPaise : actual.totalPaise
  const tds = taxFromTds(payable, state.tdsDeducted)
  return {
    enoughData: true,
    workedDays,
    annualNetPaise,
    annualGrossPaise,
    method,
    payable,
    stillToSet: tds.stillToSet,
    refund: tds.refund,
    actual,
    presumptive,
  }
}

export interface IncomeSummary {
  from: string
  to: string
  trips: number
  gross: number
  net: number
  bankCreditCount: number
  bankCreditTotal: number
}

export function incomeSummary(state: AppState, today: string, from: string = addDays(today, -89)): IncomeSummary {
  const trips = state.trips.filter((trip) => trip.day >= from && trip.day <= today)
  const breakdowns = trips.map((trip) => tripBreakdown(trip, state.rates))
  const bank = bankTotals(state.entries, from, today)
  const bankCreditCount = state.entries.filter(
    (entry) =>
      entry.status === 'posted' &&
      entry.kind === 'credit' &&
      entry.day >= from &&
      entry.day <= today,
  ).length
  return {
    from,
    to: today,
    trips: trips.length,
    gross: breakdowns.reduce((sum, b) => sum + b.gross, 0),
    net: breakdowns.reduce((sum, b) => sum + b.net, 0),
    bankCreditCount,
    bankCreditTotal: bank.credits,
  }
}
