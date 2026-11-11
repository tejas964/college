export function presentValue(emi: number, n: number, r: number): number {
  if (r === 0) return emi * n
  let sum = 0
  for (let k = 1; k <= n; k++) {
    sum += emi / Math.pow(1 + r, k)
  }
  return sum
}

export function monthlyRate(
  principal: number,
  emi: number,
  tenor: number,
  fees: number
): number {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(emi) ||
    !Number.isFinite(tenor) ||
    !Number.isFinite(fees) ||
    principal <= 0 ||
    emi <= 0 ||
    tenor <= 0 ||
    fees < 0
  ) {
    return NaN
  }
  const net = principal - fees
  if (net <= 0) return NaN
  if (emi * tenor < net) return NaN
  if (emi * tenor === net) return 0

  let lo = 0
  let hi = 0.5
  // ensure hi gives pv <= net
  for (let i = 0; i < 20 && presentValue(emi, tenor, hi) > net; i++) {
    hi *= 2
  }
  if (presentValue(emi, tenor, hi) > net) return NaN
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const pv = presentValue(emi, tenor, mid)
    if (pv > net) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

export interface LoanSummary {
  monthlyRate: number
  annualEffective: number
  nominalAnnual: number
  totalRepayable: number
  interestCost: number
}

export function loanSummary(
  principal: number,
  emi: number,
  tenor: number,
  fees: number
): LoanSummary {
  const r = monthlyRate(principal, emi, tenor, fees)
  const totalRepayable = emi * tenor
  const interestCost = totalRepayable - principal
  if (!Number.isFinite(r)) {
    return {
      monthlyRate: NaN,
      annualEffective: NaN,
      nominalAnnual: NaN,
      totalRepayable,
      interestCost,
    }
  }
  return {
    monthlyRate: r,
    annualEffective: Math.pow(1 + r, 12) - 1,
    nominalAnnual: 12 * r,
    totalRepayable,
    interestCost,
  }
}

export type EmiLoadBand = 'green' | 'amber' | 'red'

export function emiLoadBand(load: number): EmiLoadBand {
  if (load < 0.3) return 'green'
  if (load <= 0.45) return 'amber'
  return 'red'
}
