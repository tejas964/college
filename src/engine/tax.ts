import taxConfig from '../config/tax/IN_2025-26.json'

export type Regime = 'new' | 'old'

export interface Slab {
  upTo: number | null
  rate: number
}

export interface Rebate {
  incomeLimit: number
  maxRebate: number
}

interface RegimeConfig {
  slabs: Slab[]
  rebate87A: Rebate
}

interface TaxConfig {
  ruleVersion: string
  status: string
  sourceUrl: string
  cessRate: number
  regimes: Record<Regime, RegimeConfig>
  presumptive: {
    deemedRate: number
    turnoverLimitRupees: number
  }
}

export const TAX_CONFIG = taxConfig as TaxConfig

export interface TaxComputation {
  regime: Regime
  taxablePaise: number
  incomeRupees: number
  slabRupees: number
  rebateRupees: number
  slabPaise: number
  rebatePaise: number
  cessPaise: number
  totalPaise: number
}

export function slabTax(income: number, slabs: Slab[]): number {
  if (!Number.isFinite(income) || income <= 0) return 0
  let previous = 0
  let tax = 0
  for (const slab of slabs) {
    if (income <= previous) break
    const upper = slab.upTo ?? Infinity
    const taxable = Math.min(income, upper) - previous
    tax += Math.max(0, taxable) * slab.rate
    previous = upper
    if (slab.upTo === null) break
  }
  return tax
}

export function computeTax(taxablePaise: number, regime: Regime): TaxComputation {
  const config = TAX_CONFIG.regimes[regime]
  const incomeRupees = taxablePaise / 100
  const slabRupees = slabTax(incomeRupees, config.slabs)
  const rebateRupees =
    incomeRupees <= config.rebate87A.incomeLimit
      ? Math.min(slabRupees, config.rebate87A.maxRebate)
      : 0
  const slabPaise = Math.round(slabRupees * 100)
  const rebatePaise = Math.round(rebateRupees * 100)
  const cessPaise = Math.round((slabPaise - rebatePaise) * TAX_CONFIG.cessRate)
  return {
    regime,
    taxablePaise,
    incomeRupees,
    slabRupees,
    rebateRupees,
    slabPaise,
    rebatePaise,
    cessPaise,
    totalPaise: slabPaise - rebatePaise + cessPaise,
  }
}

export interface BestRegime {
  recommended: Regime
  totalPaise: number
  new: TaxComputation
  old: TaxComputation
}

export function bestRegime(taxablePaise: number): BestRegime {
  const next = computeTax(taxablePaise, 'new')
  const old = computeTax(taxablePaise, 'old')
  const recommended: Regime = next.totalPaise <= old.totalPaise ? 'new' : 'old'
  return {
    recommended,
    totalPaise: recommended === 'new' ? next.totalPaise : old.totalPaise,
    new: next,
    old,
  }
}

export interface PresumptiveResult {
  eligible: boolean
  grossPaise: number
  deemedPaise: number
  totalPaise: number
  best: BestRegime
}

export function presumptiveTax(
  grossAnnualPaise: number,
  digitalReceiptsOk: boolean,
): PresumptiveResult {
  const limitPaise = TAX_CONFIG.presumptive.turnoverLimitRupees * 100
  const eligible = digitalReceiptsOk && grossAnnualPaise <= limitPaise
  const deemedPaise = Math.round(grossAnnualPaise * TAX_CONFIG.presumptive.deemedRate)
  const best = bestRegime(deemedPaise)
  return {
    eligible,
    grossPaise: grossAnnualPaise,
    deemedPaise,
    totalPaise: best.totalPaise,
    best,
  }
}

export interface TdsResult {
  stillToSet: number
  refund: number
}

export function taxFromTds(totalPaise: number, tdsPaise: number): TdsResult {
  const total = Number.isFinite(totalPaise) ? totalPaise : 0
  const tds = Number.isFinite(tdsPaise) ? tdsPaise : 0
  return {
    stillToSet: Math.max(0, total - tds),
    refund: Math.max(0, tds - total),
  }
}

export function estimateAnnualNet(
  net: number,
  workedDays: number,
  workDaysPerYear: number,
): number {
  if (
    !Number.isFinite(net) ||
    !Number.isFinite(workedDays) ||
    !Number.isFinite(workDaysPerYear) ||
    workedDays <= 0
  ) {
    return 0
  }
  return Math.round((net * workDaysPerYear) / workedDays)
}

export const TAX_KNOWN_GAPS = [
  'Tax rates are unverified and must be checked against incometax.gov.in and the current Finance Act.',
  'The tax model is simplified: no marginal relief, surcharge, deductions, advance-tax interest, or full presumptive eligibility rules.',
]