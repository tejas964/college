export interface LoanSummary {
  monthlyRate: number
  annualEffective: number
  nominalAnnual: number
  totalRepayable: number
  interestCost: number
}

export function presentValue(emi: number, n: number, r: number): number {
  if (!Number.isFinite(emi) || !Number.isFinite(n) || !Number.isFinite(r)) return NaN
  if (n <= 0) return 0
  if (r === 0) return emi * n
  if (r <= -1) return NaN
  let total = 0
  for (let k = 1; k <= n; k += 1) {
    total += emi / (1 + r) ** k
  }
  return total
}

export function monthlyRate(
  principal: number,
  emi: number,
  tenor: number,
  fees: number,
): number {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(emi) ||
    !Number.isFinite(tenor) ||
    !Number.isFinite(fees)
  ) {
    return NaN
  }
  if (principal <= 0 || emi <= 0 || fees < 0) return NaN
  if (!Number.isInteger(tenor) || tenor <= 0) return NaN
  const netAmount = principal - fees
  if (netAmount <= 0) return NaN
  if (emi * tenor < netAmount) return NaN

  let lo = 0
  let hi = 0.5
  const pvLow = presentValue(emi, tenor, lo)
  const pvHigh = presentValue(emi, tenor, hi)
  if (pvLow < netAmount) return NaN
  if (pvHigh > netAmount) return NaN

  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2
    const pv = presentValue(emi, tenor, mid)
    if (pv > netAmount) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function loanSummary(
  principal: number,
  emi: number,
  tenor: number,
  fees: number,
): LoanSummary {
  const r = monthlyRate(principal, emi, tenor, fees)
  const totalRepayable = emi * tenor
  if (Number.isNaN(r)) {
    return {
      monthlyRate: NaN,
      annualEffective: NaN,
      nominalAnnual: NaN,
      totalRepayable,
      interestCost: totalRepayable - principal,
    }
  }
  return {
    monthlyRate: r,
    annualEffective: (1 + r) ** 12 - 1,
    nominalAnnual: r * 12,
    totalRepayable,
    interestCost: totalRepayable - principal,
  }
}

export type EmisBand = 'green' | 'amber' | 'red'

export function monthlyIncomeFromWeek(weekNet: number, days = 7, monthDays = 30): number {
  if (days <= 0) return 0
  return Math.round((weekNet / days) * monthDays)
}

export function emiLoad(emi: number, otherEmis: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0
  return (emi + otherEmis) / monthlyIncome
}

export function emiLoadBand(load: number): EmisBand {
  if (!Number.isFinite(load) || load < 0) return 'red'
  if (load < 0.3) return 'green'
  if (load <= 0.45) return 'amber'
  return 'red'
}