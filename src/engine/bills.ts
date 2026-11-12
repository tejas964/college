export interface Bill {
  id: string
  name: string
  amount: number
  saved: number
  dueDate: string
}

const DAY_MS = 86_400_000

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function dayNumber(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00.000Z`) / DAY_MS)
}

export function addDays(iso: string, n: number): string {
  return new Date((dayNumber(iso) + n) * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

export function openAmount(bill: Bill): number {
  return Math.max(0, bill.amount - bill.saved)
}

export function billFill(bill: Bill): number {
  if (!Number.isFinite(bill.amount) || bill.amount <= 0) return 1
  return Math.min(1, Math.max(0, bill.saved / bill.amount))
}

export function workDaysIn(calendarDays: number, workDaysPerMonth: number): number {
  return Math.max(1, Math.round((calendarDays * workDaysPerMonth) / 30))
}

export function dailyNeed(bill: Bill, today: string, workDaysPerMonth: number): number {
  const open = openAmount(bill)
  if (open <= 0) return 0
  const left = daysBetween(today, bill.dueDate)
  if (left <= 0) return open
  return Math.ceil(open / workDaysIn(left + 1, workDaysPerMonth))
}

export function billsDueWithin(bills: Bill[], today: string, horizon: number): number {
  return bills.reduce((sum, bill) => {
    if (daysBetween(today, bill.dueDate) > horizon) return sum
    return sum + openAmount(bill)
  }, 0)
}

export type FreeCashLimit = 'none' | 'bills' | 'emergency'

export interface FreeCashResult {
  amount: number
  billsReserved: number
  emergencyReserved: number
  limitedBy: FreeCashLimit
}

export function freeCash(
  balance: number,
  bills: Bill[],
  emergencyMonthly: number,
  today: string,
): FreeCashResult {
  const billsReserved = billsDueWithin(bills, today, 30)
  const raw = balance - billsReserved - emergencyMonthly
  let limitedBy: FreeCashLimit = 'none'
  if (raw < 0) {
    limitedBy = balance - billsReserved <= 0 ? 'bills' : 'emergency'
  }
  return {
    amount: Math.max(0, raw),
    billsReserved,
    emergencyReserved: emergencyMonthly,
    limitedBy,
  }
}

export function runwayDays(balance: number, bills: Bill[], livingPerDay: number): number {
  const totalOpen = bills.reduce((sum, bill) => sum + openAmount(bill), 0)
  const dailySpend = livingPerDay + totalOpen / 30
  if (dailySpend <= 0) return 999
  return Math.max(0, Math.floor(balance / dailySpend))
}