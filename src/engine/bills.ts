export interface Bill {
  id: string
  name: string
  amount: number
  saved: number
  dueDate: string
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

export function addDays(iso: string, n: number): string {
  const dn = dayNumber(iso) + n
  const d = new Date(dn * 86400000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

export function openAmount(b: Bill): number {
  return Math.max(0, b.amount - b.saved)
}

export function workDaysIn(calendarDays: number, workDaysPerMonth: number): number {
  return Math.max(1, Math.round((calendarDays * workDaysPerMonth) / 30))
}

export function dailyNeed(b: Bill, today: string, wdpm: number): number {
  const open = openAmount(b)
  if (open === 0) return 0
  const daysLeft = daysBetween(today, b.dueDate)
  const calDays = daysLeft <= 0 ? 1 : daysLeft
  const wd = workDaysIn(calDays, wdpm)
  return Math.ceil(open / wd)
}

export function billsDueWithin(bills: Bill[], today: string, horizon: number): number {
  return bills.reduce((sum, b) => {
    const d = daysBetween(today, b.dueDate)
    if (d <= horizon) {
      return sum + openAmount(b)
    }
    return sum
  }, 0)
}

export interface FreeCashResult {
  amount: number
  billsReserved: number
  emergencyReserved: number
  limitedBy: 'none' | 'bills' | 'emergency'
}

export function freeCash(
  balance: number,
  bills: Bill[],
  emergencyMonthly: number,
  today: string
): FreeCashResult {
  const billsReserved = billsDueWithin(bills, today, 30)
  const emergencyReserved = emergencyMonthly
  const amount = Math.max(0, balance - billsReserved - emergencyReserved)
  let limitedBy: 'none' | 'bills' | 'emergency' = 'none'
  if (amount < balance) {
    if (billsReserved >= emergencyReserved && billsReserved > 0) {
      limitedBy = 'bills'
    } else if (emergencyReserved > 0) {
      limitedBy = 'emergency'
    }
  }
  return { amount, billsReserved, emergencyReserved, limitedBy }
}

export function runwayDays(balance: number, bills: Bill[], livingPerDay: number): number {
  const totalOpen = bills.reduce((s, b) => s + openAmount(b), 0)
  const dailySpend = livingPerDay + totalOpen / 30
  if (dailySpend <= 0) return 999
  return Math.floor(balance / dailySpend)
}
