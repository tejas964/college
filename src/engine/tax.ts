import taxConfig from '../config/tax/IN_2025-26.json'

type Slab = { upTo: number | null; rate: number }
type RegimeKey = 'new' | 'old'

interface TaxConfig {
  ruleVersion: string
  status: string
  sourceUrl: string
  cessRate: number
  regimes: Record<RegimeKey, { slabs: Slab[]; rebate87A: { incomeLimit: number; maxRebate: number } }>
  presumptive: { deemedRate: number; turnoverLimitRupees: number }
}

const config = taxConfig as TaxConfig

export function getTaxConfig() {
  return config
}

export function slabTax(incomeRupees: number, slabs: Slab[]): number {
  let tax = 0
  let prev = 0
  for (const slab of slabs) {
    const limit = slab.upTo
    if (limit === null) {
      if (incomeRupees > prev) {
        tax += (incomeRupees - prev) * slab.rate
      }
      break
    }
    if (incomeRupees <= prev) break
    const taxableInSlab = Math.min(incomeRupees, limit) - prev
    if (taxableInSlab > 0) tax += taxableInSlab * slab.rate
    prev = limit
  }
  return Math.round(tax)
}

export interface RegimeTaxResult {
  regime: RegimeKey
  slabTax: number
  rebate: number
  cess: number
  totalPaise: number
  taxableRupees: number
}

export function computeTax(taxablePaise: number, regime: RegimeKey): RegimeTaxResult {
  const taxableRupees = Math.max(0, Math.round(taxablePaise / 100))
  const r = config.regimes[regime]
  const slab = slabTax(taxableRupees, r.slabs)
  let rebate = 0
  if (taxableRupees <= r.rebate87A.incomeLimit) {
    rebate = Math.min(slab, r.rebate87A.maxRebate)
  }
  const afterRebate = slab - rebate
  const cess = Math.round(afterRebate * config.cessRate)
  const totalPaise = (afterRebate + cess) * 100
  return { regime, slabTax: slab, rebate, cess, totalPaise, taxableRupees }
}

export interface BestRegimeResult {
  new: RegimeTaxResult
  old: RegimeTaxResult
  recommended: RegimeKey
}

export function bestRegime(taxablePaise: number): BestRegimeResult {
  const n = computeTax(taxablePaise, 'new')
  const o = computeTax(taxablePaise, 'old')
  const recommended: RegimeKey = n.totalPaise <= o.totalPaise ? 'new' : 'old'
  return { new: n, old: o, recommended }
}

export interface PresumptiveResult {
  eligible: boolean
  deemedIncomePaise: number
  totalPaise: number
  regime?: RegimeKey
}

export function presumptiveTax(grossAnnualPaise: number, digitalReceiptsOk: boolean): PresumptiveResult {
  const grossRupees = Math.max(0, Math.round(grossAnnualPaise / 100))
  const eligible =
    digitalReceiptsOk && grossRupees > 0 && grossRupees <= config.presumptive.turnoverLimitRupees
  if (!eligible) {
    return { eligible: false, deemedIncomePaise: 0, totalPaise: 0 }
  }
  const deemedRupees = Math.round(grossRupees * config.presumptive.deemedRate)
  const deemedIncomePaise = deemedRupees * 100
  const best = bestRegime(deemedIncomePaise)
  return {
    eligible: true,
    deemedIncomePaise,
    totalPaise: best[best.recommended].totalPaise,
    regime: best.recommended,
  }
}

export function taxFromTds(total: number, tds: number): { stillToSet: number; refund: number } {
  return {
    stillToSet: Math.max(0, total - tds),
    refund: Math.max(0, tds - total),
  }
}

export function estimateAnnualNet(net: number, workedDays: number, workDaysPerYear: number): number {
  if (workedDays <= 0) return 0
  return Math.round((net * workDaysPerYear) / workedDays)
}
